import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { clients } from "./clients";
import { contacts } from "./contacts";
import { websites } from "./websites";

export const crmTaskStatusEnum = pgEnum("crm_task_status", [
  "open",
  "done",
  "cancelled",
]);

export const crmTasks = pgTable(
  "crm_tasks",
  {
    ...primaryId,
    agencyId: agencyId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "cascade",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: crmTaskStatusEnum("status").notNull().default("open"),
    assignee: text("assignee").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    index("crm_tasks_client_idx").on(t.clientId, t.status),
    index("crm_tasks_website_idx").on(t.websiteId),
    index("crm_tasks_agency_idx").on(t.agencyId),
  ],
);

export const crmNotes = pgTable(
  "crm_notes",
  {
    ...primaryId,
    agencyId: agencyId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "cascade",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("crm_notes_client_idx").on(t.clientId),
    index("crm_notes_website_idx").on(t.websiteId),
    index("crm_notes_contact_idx").on(t.contactId),
  ],
);

export const crmFiles = pgTable(
  "crm_files",
  {
    ...primaryId,
    agencyId: agencyId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "cascade",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("other"),
    url: text("url").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    index("crm_files_client_idx").on(t.clientId),
    index("crm_files_website_idx").on(t.websiteId),
  ],
);

export const crmAssignmentRules = pgTable(
  "crm_assignment_rules",
  {
    ...primaryId,
    agencyId: agencyId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    matchField: text("match_field").notNull().default("city"),
    matchValue: text("match_value").notNull(),
    assignee: text("assignee").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    priority: integer("priority").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("crm_assignment_rules_client_idx").on(t.clientId),
    index("crm_assign_website_idx").on(t.websiteId),
  ],
);

export const crmTicketStatusEnum = pgEnum("crm_ticket_status", [
  "open",
  "pending",
  "waiting",
  "resolved",
  "closed",
]);

export const crmTickets = pgTable(
  "crm_tickets",
  {
    ...primaryId,
    agencyId: agencyId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "cascade",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    subject: text("subject").notNull(),
    status: crmTicketStatusEnum("status").notNull().default("open"),
    assignee: text("assignee").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    index("crm_tickets_client_idx").on(t.clientId, t.status),
    index("crm_tickets_website_idx").on(t.websiteId),
  ],
);

export const crmCalendarEvents = pgTable(
  "crm_calendar_events",
  {
    ...primaryId,
    agencyId: agencyId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "cascade",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    kind: text("kind").notNull().default("meeting"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("crm_calendar_client_idx").on(t.clientId, t.startsAt),
    index("crm_calendar_website_idx").on(t.websiteId),
  ],
);

export const crmDocStatusEnum = pgEnum("crm_doc_status", [
  "draft",
  "sent",
  "viewed",
  "approved",
  "signed",
  "paid",
  "void",
]);

export const crmDocuments = pgTable(
  "crm_documents",
  {
    ...primaryId,
    agencyId: agencyId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "cascade",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    /** proposal | quote | invoice | contract */
    docType: text("doc_type").notNull(),
    title: text("title").notNull(),
    status: crmDocStatusEnum("status").notNull().default("draft"),
    amountCents: integer("amount_cents").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    body: text("body").notNull().default(""),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [
    index("crm_documents_client_idx").on(t.clientId, t.docType),
    index("crm_documents_website_idx").on(t.websiteId),
    index("crm_documents_agency_idx").on(t.agencyId),
  ],
);

export type CrmTask = typeof crmTasks.$inferSelect;
export type CrmNote = typeof crmNotes.$inferSelect;
export type CrmFile = typeof crmFiles.$inferSelect;
export type CrmAssignmentRule = typeof crmAssignmentRules.$inferSelect;
export type CrmTicket = typeof crmTickets.$inferSelect;
export type CrmCalendarEvent = typeof crmCalendarEvents.$inferSelect;
export type CrmDocument = typeof crmDocuments.$inferSelect;
