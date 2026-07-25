/**
 * Creates a signed-in development account and prints its session cookie.
 *
 * Signs up through the real auth endpoint rather than inserting a user row, so
 * the password hashing and session shape are whatever Better Auth actually
 * does — a hand-made row would authenticate in a way no real user ever will.
 * The membership is inserted directly because that is the one step onboarding
 * does through a browser form.
 *
 *   npx tsx scripts/dev-login.ts            # uses the seeded Northwind agency
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const EMAIL = process.env.DEV_LOGIN_EMAIL ?? "dev@avonix.test";
const PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? "dev-password-1234";

const url = process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("ADMIN_DATABASE_URL or DATABASE_URL must be set");
const sql = postgres(url, { max: 1 });

async function main() {
  const [agency] = await sql`SELECT id, name FROM agencies WHERE slug = 'northwind' LIMIT 1`;
  if (!agency) throw new Error("Seed first: npx tsx scripts/seed.ts");

  // Sign up, or sign in if this account already exists from a previous run.
  let res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    // Better Auth refuses a cross-origin post without this, which is the CSRF
    // protection doing its job rather than something to work around.
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: "Dev User" }),
  });

  if (!res.ok) {
    res = await fetch(`${BASE}/api/auth/sign-in/email`, {
      method: "POST",
      // Better Auth refuses a cross-origin post without this, which is the CSRF
    // protection doing its job rather than something to work around.
    headers: { "Content-Type": "application/json", Origin: BASE },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
  }

  if (!res.ok) {
    throw new Error(`auth failed: ${res.status} ${await res.text()}`);
  }

  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .join("; ");
  if (!cookie) throw new Error("no session cookie returned");

  const [account] = await sql`SELECT id FROM "user" WHERE email = ${EMAIL} LIMIT 1`;
  // Naming the constraint matters: a bare ON CONFLICT DO NOTHING has no target
  // to conflict on and inserts a duplicate on every run.
  await sql`
    INSERT INTO memberships (agency_id, user_id, role, accepted_at)
    VALUES (${agency.id}, ${account.id}, 'owner', now())
    ON CONFLICT (agency_id, user_id) DO NOTHING`;

  console.log(cookie);
  console.error(`signed in as ${EMAIL} on ${agency.name}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
