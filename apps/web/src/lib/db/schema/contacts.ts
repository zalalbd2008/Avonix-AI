import { relations } from "drizzle-orm";
import { index, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { softDelete, tenantColumns, timestamps } from "./_shared";
import { clients } from "./clients";
import { websites } from "./websites";

export const contactStatusEnum = pgEnum("contact_status", [
  "new",
  "working",
  "qualified",
  "won",
  "lost",
]);

/**
 * A person captured from one of the client's websites.
 *
 * Belongs to the Client, not the Website (ADR-002 §4). `sourceWebsiteId` records
 * where they first arrived. Deduplication across a client's sites is expected
 * behaviour: the unique index is on (client, email).
 */
export const contacts = pgTable(
  "contacts",
  {
    ...tenantColumns,
    clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    sourceWebsiteId: uuid("source_website_id").references(() => websites.id, { onDelete: "set null" }),

    name: text("name"),
    email: text("email"),
    phone: text("phone"),
    status: contactStatusEnum("status").notNull().default("new"),

    /** Whatever the form collected beyond the known columns. */
    fields: jsonb("fields").$type<Record<string, unknown>>().notNull().default({}),
    tags: text("tags").array().notNull().default([]),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("contacts_agency_idx").on(t.agencyId),
    index("contacts_client_idx").on(t.clientId),
    index("contacts_status_idx").on(t.clientId, t.status),
    uniqueIndex("contacts_client_email_key").on(t.clientId, t.email),
  ],
);

export const contactsRelations = relations(contacts, ({ one }) => ({
  client: one(clients, { fields: [contacts.clientId], references: [clients.id] }),
  sourceWebsite: one(websites, { fields: [contacts.sourceWebsiteId], references: [websites.id] }),
}));

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
