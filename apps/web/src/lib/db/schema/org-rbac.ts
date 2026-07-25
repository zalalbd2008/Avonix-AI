/**
 * Organization-scoped roles & invitations (ADR-013).
 *
 * Permissions themselves are an immutable catalog in TypeScript
 * (`lib/team/permissions.ts`). Rows here only store which keys a custom role
 * holds. `memberships.role` stays the coarse gate (owner/admin = all access);
 * `custom_role_id` supplies fine-grained keys for `member`.
 */
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { agencies } from "./agencies";
import { user } from "./auth";

export const orgRoles = pgTable(
  "org_roles",
  {
    ...primaryId,
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    /** Built-in template roles seeded for the org; still editable. */
    isSystem: boolean("is_system").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("org_roles_agency_idx").on(t.agencyId),
    uniqueIndex("org_roles_agency_name_key").on(t.agencyId, t.name),
  ],
);

export const orgRolePermissions = pgTable(
  "org_role_permissions",
  {
    ...primaryId,
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => orgRoles.id, { onDelete: "cascade" }),
    /** Catalog key, e.g. crm.view */
    permission: text("permission").notNull(),
    ...timestamps,
  },
  (t) => [
    index("org_role_permissions_role_idx").on(t.roleId),
    index("org_role_permissions_agency_idx").on(t.agencyId),
    uniqueIndex("org_role_permissions_role_perm_key").on(t.roleId, t.permission),
  ],
);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

/**
 * Not tenant-RLS'd — accept flow looks up by token before any agency is set
 * (same shape as report_shares / connector_keys).
 */
export const organizationInvitations = pgTable(
  "organization_invitations",
  {
    ...primaryId,
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    /** Coarse membership role granted on accept — usually `member`. */
    memberRole: text("member_role")
      .$type<"owner" | "admin" | "member">()
      .notNull()
      .default("member"),
    customRoleId: uuid("custom_role_id").references(() => orgRoles.id, {
      onDelete: "set null",
    }),
    /** SHA-256 hex of the raw invite token. */
    tokenHash: text("token_hash").notNull(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    invitedByUserId: text("invited_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedUserId: text("accepted_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index("organization_invitations_agency_idx").on(t.agencyId),
    index("organization_invitations_email_idx").on(t.email),
    uniqueIndex("organization_invitations_token_key").on(t.tokenHash),
  ],
);

export type OrgRole = typeof orgRoles.$inferSelect;
export type OrgRolePermission = typeof orgRolePermissions.$inferSelect;
export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
