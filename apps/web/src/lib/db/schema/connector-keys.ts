import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { agencies } from "./agencies";
import { clients } from "./clients";
import { websites } from "./websites";

/**
 * Connector keys — the connector-side mirror of `memberships`.
 *
 * DELIBERATELY NOT TENANT-SCOPED, for the same reason `memberships` is not: this
 * table is what *decides* the tenant. A plugin arrives holding nothing but a
 * key; the lookup has to happen before any agency is known, so scoping it would
 * be circular and would simply return zero rows.
 *
 * That is also why the key does not live on `websites`: that table is
 * tenant-scoped, so looking a site up by its key with no tenant set finds
 * nothing — which is precisely the bug the connector test caught.
 *
 * Only the SHA-256 hash is stored. `agencyId` and `clientId` are denormalised so
 * authentication is one indexed read with no join into scoped tables.
 */
export const connectorKeys = pgTable(
  "connector_keys",
  {
    ...primaryId,
    agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),

    secretHash: text("secret_hash").notNull(),
    /** First 12 characters, for "which key is this?" in the UI. Not a secret. */
    prefix: text("prefix").notNull(),

    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    /** Set instead of deleting, so rotation leaves an audit trail. */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("connector_keys_hash_key").on(t.secretHash),
    index("connector_keys_website_idx").on(t.websiteId),
  ],
);

export type ConnectorKey = typeof connectorKeys.$inferSelect;
