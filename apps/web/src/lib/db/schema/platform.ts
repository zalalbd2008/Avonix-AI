/**
 * Platform Owner extension tables (ADR-012).
 *
 * Deliberately NOT tenant-scoped — same class as `memberships` / `connector_keys`:
 * these rows decide platform privilege before any agency is chosen.
 */
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { user } from "./auth";

export const platformAccountStatusEnum = pgEnum("platform_account_status", [
  "active",
  "disabled",
  "locked",
]);

/** Seat purpose for the small Platform Owner roster (max 4). */
export type PlatformOwnerPurpose =
  | "primary"
  | "backup"
  | "emergency"
  | "cofounder"
  | "custom";

/**
 * 1:1 with Better Auth `user` for platform-level flags and recovery contacts.
 * Ordinary signups never get a row here.
 */
export const platformAccounts = pgTable(
  "platform_accounts",
  {
    ...primaryId,
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Platform Owner / Platform Administrator seat. */
    platformOwner: boolean("platform_owner").notNull().default(false),
    /** Emergency account — disabled until recovery enables it. */
    breakGlass: boolean("break_glass").notNull().default(false),
    status: platformAccountStatusEnum("status").notNull().default("active"),
    /** primary | backup | emergency | cofounder | custom */
    purpose: text("purpose").$type<PlatformOwnerPurpose>().notNull().default("primary"),
    label: text("label"),
    recoveryEmail: text("recovery_email"),
    recoveryPhone: text("recovery_phone"),
    /** SHA-256 hex of the emergency recovery key (Layer 5). */
    emergencyKeyHash: text("emergency_key_hash"),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    breakGlassEnabledAt: timestamp("break_glass_enabled_at", {
      withTimezone: true,
    }),
    lastRecoveredAt: timestamp("last_recovered_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("platform_accounts_user_key").on(t.userId),
    index("platform_accounts_owner_idx").on(t.platformOwner),
    index("platform_accounts_break_glass_idx").on(t.breakGlass),
  ],
);

/** Singleton-style settings row (id fixed in bootstrap / migration). */
export const platformSettings = pgTable("platform_settings", {
  id: text("id").primaryKey().default("default"),
  maxPlatformOwners: integer("max_platform_owners").notNull().default(4),
  ...timestamps,
});

export const platformRecoveryCodes = pgTable(
  "platform_recovery_codes",
  {
    ...primaryId,
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** SHA-256 hex of the raw code. */
    codeHash: text("code_hash").notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("platform_recovery_codes_user_idx").on(t.userId),
    uniqueIndex("platform_recovery_codes_hash_key").on(t.codeHash),
  ],
);

export const platformSecurityEvents = pgTable(
  "platform_security_events",
  {
    ...primaryId,
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    event: text("event").notNull(),
    detail: text("detail"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (t) => [
    index("platform_security_events_user_idx").on(t.userId),
    index("platform_security_events_event_idx").on(t.event),
    index("platform_security_events_created_idx").on(t.createdAt),
  ],
);

export const DEFAULT_MAX_PLATFORM_OWNERS = 4;

export type PlatformAccount = typeof platformAccounts.$inferSelect;
export type PlatformRecoveryCode = typeof platformRecoveryCodes.$inferSelect;
export type PlatformSecurityEvent = typeof platformSecurityEvents.$inferSelect;
export type PlatformSettings = typeof platformSettings.$inferSelect;
