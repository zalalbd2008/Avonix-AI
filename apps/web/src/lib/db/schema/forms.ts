import { boolean, index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { softDelete, primaryId, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { clients } from "./clients";
import { contacts } from "./contacts";
import { websites } from "./websites";

export type FormField = {
  key: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox";
  required: boolean;
  options?: string[];
};

/**
 * A field list, not a drag-and-drop canvas (BACKLOG §4 — the canvas is a v2 trap).
 */
export const forms = pgTable(
  "forms",
  {
    ...primaryId,
    agencyId: agencyId(),
    clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, { onDelete: "set null" }),

    name: text("name").notNull(),
    fields: jsonb("fields").$type<FormField[]>().notNull().default([]),
    submitLabel: text("submit_label").notNull().default("Send"),
    successMessage: text("success_message").notNull().default("Thanks — we'll be in touch."),
    isPublished: boolean("is_published").notNull().default(false),

    ...timestamps,
    ...softDelete,
  },
  (t) => [index("forms_client_idx").on(t.clientId)],
);

export const formSubmissions = pgTable(
  "form_submissions",
  {
    ...primaryId,
    agencyId: agencyId(),
    formId: uuid("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    websiteId: uuid("website_id").references(() => websites.id, { onDelete: "set null" }),

    values: jsonb("values").$type<Record<string, unknown>>().notNull(),
    pageUrl: text("page_url"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    ...timestamps,
  },
  (t) => [
    index("form_submissions_form_idx").on(t.formId, t.createdAt),
    index("form_submissions_agency_idx").on(t.agencyId),
  ],
);

export type Form = typeof forms.$inferSelect;
export type FormSubmission = typeof formSubmissions.$inferSelect;
