import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const client = postgres(connectionString, { max: 10 });

/**
 * Unscoped handle. Row-level security still applies, so with no tenant set
 * every tenant table reads as empty. Use this only for `users`/`memberships`
 * lookups that happen before a tenant is known.
 */
export const db = drizzle(client, { schema });

/**
 * Run a unit of work as one agency.
 *
 * `set_config(..., true)` is transaction-local, so the tenant cannot leak to the
 * next user of a pooled connection — which is exactly the bug this wrapper
 * exists to make impossible.
 *
 *     const rows = await withAgency(agencyId, (tx) => tx.select().from(clients));
 */
export async function withAgency<T>(
  agencyId: string,
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.agency_id', ${agencyId}, true)`);
    return fn(tx);
  });
}

export * from "./schema";
