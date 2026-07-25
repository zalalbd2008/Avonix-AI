/**
 * Exercises multi-organization support: membership listing, per-organization
 * counts, and — the one that matters — that the active-organization cookie is a
 * preference and never an authorisation.
 *
 * The last group is the whole security story of ADR-006. Row-level security
 * enforces whatever tenant it is handed; it cannot know whether the caller was
 * entitled to hand it that one. If the cookie were trusted, setting it to any
 * uuid would read another organization's data with RLS working perfectly.
 *
 *   npm run dev            # in another terminal
 *   npx tsx scripts/test-organizations.ts
 */
import { randomBytes } from "node:crypto";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ok   ${name}`);
    pass++;
  } else {
    console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ""}`);
    fail++;
  }
}

/** Sign a fresh user up through the real endpoint and return their cookie. */
async function signUp(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password, name: "Org Test" }),
  });
  if (!res.ok) throw new Error(`sign-up failed: ${res.status} ${await res.text()}`);

  const cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("no session cookie");
  return cookie;
}

async function main() {
  const { eq, sql } = await import("drizzle-orm");
  const { db, withAgency } = await import("../src/lib/db");
  const { agencies, memberships, user } = await import("../src/lib/db/schema");
  const { listOrganizations, isMemberOf } = await import("../src/lib/agency/organizations");
  const { createClientForAgency } = await import("../src/lib/clients/service");

  const stamp = randomBytes(4).toString("hex");

  /** Make an organization and enrol `userId` as its owner. */
  async function makeOrg(name: string, userId: string) {
    const id = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.agency_id', ${id}, true)`);
      await tx.insert(agencies).values({
        id,
        name,
        slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${stamp}`,
        plan: "professional",
      });
      await tx.insert(memberships).values({
        agencyId: id,
        userId,
        role: "owner",
        acceptedAt: new Date(),
      });
    });
    return id;
  }

  const emailA = `org-a-${stamp}@avonix.test`;
  const emailB = `org-b-${stamp}@avonix.test`;
  const password = "org-test-password-1234";

  const cookieA = await signUp(emailA, password);
  await signUp(emailB, password);

  const [userA] = await db.select({ id: user.id }).from(user).where(eq(user.email, emailA)).limit(1);
  const [userB] = await db.select({ id: user.id }).from(user).where(eq(user.email, emailB)).limit(1);

  console.log("Membership listing");
  const first = await makeOrg("First Org", userA.id);
  const second = await makeOrg("Second Org", userA.id);
  const theirs = await makeOrg("Someone Elses Org", userB.id);

  await createClientForAgency(first, { name: "Client In First" });
  await createClientForAgency(second, { name: "Client In Second" });
  await createClientForAgency(second, { name: "Another In Second" });
  await createClientForAgency(theirs, { name: "Client In Theirs" });

  const mine = await listOrganizations(userA.id);
  check("both of my organizations are listed", mine.length === 2, `${mine.length}`);
  check(
    "someone else's organization is not",
    !mine.some((o) => o.id === theirs),
    JSON.stringify(mine.map((o) => o.name)),
  );

  const firstRow = mine.find((o) => o.id === first);
  const secondRow = mine.find((o) => o.id === second);
  check("counts are per organization", firstRow?.clients === 1, `${firstRow?.clients}`);
  check("and do not leak across them", secondRow?.clients === 2, `${secondRow?.clients}`);
  check("the role comes from the membership", firstRow?.role === "owner", `${firstRow?.role}`);

  console.log("\nMembership checks");
  check("I am a member of my own organization", await isMemberOf(userA.id, first));
  check("I am a member of my second one", await isMemberOf(userA.id, second));
  check("I am NOT a member of someone else's", !(await isMemberOf(userA.id, theirs)));
  check("nor of an organization that does not exist", !(await isMemberOf(userA.id, crypto.randomUUID())));

  console.log("\nThe cookie is a preference, not an authorisation");

  async function dashboardAs(orgCookie: string | null) {
    const cookie = orgCookie ? `${cookieA}; avonix_org=${orgCookie}` : cookieA;
    const res = await fetch(`${BASE}/dashboard`, { headers: { Cookie: cookie } });
    return { status: res.status, body: await res.text() };
  }

  const noPreference = await dashboardAs(null);
  check("with no cookie I land in my first organization", noPreference.body.includes("First Org"), `${noPreference.status}`);

  const switched = await dashboardAs(second);
  check("naming my second organization switches to it", switched.body.includes("Second Org"));
  check("and my first is no longer the active one", !switched.body.includes("Client In First"));

  // The attack: a valid session, a cookie naming an organization I was never in.
  const stolen = await dashboardAs(theirs);
  check(
    "naming someone else's organization does NOT switch to it",
    !stolen.body.includes("Someone Elses Org"),
    "the cookie was trusted — this is a tenant break",
  );
  check(
    "none of their data is rendered",
    !stolen.body.includes("Client In Theirs"),
    "another organization's client leaked into the page",
  );
  check("I am shown my own organization instead", stolen.body.includes("First Org"));

  const garbage = await dashboardAs("not-a-uuid");
  check("a malformed cookie is ignored rather than erroring", garbage.status === 200, `${garbage.status}`);

  console.log("\nIsolation still holds underneath");
  const acrossTenant = await withAgency(first, (tx) =>
    tx.select({ id: agencies.id }).from(agencies).where(eq(agencies.id, theirs)),
  );
  check("one organization cannot read another's row", acrossTenant.length === 0, `${acrossTenant.length}`);

  for (const id of [first, second, theirs]) {
    await withAgency(id, (tx) => tx.delete(agencies).where(eq(agencies.id, id)));
  }
  await db.delete(user).where(eq(user.id, userA.id));
  await db.delete(user).where(eq(user.id, userB.id));

  console.log();
  if (fail > 0) {
    console.log(`FAILED — ${fail} failed, ${pass} passed`);
    process.exit(1);
  }
  console.log(`organizations ok — ${pass} checks passed`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
