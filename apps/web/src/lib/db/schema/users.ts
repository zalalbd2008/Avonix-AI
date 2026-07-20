import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { agencies } from "./agencies";

/**
 * Identity is bought, not built (ADR-004). This table is the local mirror of the
 * external auth provider's user, keyed by `externalId`. No password column will
 * ever exist here.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: text("external_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  ...timestamps,
});

/** ADR-003: only `owner` exists in v1. The enum is wider so v2 needs no migration. */
export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "member"]);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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

export type User = typeof users.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
