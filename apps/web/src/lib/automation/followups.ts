import { and, eq, lte } from "drizzle-orm";
import { randomBytes } from "crypto";
import { adminDb } from "@/lib/db/admin";
import { withAgency } from "@/lib/db";
import { automationFollowUps } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { thankYouEmail } from "./emails";
import {
  mergeTokens,
  type MergeContext,
} from "./interpolate";
import { appendVisitorTimeline } from "./timeline";
import { trackingPixelUrl } from "./tracking-urls";

export function newOpenToken(): string {
  return randomBytes(24).toString("hex");
}

export { trackingPixelUrl, trackingClickUrl } from "./tracking-urls";

export async function scheduleFollowUp(input: {
  agencyId: string;
  clientId: string;
  websiteId: string;
  contactId: string;
  ruleId: string;
  ruleName: string;
  delayHours: number;
  toEmail: string;
  websiteName: string;
  replyTo?: string;
  offerMessage: string;
  reminderMessage: string;
  mergeCtx: MergeContext;
  openToken?: string;
}): Promise<{ openToken: string; runAt: Date } | null> {
  if (!input.toEmail || !input.contactId) return null;

  const openToken = input.openToken || newOpenToken();
  const hours = Math.max(1, Math.min(720, input.delayHours || 48));
  const runAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  await withAgency(input.agencyId, (tx) =>
    tx.insert(automationFollowUps).values({
      agencyId: input.agencyId,
      clientId: input.clientId,
      websiteId: input.websiteId,
      contactId: input.contactId,
      ruleId: input.ruleId,
      ruleName: input.ruleName,
      status: "pending",
      runAt,
      openToken,
      branchOnOpen: 1,
      offerMessage:
        input.offerMessage ||
        "Hi {{name}}, saw you opened our email — shall we continue?",
      reminderMessage:
        input.reminderMessage ||
        "Hi {{name}}, just a friendly reminder about your request.",
      subjectOffer: `Quick follow-up — ${input.websiteName}`,
      subjectReminder: `Checking in — ${input.websiteName}`,
      toEmail: input.toEmail,
      websiteName: input.websiteName,
      replyTo: input.replyTo ?? "",
      mergeCtx: input.mergeCtx as Record<string, unknown>,
    }),
  );

  await appendVisitorTimeline({
    agencyId: input.agencyId,
    clientId: input.clientId,
    contactId: input.contactId,
    websiteId: input.websiteId,
    eventType: "follow_up_scheduled",
    title: "Follow-up scheduled",
    detail: `In ${hours}h · open → offer / else reminder`,
    meta: { runAt: runAt.toISOString(), ruleId: input.ruleId },
  });

  return { openToken, runAt };
}

/** Mark open via public pixel (admin DB, bypasses RLS). */
export async function markFollowUpOpened(token: string): Promise<boolean> {
  const clean = token.trim();
  if (!clean || clean.length < 16) return false;

  const [row] = await adminDb
    .select({
      id: automationFollowUps.id,
      agencyId: automationFollowUps.agencyId,
      clientId: automationFollowUps.clientId,
      contactId: automationFollowUps.contactId,
      websiteId: automationFollowUps.websiteId,
      openedAt: automationFollowUps.openedAt,
    })
    .from(automationFollowUps)
    .where(eq(automationFollowUps.openToken, clean))
    .limit(1);

  if (!row) return false;
  if (row.openedAt) return true;

  await adminDb
    .update(automationFollowUps)
    .set({ openedAt: new Date(), updatedAt: new Date() })
    .where(eq(automationFollowUps.id, row.id));

  await appendVisitorTimeline({
    agencyId: row.agencyId,
    clientId: row.clientId,
    contactId: row.contactId,
    websiteId: row.websiteId,
    eventType: "email_opened",
    title: "Email opened",
    detail: "Visitor opened a tracked automation email",
  });

  // Fire email_opened rules (dynamic import avoids circular deps with engine)
  void import("./engine").then(({ enqueueWebsiteAutomation }) => {
    enqueueWebsiteAutomation({
      trigger: "email_opened",
      agencyId: row.agencyId,
      clientId: row.clientId,
      websiteId: row.websiteId,
      contactId: row.contactId,
      contact: {},
      values: {},
    });
  });

  return true;
}

/** Mark click via tracked redirect (admin DB). */
export async function markFollowUpClicked(
  token: string,
  destination?: string,
): Promise<boolean> {
  const clean = token.trim();
  if (!clean || clean.length < 16) return false;

  const [row] = await adminDb
    .select({
      id: automationFollowUps.id,
      agencyId: automationFollowUps.agencyId,
      clientId: automationFollowUps.clientId,
      contactId: automationFollowUps.contactId,
      websiteId: automationFollowUps.websiteId,
      clickedAt: automationFollowUps.clickedAt,
      openedAt: automationFollowUps.openedAt,
    })
    .from(automationFollowUps)
    .where(eq(automationFollowUps.openToken, clean))
    .limit(1);

  if (!row) return false;

  const patch: {
    clickedAt?: Date;
    openedAt?: Date;
    updatedAt: Date;
  } = { updatedAt: new Date() };
  if (!row.clickedAt) patch.clickedAt = new Date();
  if (!row.openedAt) patch.openedAt = new Date();

  await adminDb
    .update(automationFollowUps)
    .set(patch)
    .where(eq(automationFollowUps.id, row.id));

  if (!row.clickedAt) {
    await appendVisitorTimeline({
      agencyId: row.agencyId,
      clientId: row.clientId,
      contactId: row.contactId,
      websiteId: row.websiteId,
      eventType: "email_clicked",
      title: "Email link clicked",
      detail: destination?.slice(0, 240) ?? null,
    });

    void import("./engine").then(({ enqueueWebsiteAutomation }) => {
      enqueueWebsiteAutomation({
        trigger: "email_clicked",
        agencyId: row.agencyId,
        clientId: row.clientId,
        websiteId: row.websiteId,
        contactId: row.contactId,
        contact: {},
        values: destination ? { url: destination } : {},
      });
    });
  }

  return true;
}

export async function processDueFollowUps(limit = 40): Promise<{
  processed: number;
  sent: number;
}> {
  const now = new Date();
  const due = await adminDb
    .select()
    .from(automationFollowUps)
    .where(
      and(
        eq(automationFollowUps.status, "pending"),
        lte(automationFollowUps.runAt, now),
      ),
    )
    .limit(limit);

  let sent = 0;
  for (const row of due) {
    try {
      const opened = Boolean(row.openedAt);
      const useOffer = row.branchOnOpen === 1 && opened;
      const template = useOffer
        ? row.offerMessage
        : row.reminderMessage || row.offerMessage;
      const subject = useOffer
        ? row.subjectOffer || `Follow-up — ${row.websiteName}`
        : row.subjectReminder || `Reminder — ${row.websiteName}`;
      const kind = useOffer ? "offer" : "reminder";
      const ctx = (row.mergeCtx ?? {}) as MergeContext;

      await sendEmail(
        thankYouEmail({
          to: row.toEmail,
          websiteName: row.websiteName || "Our team",
          replyTo: row.replyTo || undefined,
          subject,
          template,
          ctx,
          trackingPixelUrl: trackingPixelUrl(row.openToken),
          trackingToken: row.openToken,
        }),
      );

      await adminDb
        .update(automationFollowUps)
        .set({
          status: "sent",
          sentAt: new Date(),
          sentKind: kind,
          updatedAt: new Date(),
        })
        .where(eq(automationFollowUps.id, row.id));

      await appendVisitorTimeline({
        agencyId: row.agencyId,
        clientId: row.clientId,
        contactId: row.contactId,
        websiteId: row.websiteId,
        eventType: "follow_up_sent",
        title: useOffer ? "Offer email sent" : "Reminder email sent",
        detail: mergeTokens(template, ctx).slice(0, 240),
        meta: { kind, opened },
      });

      sent += 1;
    } catch (err) {
      console.error("[follow-up] send failed", row.id, err);
    }
  }

  return { processed: due.length, sent };
}
