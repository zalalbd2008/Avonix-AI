import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { clients } from "./clients";
import { contacts } from "./contacts";
import { websites } from "./websites";

/**
 * Per-contact journey log — form, email, open, chat, automation steps.
 * Complements form_submissions.crm.timeline (submission-scoped).
 */
export const visitorTimelineEvents = pgTable(
  "visitor_timeline_events",
  {
    ...primaryId,
    agencyId: agencyId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "set null",
    }),

    /** form_submit | email_sent | email_opened | chat_handoff | follow_up | assign | score | tag | webhook | custom */
    eventType: text("event_type").notNull(),
    title: text("title").notNull(),
    detail: text("detail"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("visitor_timeline_contact_idx").on(t.contactId, t.createdAt),
    index("visitor_timeline_agency_idx").on(t.agencyId),
    index("visitor_timeline_website_idx").on(t.websiteId, t.createdAt),
  ],
);

export const followUpStatusEnum = pgEnum("automation_follow_up_status", [
  "pending",
  "sent",
  "skipped",
  "cancelled",
]);

/**
 * Delayed follow-up emails with optional open/no-open branching.
 */
export const automationFollowUps = pgTable(
  "automation_follow_ups",
  {
    ...primaryId,
    agencyId: agencyId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),

    ruleId: text("rule_id").notNull(),
    ruleName: text("rule_name").notNull().default(""),
    status: followUpStatusEnum("status").notNull().default("pending"),

    /** When the follow-up becomes due. */
    runAt: timestamp("run_at", { withTimezone: true }).notNull(),
    /** Pixel / open token (public). */
    openToken: text("open_token").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }),

    /** If true: opened → offerMessage, else → reminderMessage. */
    branchOnOpen: integer("branch_on_open").notNull().default(1),
    offerMessage: text("offer_message").notNull().default(""),
    reminderMessage: text("reminder_message").notNull().default(""),
    subjectOffer: text("subject_offer").notNull().default(""),
    subjectReminder: text("subject_reminder").notNull().default(""),

    toEmail: text("to_email").notNull(),
    websiteName: text("website_name").notNull().default(""),
    replyTo: text("reply_to").notNull().default(""),
    mergeCtx: jsonb("merge_ctx").$type<Record<string, unknown>>().notNull().default({}),

    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentKind: text("sent_kind"),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("automation_follow_ups_token_key").on(t.openToken),
    index("automation_follow_ups_due_idx").on(t.status, t.runAt),
    index("automation_follow_ups_contact_idx").on(t.contactId),
    index("automation_follow_ups_agency_idx").on(t.agencyId),
  ],
);

export type VisitorTimelineEvent = typeof visitorTimelineEvents.$inferSelect;
export type AutomationFollowUp = typeof automationFollowUps.$inferSelect;
