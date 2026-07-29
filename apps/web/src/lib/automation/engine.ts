/**
 * Automation engine — matches website Auto Rules to an event and runs actions.
 * Failures are logged; they never throw to the visitor/chat path.
 */

import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { withAgency } from "@/lib/db";
import { contacts, conversations, websites } from "@/lib/db/schema";
import type { FormSubmissionAi, FormSubmissionCrm } from "@/lib/db/schema";
import { mergeWebsiteEmailSettings } from "@/lib/website-email/types";
import {
  buildChannelMessage,
  sendSlackWebhook,
  sendTwilioSms,
} from "./channels";
import {
  decideLead,
  parseBudgetNumber,
  preferActionsForDecision,
  type LeadDecision,
} from "./decision";
import { automationAdminEmail, thankYouEmail } from "./emails";
import {
  newOpenToken,
  scheduleFollowUp,
} from "./followups";
import { trackingPixelUrl } from "./tracking-urls";
import { mergeTokens, type MergeContext } from "./interpolate";
import { appendVisitorTimeline } from "./timeline";
import {
  isSocialConnected,
  mergeAutomationSettings,
  type AutomationAction,
  type AutomationRule,
  type AutomationSettings,
  type AutomationTrigger,
  type SocialAccount,
} from "./types";

export type AutomationEvent = {
  trigger: AutomationTrigger;
  agencyId: string;
  clientId: string;
  websiteId: string;
  contactId?: string | null;
  conversationId?: string | null;
  formId?: string | null;
  formName?: string | null;
  websiteName?: string | null;
  pageUrl?: string | null;
  /** True when this event created a brand-new contact. */
  isNewContact?: boolean;
  contact: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    message?: string | null;
  };
  values?: Record<string, unknown>;
  ai?: FormSubmissionAi | null;
  crm?: FormSubmissionCrm | null;
};

export type ActionResult = {
  action: AutomationAction;
  ok: boolean;
  detail?: string;
};

export type RuleRunResult = {
  ruleId: string;
  ruleName: string;
  results: ActionResult[];
};

export type AutomationRunResult = {
  ran: boolean;
  rulesMatched: number;
  results: RuleRunResult[];
};

function mergeCtx(event: AutomationEvent): MergeContext {
  return {
    name: event.contact.name,
    email: event.contact.email,
    phone: event.contact.phone,
    message: event.contact.message,
    websiteName: event.websiteName,
    formName: event.formName,
    category: event.ai?.category ?? null,
    score: event.ai?.score ?? null,
    followUp: event.ai?.followUp ?? null,
    values: event.values ?? {},
  };
}

function ruleMatches(rule: AutomationRule, event: AutomationEvent): boolean {
  if (!rule.enabled) return false;
  if (rule.trigger === event.trigger) return true;
  // form_submit also fires new_lead rules when the contact is brand new
  if (
    event.trigger === "form_submit" &&
    rule.trigger === "new_lead" &&
    event.isNewContact
  ) {
    return true;
  }
  return false;
}

/** Prefer CRM + schedule before outbound email so tracking tokens exist. */
function orderActionsForExecution(
  actions: AutomationAction[],
): AutomationAction[] {
  const rank = (a: AutomationAction) => {
    if (a === "schedule_follow_up") return 0;
    if (a === "save_crm" || a === "score_lead" || a === "tag_contact") return 1;
    if (a === "assign_sales") return 2;
    if (a === "thank_you_email" || a === "notify_email" || a === "notify_whatsapp")
      return 3;
    return 4;
  };
  return [...actions].sort((a, b) => rank(a) - rank(b));
}

async function loadAutomation(
  agencyId: string,
  websiteId: string,
): Promise<{
  settings: AutomationSettings;
  websiteName: string;
  notifyFromEmail: string;
  replyTo: string;
} | null> {
  const [row] = await withAgency(agencyId, (tx) =>
    tx
      .select({
        name: websites.name,
        settings: websites.settings,
      })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1),
  );
  if (!row) return null;

  const automation = mergeAutomationSettings(row.settings?.automation);
  const email = mergeWebsiteEmailSettings(row.settings?.email);
  return {
    settings: automation,
    websiteName: row.name,
    notifyFromEmail: email.notifyEmail || email.fromEmail || "",
    replyTo: email.replyTo || email.fromEmail || email.notifyEmail || "",
  };
}

export async function runWebsiteAutomation(
  event: AutomationEvent,
): Promise<AutomationRunResult> {
  try {
    const loaded = await loadAutomation(event.agencyId, event.websiteId);
    if (!loaded || !loaded.settings.enabled) {
      return { ran: false, rulesMatched: 0, results: [] };
    }

    const websiteName = event.websiteName || loaded.websiteName;
    const enriched: AutomationEvent = { ...event, websiteName };
    const matched = loaded.settings.rules.filter((r) =>
      ruleMatches(r, enriched),
    );
    if (!matched.length) {
      return { ran: false, rulesMatched: 0, results: [] };
    }

    const results: RuleRunResult[] = [];
    for (const rule of matched) {
      const decision = decideLead({
        values: enriched.values,
        message: enriched.contact.message,
        formName: enriched.formName,
        aiScore: enriched.ai?.score,
        aiCategory: enriched.ai?.category,
        budgetThreshold: rule.budgetThreshold,
      });

      let actions = [...rule.actions];
      if (rule.aiDecide) {
        actions = preferActionsForDecision(decision, actions).filter(
          (a): a is AutomationAction =>
            rule.actions.includes(a as AutomationAction),
        );
        if (!actions.length) actions = [...rule.actions];
      }

      // Follow-up must run before thank-you so the open token exists in DB.
      actions = orderActionsForExecution(actions);

      const needsTrack = actions.includes("schedule_follow_up");
      const openToken = needsTrack ? newOpenToken() : "";

      if (enriched.contactId) {
        await appendVisitorTimeline({
          agencyId: enriched.agencyId,
          clientId: enriched.clientId,
          contactId: enriched.contactId,
          websiteId: enriched.websiteId,
          eventType: enriched.trigger,
          title: `Automation · ${rule.name}`,
          detail: rule.aiDecide
            ? `AI: ${decision.intent} / ${decision.urgency} / ${decision.interest}`
            : `Trigger: ${enriched.trigger}`,
          meta: { ruleId: rule.id, decision, actions },
        });
      }

      const actionResults: ActionResult[] = [];
      for (const action of actions) {
        try {
          const res = await executeAction({
            action,
            rule,
            event: enriched,
            settings: loaded.settings,
            replyTo: loaded.replyTo,
            fallbackNotify:
              loaded.notifyFromEmail || loaded.settings.defaultNotifyEmail,
            decision,
            openToken,
          });
          actionResults.push(res);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Action failed";
          console.error(`[automation] ${rule.id}/${action} failed`, err);
          actionResults.push({ action, ok: false, detail: message });
        }
      }
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        results: actionResults,
      });
    }

    return { ran: true, rulesMatched: matched.length, results };
  } catch (err) {
    console.error("[automation] engine failed", err);
    return { ran: false, rulesMatched: 0, results: [] };
  }
}

/** Fire-and-forget wrapper for request paths. */
export function enqueueWebsiteAutomation(event: AutomationEvent): void {
  void runWebsiteAutomation(event).then((res) => {
    if (res.ran) {
      console.info(
        `[automation] ${event.trigger} · website=${event.websiteId} · rules=${res.rulesMatched}`,
      );
    }
  });
}

async function executeAction(opts: {
  action: AutomationAction;
  rule: AutomationRule;
  event: AutomationEvent;
  settings: AutomationSettings;
  replyTo: string;
  fallbackNotify: string;
  decision: LeadDecision;
  openToken: string;
}): Promise<ActionResult> {
  const { action, rule, event, settings, decision, openToken } = opts;
  const ctx = mergeCtx(event);

  switch (action) {
    case "thank_you_email":
      return sendThankYou(rule, event, ctx, opts.replyTo, openToken);
    case "notify_email":
      return sendAdminNotify(rule, event, ctx, settings, opts.fallbackNotify);
    case "save_crm":
      return saveCrm(event, decision);
    case "score_lead":
      return scoreLead(event, decision);
    case "tag_contact":
      return tagContact(event, rule.tag);
    case "open_conversation":
      return openConversation(event);
    case "webhook":
      return callWebhook(rule, event, settings, decision);
    case "notify_whatsapp":
      return sendWhatsApp(rule, event, ctx, settings);
    case "schedule_follow_up":
      return runScheduleFollowUp(rule, event, ctx, opts.replyTo, openToken);
    case "assign_sales":
      return assignSales(rule, event, decision, settings, opts.fallbackNotify);
    case "notify_sms":
      return runSms(rule, event, ctx);
    case "notify_slack":
      return runSlack(rule, event, ctx, settings);
    case "post_social":
    case "reply_social":
      return {
        action,
        ok: false,
        detail: "Social post/reply delivery ships with the social worker.",
      };
    default:
      return { action, ok: false, detail: "Unknown action" };
  }
}

async function sendThankYou(
  rule: AutomationRule,
  event: AutomationEvent,
  ctx: MergeContext,
  replyTo: string,
  openToken: string,
): Promise<ActionResult> {
  const to = event.contact.email?.trim().toLowerCase();
  if (!to) {
    return { action: "thank_you_email", ok: false, detail: "No visitor email" };
  }
  await sendEmail(
    thankYouEmail({
      to,
      websiteName: event.websiteName || "Our team",
      replyTo: replyTo || undefined,
      template: rule.socialMessage,
      ctx,
      trackingPixelUrl: openToken ? trackingPixelUrl(openToken) : undefined,
      trackingToken: openToken || undefined,
    }),
  );
  if (event.contactId) {
    await appendVisitorTimeline({
      agencyId: event.agencyId,
      clientId: event.clientId,
      contactId: event.contactId,
      websiteId: event.websiteId,
      eventType: "email_sent",
      title: "Thank-you email sent",
      detail: to,
    });
  }
  return { action: "thank_you_email", ok: true, detail: `Sent to ${to}` };
}

async function sendAdminNotify(
  rule: AutomationRule,
  event: AutomationEvent,
  ctx: MergeContext,
  settings: AutomationSettings,
  fallbackNotify: string,
): Promise<ActionResult> {
  const to = (
    rule.notifyEmail ||
    settings.defaultNotifyEmail ||
    fallbackNotify
  )
    .trim()
    .toLowerCase();
  if (!to) {
    return {
      action: "notify_email",
      ok: false,
      detail: "No team notify email configured",
    };
  }
  await sendEmail(
    automationAdminEmail({
      to,
      websiteName: event.websiteName || "Website",
      replyTo: event.contact.email,
      ctx,
    }),
  );
  return { action: "notify_email", ok: true, detail: `Sent to ${to}` };
}

async function saveCrm(
  event: AutomationEvent,
  decision: LeadDecision,
): Promise<ActionResult> {
  if (!event.contactId) {
    return { action: "save_crm", ok: false, detail: "No contact id" };
  }
  await withAgency(event.agencyId, async (tx) => {
    const [row] = await tx
      .select({ fields: contacts.fields })
      .from(contacts)
      .where(eq(contacts.id, event.contactId!))
      .limit(1);
    const prev = (row?.fields ?? {}) as Record<string, unknown>;
    await tx
      .update(contacts)
      .set({
        name: event.contact.name ?? undefined,
        email: event.contact.email ?? undefined,
        phone: event.contact.phone ?? undefined,
        fields: {
          ...prev,
          ...(event.values ?? {}),
          intent: decision.intent,
          urgency: decision.urgency,
          interest: decision.interest,
        },
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, event.contactId!));
  });
  await appendVisitorTimeline({
    agencyId: event.agencyId,
    clientId: event.clientId,
    contactId: event.contactId,
    websiteId: event.websiteId,
    eventType: "crm_save",
    title: "Saved to CRM",
    detail: `${decision.intent} · ${decision.interest}`,
  });
  return { action: "save_crm", ok: true };
}

async function scoreLead(
  event: AutomationEvent,
  decision: LeadDecision,
): Promise<ActionResult> {
  if (!event.contactId) {
    return { action: "score_lead", ok: false, detail: "No contact id" };
  }
  const score = event.ai?.score;
  if (score == null) {
    return {
      action: "score_lead",
      ok: false,
      detail: "No AI score on this event",
    };
  }
  await withAgency(event.agencyId, async (tx) => {
    const [row] = await tx
      .select({ fields: contacts.fields })
      .from(contacts)
      .where(eq(contacts.id, event.contactId!))
      .limit(1);
    const prev = (row?.fields ?? {}) as Record<string, unknown>;
    await tx
      .update(contacts)
      .set({
        fields: {
          ...prev,
          aiScore: score,
          aiCategory: event.ai?.category ?? prev.aiCategory,
          aiSpam: event.ai?.spam ?? prev.aiSpam,
          intent: decision.intent,
          urgency: decision.urgency,
          interest: decision.interest,
        },
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, event.contactId!));
  });
  await appendVisitorTimeline({
    agencyId: event.agencyId,
    clientId: event.clientId,
    contactId: event.contactId,
    websiteId: event.websiteId,
    eventType: "score",
    title: `Lead score ${score}`,
    detail: `${decision.urgency} urgency · ${decision.interest}`,
  });
  return { action: "score_lead", ok: true, detail: `Score ${score}` };
}

async function tagContact(
  event: AutomationEvent,
  tag: string,
): Promise<ActionResult> {
  const clean = tag.trim().toLowerCase().replace(/\s+/g, "-");
  if (!clean) {
    return { action: "tag_contact", ok: false, detail: "Empty tag" };
  }
  if (!event.contactId) {
    return { action: "tag_contact", ok: false, detail: "No contact id" };
  }
  await withAgency(event.agencyId, async (tx) => {
    const [row] = await tx
      .select({ tags: contacts.tags })
      .from(contacts)
      .where(eq(contacts.id, event.contactId!))
      .limit(1);
    const prev = row?.tags ?? [];
    const next = prev.includes(clean) ? prev : [...prev, clean];
    await tx
      .update(contacts)
      .set({
        tags: next,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, event.contactId!));
  });
  return { action: "tag_contact", ok: true, detail: clean };
}

async function openConversation(
  event: AutomationEvent,
): Promise<ActionResult> {
  if (event.conversationId) {
    await withAgency(event.agencyId, async (tx) => {
      await tx
        .update(conversations)
        .set({
          status: "open",
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, event.conversationId!));
    });
    return {
      action: "open_conversation",
      ok: true,
      detail: event.conversationId,
    };
  }
  if (!event.contactId) {
    return {
      action: "open_conversation",
      ok: false,
      detail: "No conversation or contact",
    };
  }
  const [created] = await withAgency(event.agencyId, (tx) =>
    tx
      .insert(conversations)
      .values({
        agencyId: event.agencyId,
        clientId: event.clientId,
        contactId: event.contactId!,
        websiteId: event.websiteId,
        channel: "form",
        status: "open",
        lastMessageAt: new Date(),
      })
      .returning({ id: conversations.id }),
  );
  return {
    action: "open_conversation",
    ok: true,
    detail: created?.id,
  };
}

async function callWebhook(
  rule: AutomationRule,
  event: AutomationEvent,
  settings: AutomationSettings,
  decision: LeadDecision,
): Promise<ActionResult> {
  const url = (rule.webhookUrl || settings.defaultWebhookUrl).trim();
  if (!url) {
    return { action: "webhook", ok: false, detail: "No webhook URL" };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: event.trigger,
      websiteId: event.websiteId,
      websiteName: event.websiteName,
      formId: event.formId,
      formName: event.formName,
      contactId: event.contactId,
      conversationId: event.conversationId,
      pageUrl: event.pageUrl,
      contact: event.contact,
      values: event.values ?? {},
      ai: event.ai ?? null,
      crm: event.crm ?? null,
      decision,
      rule: { id: rule.id, name: rule.name },
      at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    return {
      action: "webhook",
      ok: false,
      detail: `HTTP ${res.status}`,
    };
  }
  return { action: "webhook", ok: true, detail: url };
}

async function sendWhatsApp(
  rule: AutomationRule,
  event: AutomationEvent,
  ctx: MergeContext,
  settings: AutomationSettings,
): Promise<ActionResult> {
  if (!isSocialConnected(settings, "whatsapp")) {
    return {
      action: "notify_whatsapp",
      ok: false,
      detail: "WhatsApp not connected",
    };
  }
  const account = settings.socialAccounts.find(
    (a) => a.provider === "whatsapp" && a.connected,
  ) as SocialAccount | undefined;
  if (!account) {
    return {
      action: "notify_whatsapp",
      ok: false,
      detail: "WhatsApp account missing",
    };
  }

  const toPhone = normalizePhone(event.contact.phone);
  if (!toPhone) {
    return {
      action: "notify_whatsapp",
      ok: false,
      detail: "Visitor has no phone number",
    };
  }

  const body = rule.socialMessage.trim()
    ? mergeTokens(rule.socialMessage, ctx)
    : mergeTokens(
        "Hi {{name}}, thanks for contacting {{website}}. We’ll reply soon.",
        ctx,
      );

  const graphUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(account.accountId)}/messages`;
  const res = await fetch(graphUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone,
      type: "text",
      text: { body: body.slice(0, 4000) },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return {
      action: "notify_whatsapp",
      ok: false,
      detail: `WhatsApp API ${res.status}${errText ? `: ${errText.slice(0, 120)}` : ""}`,
    };
  }
  return { action: "notify_whatsapp", ok: true, detail: toPhone };
}

async function runScheduleFollowUp(
  rule: AutomationRule,
  event: AutomationEvent,
  ctx: MergeContext,
  replyTo: string,
  openToken: string,
): Promise<ActionResult> {
  const to = event.contact.email?.trim().toLowerCase();
  if (!to || !event.contactId) {
    return {
      action: "schedule_follow_up",
      ok: false,
      detail: "Need visitor email + contact",
    };
  }
  const scheduled = await scheduleFollowUp({
    agencyId: event.agencyId,
    clientId: event.clientId,
    websiteId: event.websiteId,
    contactId: event.contactId,
    ruleId: rule.id,
    ruleName: rule.name,
    delayHours: rule.followUpDelayHours || 48,
    toEmail: to,
    websiteName: event.websiteName || "Our team",
    replyTo,
    offerMessage: rule.followUpOfferMessage,
    reminderMessage: rule.followUpReminderMessage,
    mergeCtx: ctx,
    openToken: openToken || undefined,
  });
  if (!scheduled) {
    return { action: "schedule_follow_up", ok: false, detail: "Could not schedule" };
  }
  return {
    action: "schedule_follow_up",
    ok: true,
    detail: `Due ${scheduled.runAt.toISOString()}`,
  };
}

async function assignSales(
  rule: AutomationRule,
  event: AutomationEvent,
  decision: LeadDecision,
  settings: AutomationSettings,
  fallbackNotify: string,
): Promise<ActionResult> {
  if (!event.contactId) {
    return { action: "assign_sales", ok: false, detail: "No contact id" };
  }

  const budgetRaw =
    typeof event.values?.budget === "string" ||
    typeof event.values?.budget === "number"
      ? String(event.values.budget)
      : typeof event.values?.budget_range === "string"
        ? event.values.budget_range
        : "";
  const budget = parseBudgetNumber(budgetRaw);
  const score = event.ai?.score ?? 0;
  const hotByBudget =
    rule.budgetThreshold > 0 && budget != null && budget >= rule.budgetThreshold;
  const hotByScore = rule.minScore > 0 && score >= rule.minScore;
  const hotByAi =
    decision.interest === "hot" || decision.urgency === "high";

  if (!hotByBudget && !hotByScore && !hotByAi && (rule.budgetThreshold > 0 || rule.minScore > 0)) {
    return {
      action: "assign_sales",
      ok: true,
      detail: "Skipped — below budget/score threshold",
    };
  }

  const assignee = rule.assignee.trim() || "Sales Manager";
  await withAgency(event.agencyId, async (tx) => {
    const [row] = await tx
      .select({ fields: contacts.fields })
      .from(contacts)
      .where(eq(contacts.id, event.contactId!))
      .limit(1);
    const prev = (row?.fields ?? {}) as Record<string, unknown>;
    await tx
      .update(contacts)
      .set({
        fields: {
          ...prev,
          assignee,
          priority:
            decision.urgency === "high" || hotByBudget ? "urgent" : "high",
          intent: decision.intent,
          interest: decision.interest,
        },
        status: "working",
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, event.contactId!));
  });

  const salesTo = (
    rule.salesNotifyEmail ||
    rule.notifyEmail ||
    settings.defaultNotifyEmail ||
    fallbackNotify
  )
    .trim()
    .toLowerCase();

  if (salesTo) {
    await sendEmail(
      automationAdminEmail({
        to: salesTo,
        websiteName: event.websiteName || "Website",
        replyTo: event.contact.email,
        subject: `High priority lead → ${assignee}`,
        ctx: {
          ...mergeCtx(event),
          message: `Assigned to ${assignee}. Budget: ${budget ?? "n/a"} · Score: ${score} · ${decision.interest}/${decision.urgency}`,
        },
      }),
    );
  }

  await appendVisitorTimeline({
    agencyId: event.agencyId,
    clientId: event.clientId,
    contactId: event.contactId,
    websiteId: event.websiteId,
    eventType: "assign",
    title: `Assigned to ${assignee}`,
    detail: `Budget ${budget ?? "n/a"} · score ${score}`,
  });

  return {
    action: "assign_sales",
    ok: true,
    detail: assignee,
  };
}

async function runSms(
  rule: AutomationRule,
  event: AutomationEvent,
  ctx: MergeContext,
): Promise<ActionResult> {
  const to = rule.smsTo.trim() || event.contact.phone || "";
  if (!to) {
    return { action: "notify_sms", ok: false, detail: "No SMS destination" };
  }
  const body = buildChannelMessage(
    rule.socialMessage,
    ctx,
    "Hi {{name}}, thanks for contacting {{website}}. We’ll reply soon.",
  );
  const res = await sendTwilioSms({ to, body });
  if (res.ok && event.contactId) {
    await appendVisitorTimeline({
      agencyId: event.agencyId,
      clientId: event.clientId,
      contactId: event.contactId,
      websiteId: event.websiteId,
      eventType: "sms_sent",
      title: "SMS sent",
      detail: res.detail,
    });
  }
  return { action: "notify_sms", ok: res.ok, detail: res.detail };
}

async function runSlack(
  rule: AutomationRule,
  event: AutomationEvent,
  ctx: MergeContext,
  settings: AutomationSettings,
): Promise<ActionResult> {
  const url = (rule.slackWebhookUrl || settings.defaultSlackWebhookUrl).trim();
  if (!url) {
    return {
      action: "notify_slack",
      ok: false,
      detail: "No Slack webhook configured",
    };
  }
  const text = buildChannelMessage(
    rule.socialMessage,
    ctx,
    "New Avonix alert — {{form}} · {{name}} · {{email}} · score {{score}}",
  );
  const res = await sendSlackWebhook({ url, text });
  return { action: "notify_slack", ok: res.ok, detail: res.detail };
}

function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  const cleaned = digits.replace(/^\+/, "").replace(/\D/g, "");
  return cleaned.length >= 8 ? cleaned : null;
}
