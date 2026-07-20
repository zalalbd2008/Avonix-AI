import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { softDelete, primaryId, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
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
 * The plugin's key lives in `connector_keys`, not here — that table must be
 * readable before a tenant is known, and this one is tenant-scoped.
 */
export const websites = pgTable(
  "websites",
  {
    ...primaryId,
    agencyId: agencyId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    url: text("url").notNull(),

    status: websiteStatusEnum("status").notNull().default("pending"),
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

export type Website = typeof websites.$inferSelect;
export type NewWebsite = typeof websites.$inferInsert;
