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
import type { AutomationSettings } from "@/lib/automation/types";
import type { AuditLogSettings } from "@/lib/audit-log/types";
import type { BackupsDriveOAuth } from "@/lib/backups/drive-oauth";
import type { BackupsSettings } from "@/lib/backups/types";
import type { HealthSettings } from "@/lib/health/types";
import type { ErrorLogSettings } from "@/lib/error-log/types";
import type { LanguageSettings } from "@/lib/languages/types";
import type { SecuritySettings } from "@/lib/security/types";
import type { InsightsSettings } from "@/lib/insights/types";
import type { IntegrationsSettings } from "@/lib/integrations/types";
import type { UpdatesSettings } from "@/lib/updates/types";
import type { UptimeSettings } from "@/lib/uptime/types";
import type { WebsiteEmailSettings } from "@/lib/website-email/types";

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
  /** Per-website SMTP + campaign identity (see lib/website-email). */
  email?: WebsiteEmailSettings;
  /** If → then rules for leads, chat, uptime (see lib/automation). */
  automation?: AutomationSettings;
  /** Applied / dismissed insight actions (see lib/insights). */
  insights?: InsightsSettings;
  /** Optional third-party connections (see lib/integrations). */
  integrations?: IntegrationsSettings;
  /** Backup schedule, destination and history (see lib/backups). */
  backups?: BackupsSettings;
  /** Hardening, scans and login monitoring (see lib/security). */
  security?: SecuritySettings;
  /** Connector-reported health signals + last diagnostic (see lib/health). */
  health?: HealthSettings;
  /** Runtime error log from connector (see lib/error-log). */
  errorLog?: ErrorLogSettings;
  /** Append-only agency / system audit trail (see lib/audit-log). */
  auditLog?: AuditLogSettings;
  /** Google Drive OAuth tokens for backup destination (see lib/backups/drive-oauth). */
  backupsDriveOAuth?: BackupsDriveOAuth;
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
