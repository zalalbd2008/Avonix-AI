import { index, uniqueIndex, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { agencies } from "./agencies";
import { user } from "./auth";

/**
 * Identity lives in `auth.ts` (Better Auth's `user` table, generated — do not
 * hand-edit it). This file holds the *tenancy* join: which agencies a person may
 * act as.
 *
 * The split matters. Better Auth answers "who is this?"; `memberships` answers
 * "on whose behalf?", and only the second one decides what rows are visible.
 */

/** Coarse seat. Fine-grained keys live on `org_roles` via `customRoleId` (ADR-013). */
export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "member"]);

export const memberships = pgTable(
  "memberships",
  {
    ...primaryId,
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("owner"),
    /** Custom org role for `member` (and optionally `admin`). Null for owners. */
    customRoleId: uuid("custom_role_id"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("memberships_agency_idx").on(t.agencyId),
    index("memberships_user_idx").on(t.userId),
    index("memberships_custom_role_idx").on(t.customRoleId),
    // One membership per person per organization.
    //
    // Without this a second enrolment — an invite accepted twice, a retried
    // request — silently creates a duplicate. Nothing errors: the organization
    // list shows the same one twice and `organizationCount` is wrong. The
    // constraint is also what makes `ON CONFLICT DO NOTHING` on this table mean
    // anything; with no target to conflict on, it does nothing at all and
    // inserts every time.
    uniqueIndex("memberships_agency_user_key").on(t.agencyId, t.userId),
  ],
);

export type Membership = typeof memberships.$inferSelect;
