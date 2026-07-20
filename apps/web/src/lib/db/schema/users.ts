import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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

/** ADR-003: only `owner` exists in v1. The enum is wider so v2 needs no migration. */
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
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("memberships_agency_idx").on(t.agencyId),
    index("memberships_user_idx").on(t.userId),
  ],
);

export type Membership = typeof memberships.$inferSelect;
