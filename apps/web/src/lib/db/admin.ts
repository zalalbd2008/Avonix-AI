import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Cross-tenant DB handle for Platform Owner surfaces (ADR-012).
 *
 * Uses ADMIN_DATABASE_URL — a role that can read past RLS. Never expose this
 * client to ordinary org routes; tenant app traffic stays on `db` / `withAgency`.
 */
const connectionString =
  process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("ADMIN_DATABASE_URL or DATABASE_URL must be set");
}

const client = postgres(connectionString, {
  max: 5,
  connect_timeout: 10,
  idle_timeout: 20,
});

export const adminDb = drizzle(client, { schema });
