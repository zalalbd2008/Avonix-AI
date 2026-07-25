import {
  index,
  jsonb,
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

export type WebsiteFontSettings = {
  primaryFamily?: string;
  headingFamily?: string;
  weights?: number[];
};

import type { AccessibilitySettings } from "@/lib/accessibility/types";
import type { LanguageSettings } from "@/lib/languages/types";
import type { UpdatesSettings } from "@/lib/updates/types";
import type { UptimeSettings } from "@/lib/uptime/types";

export type WebsiteSettings = {
  fonts?: WebsiteFontSettings;
  /** Site-wide accessibility widget + statement (see lib/accessibility). */
  accessibility?: AccessibilitySettings;
  /** Multilingual / translation settings (see lib/languages). */
  languages?: LanguageSettings;
  /** Availability monitor configuration (see lib/uptime). */
  uptime?: UptimeSettings;
  /** WordPress update watching preferences (see lib/updates). */
  updates?: UpdatesSettings;
};

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

    /** Per-website branding / fonts (Google CDN links, etc.) */
    settings: jsonb("settings").$type<WebsiteSettings>().notNull().default({}),

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
