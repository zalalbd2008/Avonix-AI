import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Fixed-window rate limit, held in Postgres.
 *
 * One statement: the upsert either starts a new window or increments the current
 * one, and returns the resulting count. Doing it as read-then-write would let
 * two concurrent requests both read `limit - 1` and both proceed.
 *
 * A fixed window allows a burst of up to 2× the limit across a boundary. That is
 * an accepted trade for a single round trip and no Redis; the limits here are
 * about stopping abuse, not shaping traffic precisely.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const rows = await db.execute<{ count: number; window_start: Date }>(sql`
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (${key}, 1, date_trunc('second', now()))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
        THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
        THEN date_trunc('second', now())
        ELSE rate_limits.window_start
      END
    RETURNING count, window_start
  `);

  const row = rows[0];
  const count = Number(row?.count ?? 1);
  const started = row?.window_start ? new Date(row.window_start).getTime() : Date.now();
  const elapsed = Math.floor((Date.now() - started) / 1000);

  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, windowSeconds - elapsed),
  };
}

/**
 * Drop windows nobody is inside any more. Called opportunistically rather than
 * on a schedule — there is no cron yet, and an unbounded table is a slow leak.
 */
export async function pruneRateLimits(olderThanSeconds = 3600) {
  await db.execute(sql`
    DELETE FROM rate_limits
    WHERE window_start < now() - make_interval(secs => ${olderThanSeconds})
  `);
}
