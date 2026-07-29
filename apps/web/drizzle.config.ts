import { config } from "dotenv";
import type { Config } from "drizzle-kit";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export default {
  schema: "./src/lib/db/schema/index.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  // Migrations run as the owner, not as the RLS-bound app role.
  dbCredentials: { url: process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL! },
} satisfies Config;
