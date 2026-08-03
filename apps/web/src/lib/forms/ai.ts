import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  agencies,
  aiUsageDaily,
  formSubmissions,
  type FormAiConfig,
  type FormLeadPriority,
  type FormSubmissionAi,
  type FormSubmissionCrm,
} from "@/lib/db/schema";
import { limitsFor } from "@/lib/plans";
import { resolveAiApiKey } from "@/lib/platform/ai-keys";
import { appendTimeline, normalizeSubmissionCrm } from "@/lib/forms/admin-crm";
import { normalizeAi } from "./ai-config";

export { DEFAULT_AI, normalizeAi, publicAiForEmbed } from "./ai-config";

const MODEL = "claude-sonnet-5";

async function anthropic(): Promise<Anthropic | null> {
  const key = await resolveAiApiKey("anthropic");
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

export type AnalyzeLeadInput = {
  agencyId: string;
  formId: string;
  formName: string;
  values: Record<string, unknown>;
  contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    message?: string | null;
  };
  submissionId?: string;
};

export type AnalyzeLeadResult = {
  ai: FormSubmissionAi;
  values: Record<string, unknown>;
  crmPatch?: Partial<FormSubmissionCrm>;
};

/** Heuristic + optional Claude analysis for a new lead. */
export async function analyzeFormLead(
  config: FormAiConfig | null | undefined,
  input: AnalyzeLeadInput,
): Promise<AnalyzeLeadResult> {
  const aiCfg = normalizeAi(config);
  if (aiCfg.enabled === false) {
    return { ai: {}, values: input.values };
  }

  const message = pickMessage(input);
  const email = input.contact?.email?.trim().toLowerCase() || pickEmail(input.values);
  let ai: FormSubmissionAi = heuristicScore(input, message, aiCfg);

  if (aiCfg.duplicateDetection && email) {
    const dup = await findDuplicate(input.agencyId, input.formId, email, input.submissionId);
    if (dup) {
      ai.duplicate = true;
      ai.duplicateOf = dup;
      ai.score = Math.min(ai.score ?? 50, 35);
    }
  }

  if (aiCfg.useLlm !== false) {
    const llm = await runLlmAnalysis(aiCfg, input, message, ai);
    if (llm) ai = { ...ai, ...llm };
  }

  let values = { ...input.values };
  if (aiCfg.rewriteMessage && ai.rewrittenMessage) {
    const key = messageKey(input.values) ?? "message";
    values = { ...values, [key]: ai.rewrittenMessage };
  }

  const crmPatch = aiCfg.applyToCrm !== false ? crmFromAi(ai) : undefined;
  return { ai, values, crmPatch };
}

function pickMessage(input: AnalyzeLeadInput): string {
  if (input.contact?.message?.trim()) return input.contact.message.trim();
  for (const k of ["message", "Message", "details", "notes", "description"]) {
    const v = input.values[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return Object.values(input.values)
    .filter((v) => typeof v === "string" && String(v).length > 40)
    .map(String)
    .join("\n")
    .slice(0, 4000);
}

function pickEmail(values: Record<string, unknown>): string | null {
  const v = values.email ?? values.Email;
  return typeof v === "string" && v.includes("@") ? v.trim().toLowerCase() : null;
}

function messageKey(values: Record<string, unknown>): string | null {
  for (const k of ["message", "Message", "details", "notes", "description"]) {
    if (k in values) return k;
  }
  return null;
}

function heuristicScore(
  input: AnalyzeLeadInput,
  message: string,
  cfg: FormAiConfig,
): FormSubmissionAi {
  let score = 40;
  const lower = message.toLowerCase();
  const spamHits = [
    "crypto",
    "seo package",
    "guest post",
    "backlink",
    "viagra",
    "casino",
    "forex",
    "click here",
  ].filter((w) => lower.includes(w));

  if (message.length > 80) score += 10;
  if (message.length > 200) score += 8;
  if (input.contact?.phone || input.values.phone) score += 8;
  if (input.contact?.email || input.values.email) score += 6;
  if (input.values.budget || input.values.company) score += 10;
  if (/\b(urgent|asap|quote|proposal|hire|budget)\b/i.test(message)) score += 12;
  if (spamHits.length) score -= 25 * spamHits.length;

  score = Math.max(0, Math.min(100, score));

  const out: FormSubmissionAi = {};
  if (cfg.leadScoring !== false) out.score = score;
  if (cfg.spamDetection !== false) {
    out.spam = spamHits.length > 0 || score < 15;
    if (out.spam) out.spamReason = spamHits.length ? `Matched: ${spamHits.join(", ")}` : "Very low quality signal";
  }
  if (cfg.categoryDetection !== false) {
    out.category = guessCategory(message, cfg.categories ?? []);
  }
  if (cfg.suggestedFollowUp !== false && !out.spam) {
    out.followUp = `Thanks for reaching out about ${out.category || "your project"}. Could you share timeline and budget so we can prepare a clear next step?`;
  }
  out.model = "heuristic";
  return out;
}

function guessCategory(message: string, categories: string[]): string {
  const lower = message.toLowerCase();
  for (const c of categories) {
    if (c === "other") continue;
    if (lower.includes(c.toLowerCase())) return c;
  }
  if (/\b(website|web design|redesign)\b/i.test(message)) return "web design";
  if (/\b(develop|app|api|wordpress)\b/i.test(message)) return "development";
  if (/\b(seo|search)\b/i.test(message)) return "seo";
  if (/\b(ads|ppc|google ads|meta ads)\b/i.test(message)) return "ads";
  if (/\b(brand|logo|identity)\b/i.test(message)) return "branding";
  return categories.includes("other") ? "other" : categories[0] || "other";
}

async function findDuplicate(
  agencyId: string,
  formId: string,
  email: string,
  excludeId?: string,
): Promise<string | undefined> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await withAgency(agencyId, (tx) =>
    tx
      .select({
        id: formSubmissions.id,
        values: formSubmissions.values,
      })
      .from(formSubmissions)
      .where(
        and(
          eq(formSubmissions.formId, formId),
          gte(formSubmissions.createdAt, since),
          excludeId ? ne(formSubmissions.id, excludeId) : undefined,
        ),
      )
      .orderBy(desc(formSubmissions.createdAt))
      .limit(40),
  );

  for (const r of rows) {
    const v = r.values as Record<string, unknown>;
    const e = typeof v.email === "string" ? v.email.trim().toLowerCase() : "";
    if (e && e === email) return r.id;
  }
  return undefined;
}

async function runLlmAnalysis(
  cfg: FormAiConfig,
  input: AnalyzeLeadInput,
  message: string,
  base: FormSubmissionAi,
): Promise<FormSubmissionAi | null> {
  const claude = await anthropic();
  if (!claude) return null;

  const quota = await checkQuota(input.agencyId);
  if (!quota.ok) return null;

  const cats = (cfg.categories ?? []).join(", ");
  const prompt = `Analyze this agency lead form submission. Return ONLY compact JSON with keys:
score (0-100), spam (boolean), spamReason (string|null), category (one of: ${cats}), followUp (short suggested reply), rewrittenMessage (cleaner version of the visitor message, same language/intent).

Form: ${input.formName}
Name: ${input.contact?.name ?? ""}
Email: ${input.contact?.email ?? ""}
Phone: ${input.contact?.phone ?? ""}
Values: ${JSON.stringify(input.values).slice(0, 3000)}
Message:
${message.slice(0, 3000)}`;

  try {
    const response = await claude.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    await recordUsage(input.agencyId, {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const json = extractJson(text);
    if (!json) return { ...base, model: MODEL };

    const out: FormSubmissionAi = { ...base, model: MODEL };
    if (cfg.leadScoring !== false && typeof json.score === "number") {
      out.score = Math.max(0, Math.min(100, Math.round(json.score)));
    }
    if (cfg.spamDetection !== false && typeof json.spam === "boolean") {
      out.spam = json.spam;
      if (typeof json.spamReason === "string") out.spamReason = json.spamReason.slice(0, 240);
    }
    if (cfg.categoryDetection !== false && typeof json.category === "string") {
      out.category = json.category.trim().slice(0, 60);
    }
    if (cfg.suggestedFollowUp !== false && typeof json.followUp === "string") {
      out.followUp = json.followUp.trim().slice(0, 800);
    }
    if (
      (cfg.rewriteMessage || cfg.autofill) &&
      typeof json.rewrittenMessage === "string" &&
      json.rewrittenMessage.trim()
    ) {
      out.rewrittenMessage = json.rewrittenMessage.trim().slice(0, 5000);
    }
    return out;
  } catch (err) {
    console.error("form AI analysis failed", err);
    return null;
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function crmFromAi(ai: FormSubmissionAi): Partial<FormSubmissionCrm> {
  const tags: string[] = [];
  if (ai.category) tags.push(ai.category);
  if (ai.spam) tags.push("spam");
  if (ai.duplicate) tags.push("duplicate");
  if ((ai.score ?? 0) >= 75) tags.push("hot");

  let priority: FormLeadPriority | undefined;
  const score = ai.score ?? 50;
  if (ai.spam) priority = "low";
  else if (score >= 80) priority = "urgent";
  else if (score >= 65) priority = "high";
  else if (score >= 40) priority = "normal";
  else priority = "low";

  const notes = [
    ai.score != null ? `AI score: ${ai.score}` : null,
    ai.category ? `Category: ${ai.category}` : null,
    ai.spam ? `Spam: ${ai.spamReason || "flagged"}` : null,
    ai.duplicate ? "Possible duplicate lead" : null,
    ai.followUp ? `Suggested follow-up:\n${ai.followUp}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    ...(priority ? { priority } : {}),
    ...(tags.length ? { tags } : {}),
    ...(notes ? { notes } : {}),
  };
}

/** Merge AI CRM suggestions into submission CRM state. */
export function applyAiCrmPatch(
  crm: FormSubmissionCrm,
  patch?: Partial<FormSubmissionCrm>,
): FormSubmissionCrm {
  if (!patch) return crm;
  let next = { ...crm };
  if (patch.priority && patch.priority !== crm.priority) {
    next = appendTimeline(
      { ...next, priority: patch.priority },
      { type: "priority", message: `AI set priority → ${patch.priority}`, actor: "AI" },
    );
  }
  if (patch.tags?.length) {
    const merged = [...new Set([...(next.tags ?? []), ...patch.tags])].slice(0, 20);
    next = appendTimeline(
      { ...next, tags: merged },
      { type: "tag", message: `AI tags +${patch.tags.join(", ")}`, actor: "AI" },
    );
  }
  if (patch.notes) {
    next = appendTimeline(
      {
        ...next,
        notes: next.notes ? `${patch.notes}\n\n${next.notes}`.slice(0, 8000) : patch.notes,
      },
      { type: "note", message: "AI analysis added", actor: "AI" },
    );
  }
  return normalizeSubmissionCrm(next);
}

/** Rewrite / autofill helper for the live embed. */
export async function rewriteFormMessage(opts: {
  agencyId: string;
  formName: string;
  message: string;
  intent?: string;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const text = opts.message.trim();
  if (!text) return { ok: false, error: "Nothing to rewrite." };

  const claude = await anthropic();
  if (!claude) {
    // Lightweight local polish when LLM is unavailable.
    const polished = text.replace(/\s+/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
    return { ok: true, text: polished };
  }

  const quota = await checkQuota(opts.agencyId);
  if (!quota.ok) return { ok: false, error: quota.reason };

  try {
    const response = await claude.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Rewrite this form message to be clearer and more professional while keeping the same meaning and language. Return only the rewritten message.\n\nForm: ${opts.formName}\nIntent: ${opts.intent || "general enquiry"}\n\nMessage:\n${text.slice(0, 3000)}`,
        },
      ],
    });
    await recordUsage(opts.agencyId, {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });
    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!reply) return { ok: false, error: "No rewrite returned." };
    return { ok: true, text: reply.slice(0, 5000) };
  } catch (err) {
    console.error("rewriteFormMessage failed", err);
    return { ok: false, error: "Rewrite unavailable right now." };
  }
}

async function checkQuota(
  agencyId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  return withAgency(agencyId, async (tx) => {
    const [[agency], [used]] = await Promise.all([
      tx.select({ plan: agencies.plan }).from(agencies).where(eq(agencies.id, agencyId)).limit(1),
      tx
        .select({ n: sql<number>`coalesce(sum(${aiUsageDaily.requests}), 0)`.mapWith(Number) })
        .from(aiUsageDaily)
        .where(sql`${aiUsageDaily.day} >= ${monthStart.toISOString().slice(0, 10)}`),
    ]);
    if (!agency) return { ok: false as const, reason: "Unknown agency." };
    const limit = limitsFor(agency.plan).maxAiMessagesPerMonth;
    if (used.n >= limit) {
      return { ok: false as const, reason: "AI quota used for this month." };
    }
    return { ok: true as const };
  });
}

async function recordUsage(
  agencyId: string,
  usage: { inputTokens: number; outputTokens: number },
) {
  const day = new Date().toISOString().slice(0, 10);
  const cost = usage.inputTokens * 3 + usage.outputTokens * 15;
  await withAgency(agencyId, (tx) =>
    tx
      .insert(aiUsageDaily)
      .values({
        agencyId,
        day,
        model: MODEL,
        requests: 1,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: 0,
        estimatedCostMicros: Math.round(cost / 1000),
      })
      .onConflictDoUpdate({
        target: [aiUsageDaily.agencyId, aiUsageDaily.day, aiUsageDaily.model],
        set: {
          requests: sql`${aiUsageDaily.requests} + 1`,
          inputTokens: sql`${aiUsageDaily.inputTokens} + ${usage.inputTokens}`,
          outputTokens: sql`${aiUsageDaily.outputTokens} + ${usage.outputTokens}`,
          estimatedCostMicros: sql`${aiUsageDaily.estimatedCostMicros} + ${Math.round(cost / 1000)}`,
        },
      }),
  );
}
