import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { softDelete, tenantColumns, timestamps } from "./_shared";
import { clients } from "./clients";

export const websiteStatusEnum = pgEnum("website_status", [
  "pending", // registered, connector not yet installed
  "connected",
  "disconnected",
]);

/**
 * A WordPress site belonging to a Client. A lead *source*, not a CRM boundary
 * (ADR-002 §4).
 *
 * The connector plugin authenticates with `connectorSecret`. It is written once
 * at registration and never returned to the browser.
 */
export const websites = pgTable(
  "websites",
  {
    ...tenantColumns,
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    url: text("url").notNull(),

    status: websiteStatusEnum("status").notNull().default("pending"),
    connectorSecret: text("connector_secret").notNull(),
    connectorVersion: text("connector_version"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("websites_agency_idx").on(t.agencyId),
    index("websites_client_idx").on(t.clientId),
  ],
);

export const websitesRelations = relations(websites, ({ one }) => ({
  client: one(clients, {
    fields: [websites.clientId],
    references: [clients.id],
  }),
}));

export type Website = typeof websites.$inferSelect;
export type NewWebsite = typeof websites.$inferInsert;
