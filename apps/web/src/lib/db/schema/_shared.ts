import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Columns every table carries.
 *
 * `agencyId` is the tenant key from ADR-002. It is on *every* table, including
 * ones you could reach by joining, because row-level security policies compare
 * it directly — a policy cannot join.
 */
export const tenantColumns = {
  id: uuid("id").primaryKey().defaultRandom(),
  agencyId: uuid("agency_id").notNull(),
};

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
};

/** Soft delete. Nothing is hard-deleted while an agency is active. */
export const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};
