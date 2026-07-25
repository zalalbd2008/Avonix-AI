import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";

/**
 * Survives hard-delete of a website so the plugin can still authenticate once
 * more and receive a self-uninstall command.
 *
 * NOT TENANT-SCOPED — same reason as `connector_keys`: the lookup happens before
 * any agency is known, keyed only by the presented connector key hash.
 */
export const pluginUninstallTokens = pgTable(
  "plugin_uninstall_tokens",
  {
    ...primaryId,
    secretHash: text("secret_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("plugin_uninstall_tokens_hash_key").on(t.secretHash),
    index("plugin_uninstall_tokens_expires_idx").on(t.expiresAt),
  ],
);

export type PluginUninstallToken = typeof pluginUninstallTokens.$inferSelect;
