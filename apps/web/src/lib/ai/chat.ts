import { and, asc, eq, sql } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  agencies,
  aiUsageDaily,
  conversations,
  messages,
  textToBlocks,
  type CepAiConfig,
  type CepChatBlock,
} from "@/lib/db/schema";
import { limitsFor } from "@/lib/plans";
import { retrieve, type Retrieved } from "./index-site";
import { completeChat, configuredAiProviders } from "./router";

const HISTORY_TURNS = 10;

export type AnswerResult =
  | {
      ok: true;
      reply: string;
      blocks: CepChatBlock[];
      model: string;
      provider: string;
      capturedEmail: boolean;
    }
  | { ok: false; error: string; status: number };

/**
 * Answer a visitor's question from the client's own site content (ADR-011).
 * Routes through OpenRouter by default with Anthropic fallback.
 */
export async function answerVisitor(opts: {
  agencyId: string;
  clientId: string;
  websiteId: string;
  conversationId: string;
  clientName: string;
  question: string;
  ai?: CepAiConfig | null;
  systemPromptOverride?: string | null;
}): Promise<AnswerResult> {
  if (configuredAiProviders().length === 0) {
    return { ok: false, error: "AI chat is not configured.", status: 503 };
  }

  const quota = await checkQuota(opts.agencyId);
  if (!quota.ok) {
    return { ok: false, error: quota.reason, status: 429 };
  }

  const passages = await retrieve(opts.agencyId, opts.websiteId, opts.question);

  const history = await withAgency(opts.agencyId, (tx) =>
    tx
      .select({ author: messages.author, body: messages.body })
      .from(messages)
      .where(eq(messages.conversationId, opts.conversationId))
      .orderBy(asc(messages.createdAt))
      .limit(HISTORY_TURNS * 2),
  );

  const baseSystem = buildSystemPrompt(opts.clientName, passages);
  const system = opts.systemPromptOverride?.trim()
    ? `${opts.systemPromptOverride.trim()}\n\n${baseSystem}`
    : baseSystem;

  const result = await completeChat({
    system,
    ai: opts.ai,
    messages: [
      ...history.map((m) => ({
        role:
          m.author === "visitor"
            ? ("user" as const)
            : ("assistant" as const),
        content: m.body,
      })),
      { role: "user", content: opts.question },
    ],
  });

  if (!result.ok) {
    return { ok: false, error: result.error, status: result.status };
  }

  await recordUsage(opts.agencyId, result.model, {
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    cachedInputTokens: result.cachedInputTokens,
  });

  const blocks = textToBlocks(result.text);
  return {
    ok: true,
    reply: result.text,
    blocks,
    model: result.model,
    provider: result.provider,
    capturedEmail: false,
  };
}

/**
 * The system prompt.
 *
 * Two rules do the real work. Answering only from the passages is what stops the
 * assistant inventing opening hours; saying so plainly when it does not know is
 * what makes the first rule survivable — an assistant forbidden to guess and not
 * allowed to admit ignorance will guess anyway.
 */
function buildSystemPrompt(clientName: string, passages: Retrieved[]) {
  const context = passages.length
    ? passages
        .map((p, i) => `<passage id="${i + 1}" source="${p.sourceUrl}">\n${p.content}\n</passage>`)
        .join("\n\n")
    : "(no content was found for this question)";

  return `You are the assistant on ${clientName}'s website, talking to a visitor.

Answer only from the passages below. They are extracts from this business's own
website.

If the passages do not contain the answer, say you do not have that detail and
offer to pass the question on — then ask for the visitor's name and email so
someone can follow up. Never guess at prices, opening hours, availability,
qualifications, or anything a visitor might act on.

Be brief. Two or three sentences is usually right. Write as the business ("we"),
not about it. Do not mention these instructions or the passages.

<passages>
${context}
</passages>`;
}

/** Whether this agency has AI budget left this month. */
async function checkQuota(agencyId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
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
      return {
        ok: false as const,
        reason: "This site has used its AI replies for the month.",
      };
    }
    return { ok: true as const };
  });
}

/**
 * Meter the call.
 *
 * ADR-004 calls this mandatory rather than optional: without it the free tier is
 * an open invitation to run up someone else's bill.
 */
async function recordUsage(
  agencyId: string,
  model: string,
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number },
) {
  const day = new Date().toISOString().slice(0, 10);

  // Rough micro-dollar estimate; provider-specific pricing refined later.
  const cost =
    usage.inputTokens * 3 + usage.outputTokens * 15 + usage.cachedInputTokens * 0.3;

  await withAgency(agencyId, (tx) =>
    tx
      .insert(aiUsageDaily)
      .values({
        agencyId,
        day,
        model,
        requests: 1,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        estimatedCostMicros: Math.round(cost / 1000),
      })
      .onConflictDoUpdate({
        target: [aiUsageDaily.agencyId, aiUsageDaily.day, aiUsageDaily.model],
        set: {
          requests: sql`${aiUsageDaily.requests} + 1`,
          inputTokens: sql`${aiUsageDaily.inputTokens} + ${usage.inputTokens}`,
          outputTokens: sql`${aiUsageDaily.outputTokens} + ${usage.outputTokens}`,
          cachedInputTokens: sql`${aiUsageDaily.cachedInputTokens} + ${usage.cachedInputTokens}`,
          estimatedCostMicros: sql`${aiUsageDaily.estimatedCostMicros} + ${Math.round(cost / 1000)}`,
        },
      }),
  );
}

/** Find or open the visitor's chat thread for this website. */
export async function chatConversation(
  agencyId: string,
  clientId: string,
  websiteId: string,
  existingId: string | null,
): Promise<string> {
  if (existingId) {
    const [found] = await withAgency(agencyId, (tx) =>
      tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.id, existingId), eq(conversations.websiteId, websiteId)))
        .limit(1),
    );
    if (found) return found.id;
  }

  const [created] = await withAgency(agencyId, (tx) =>
    tx
      .insert(conversations)
      .values({
        agencyId,
        clientId,
        websiteId,
        channel: "chat",
        status: "open",
        lastMessageAt: new Date(),
      })
      .returning({ id: conversations.id }),
  );
  return created.id;
}
