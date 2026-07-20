import { bigint, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Rate limiting, in Postgres.
 *
 * Deliberately not an in-memory counter: the connector endpoints are public and
 * the app runs serverless, where each request may hit a different instance with
 * its own empty map — a limiter that resets constantly is not a limiter.
 *
 * NOT tenant-scoped, and it must not be. The whole point is to throttle callers
 * *before* we know, or trust, which tenant they claim to be.
 */
export const rateLimits = pgTable(
  "rate_limits",
  {
    /** e.g. "submit:<websiteId>" or "register:<ip>" */
    key: text("key").primaryKey(),
    count: bigint("count", { mode: "number" }).notNull().default(0),
    /** Start of the current fixed window. */
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  },
  (t) => [index("rate_limits_window_idx").on(t.windowStart)],
);

export type RateLimit = typeof rateLimits.$inferSelect;
