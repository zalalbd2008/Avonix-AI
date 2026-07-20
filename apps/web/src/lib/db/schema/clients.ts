import { index, pgTable, text } from "drizzle-orm/pg-core";
import { softDelete, primaryId, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { contacts } from "./contacts";

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
    ...primaryId,
    agencyId: agencyId(),
    name: text("name").notNull(),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    notes: text("notes"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index("clients_agency_idx").on(t.agencyId)],
);

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
