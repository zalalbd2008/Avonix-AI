import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

export const primaryId = {
  id: uuid("id").primaryKey().defaultRandom(),
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
