import { uuid } from "drizzle-orm/pg-core";
import { agencies } from "./agencies";

/**
 * The tenant key from ADR-002. On *every* table, including ones reachable by a
 * join, because a row-level security policy compares it directly — a policy
 * cannot join.
 *
 * A function rather than a shared column object so each table gets its own
 * foreign key with ON DELETE CASCADE. Without the FK an orphaned row is
 * possible, and an orphaned row is invisible to RLS forever.
 *
 * This lives apart from `_shared` to keep the import graph acyclic:
 *   _shared (leaf) -> agencies -> _tenant -> every other table
 */
export function agencyId() {
  return uuid("agency_id")
    .notNull()
    .references(() => agencies.id, { onDelete: "cascade" });
}
