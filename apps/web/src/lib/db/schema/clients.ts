import { relations } from "drizzle-orm";
import { index, pgTable, text } from "drizzle-orm/pg-core";
import { softDelete, tenantColumns, timestamps } from "./_shared";
import { agencies } from "./agencies";
import { contacts } from "./contacts";
import { websites } from "./websites";

/**
 * One client business. GoHighLevel's "sub-account" / "location".
 *
 * This is the CRM boundary: contacts, conversations and pipelines belong to a
 * Client, never to a Website (ADR-002 §4). A client with three sites has one
 * CRM; the site is recorded only as the *source* of a contact.
 */
export const clients = pgTable(
  "clients",
  {
    ...tenantColumns,
    name: text("name").notNull(),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    notes: text("notes"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("clients_agency_idx").on(t.agencyId)],
);

export const clientsRelations = relations(clients, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [clients.agencyId],
    references: [agencies.id],
  }),
  websites: many(websites),
  contacts: many(contacts),
}));

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
