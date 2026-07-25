/**
 * Exercises the public connector endpoints against a running dev server.
 *
 * These two routes are the only unauthenticated, internet-facing surface in the
 * product, so they get the most adversarial tests: forged keys, another
 * agency's key, oversized bodies, honeypots, and rate limits.
 *
 *   npm run dev            # in another terminal
 *   npx tsx scripts/test-connector.ts
 */
import { createHash, randomBytes } from "node:crypto";
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

function key() {
  const k = `avx_${randomBytes(20).toString("hex")}`;
  return { key: k, hash: createHash("sha256").update(k, "utf8").digest("hex"), prefix: k.slice(0, 12) };
}

async function post(path: string, body: unknown, authKey?: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authKey ? { Authorization: `Bearer ${authKey}` } : {}),
    },
    body: JSON.stringify(body),
  });
  let json: Record<string, unknown> = {};
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, json };
}

async function main() {
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.ADMIN_DATABASE_URL!, { max: 1 });

  // Two agencies, each with one client and one site — so "another agency's key"
  // is a real scenario rather than a hypothetical.
  const a = { key: key(), id: "", clientId: "", siteId: "" };
  const b = { key: key(), id: "", clientId: "", siteId: "" };

  for (const [tag, o] of [["conn-a", a], ["conn-b", b]] as const) {
    const suffix = randomBytes(4).toString("hex");
    await sql`DELETE FROM agencies WHERE slug = ${`${tag}-${suffix}`}`;
    const [ag] = await sql`INSERT INTO agencies (name, slug, plan, status) VALUES (${tag}, ${`${tag}-${suffix}`}, 'professional', 'active') RETURNING id`;
    const [cl] = await sql`INSERT INTO clients (agency_id, name) VALUES (${ag.id}, ${`${tag} client`}) RETURNING id`;
    const [ws] = await sql`
      INSERT INTO websites (agency_id, client_id, name, url, status)
      VALUES (${ag.id}, ${cl.id}, 'Site', ${`https://${tag}.test`}, 'pending')
      RETURNING id`;
    await sql`
      INSERT INTO connector_keys (agency_id, client_id, website_id, secret_hash, prefix)
      VALUES (${ag.id}, ${cl.id}, ${ws.id}, ${o.key.hash}, ${o.key.prefix})`;
    o.id = ag.id;
    o.clientId = cl.id;
    o.siteId = ws.id;
  }

  console.log("Authentication");
  check("no key is rejected", (await post("/api/v1/connector/register", {})).status === 401);
  check("malformed key is rejected", (await post("/api/v1/connector/register", {}, "not-a-key")).status === 401);
  check(
    "well-formed but unknown key is rejected",
    (await post("/api/v1/connector/register", {}, key().key)).status === 401,
  );

  const unknown = await post("/api/v1/connector/register", {}, key().key);
  const wrongShape = await post("/api/v1/connector/register", {}, "avx_TOOSHORT");
  check(
    "unknown and malformed keys give an identical response",
    unknown.status === wrongShape.status && unknown.json.error === wrongShape.json.error,
    `${unknown.status}/${unknown.json.error} vs ${wrongShape.status}/${wrongShape.json.error}`,
  );

  console.log("\nRegistration");
  const reg = await post("/api/v1/connector/register", { version: "1.0.0" }, a.key.key);
  check("a valid key registers", reg.status === 200 && reg.json.status === "connected", JSON.stringify(reg.json));

  const [after] = await sql`SELECT status, connector_version, last_seen_at FROM websites WHERE id = ${a.siteId}`;
  check("the site is marked connected", after.status === "connected");
  check("the plugin version is recorded", after.connector_version === "1.0.0", String(after.connector_version));
  check("last_seen_at is set", Boolean(after.last_seen_at));

  const reg2 = await post("/api/v1/connector/register", { version: "1.0.1" }, a.key.key);
  check("registering twice is idempotent", reg2.status === 200);

  console.log("\nSubmission");
  const s1 = await post("/api/v1/connector/submit", { name: "Ayesha", email: "Ayesha@Example.test", message: "Need a quote" }, a.key.key);
  check("a submission is accepted", s1.status === 200, JSON.stringify(s1.json));

  const [c1] = await sql`SELECT id, email, name, source_website_id FROM contacts WHERE id = ${s1.json.contact_id as string}`;
  check("the contact is created", Boolean(c1));
  check("the email is lower-cased", c1?.email === "ayesha@example.test", String(c1?.email));
  check("the source website is recorded", c1?.source_website_id === a.siteId);

  const s2 = await post("/api/v1/connector/submit", { name: "Ayesha Rahman", email: "ayesha@example.test", message: "Following up" }, a.key.key);
  check("the same email reuses the contact", s2.json.contact_id === s1.json.contact_id, `${s2.json.contact_id} vs ${s1.json.contact_id}`);
  check("but opens a second conversation", s2.json.conversation_id !== s1.json.conversation_id);

  const [c2] = await sql`SELECT name FROM contacts WHERE id = ${s1.json.contact_id as string}`;
  check("the newer name updates the contact", c2?.name === "Ayesha Rahman", String(c2?.name));

  const msgs = await sql`
    SELECT m.body FROM messages m
    JOIN conversations cv ON cv.id = m.conversation_id
    WHERE cv.client_id = ${a.clientId} ORDER BY m.created_at`;
  check("both messages are stored", msgs.length === 2, `${msgs.length}`);

  console.log("\nIsolation");
  const bContacts = await sql`SELECT count(*)::int AS n FROM contacts WHERE agency_id = ${b.id}`;
  check("the other agency gained nothing", bContacts[0].n === 0, `${bContacts[0].n}`);

  const crossed = await post("/api/v1/connector/submit", { email: "x@y.test" }, b.key.key);
  const landed = await sql`SELECT client_id FROM contacts WHERE id = ${crossed.json.contact_id as string}`;
  check(
    "agency B's key writes only into agency B",
    landed[0]?.client_id === b.clientId,
    `${landed[0]?.client_id} vs ${b.clientId}`,
  );

  console.log("\nAbuse");
  const hp = await post("/api/v1/connector/submit", { email: "bot@spam.test", hp: "i am a bot" }, a.key.key);
  const hpRows = await sql`SELECT count(*)::int AS n FROM contacts WHERE email = 'bot@spam.test'`;
  check("the honeypot answers 200 so the bot stops retrying", hp.status === 200);
  check("but nothing is written", hpRows[0].n === 0, `${hpRows[0].n}`);

  const empty = await post("/api/v1/connector/submit", {}, a.key.key);
  check("an empty submission is rejected", empty.status === 400);

  const badEmail = await post("/api/v1/connector/submit", { email: "not-an-email" }, a.key.key);
  check("a malformed email is rejected", badEmail.status === 400);

  const huge = await fetch(`${BASE}/api/v1/connector/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${a.key.key}` },
    body: JSON.stringify({ email: "big@x.test", message: "x".repeat(70_000) }),
  });
  check("an oversized body is rejected", huge.status === 413, `${huge.status}`);

  console.log("\nRate limit");
  await sql`UPDATE rate_limits SET count = 299 WHERE key = ${`submit:${a.siteId}`}`;
  const near = await post("/api/v1/connector/submit", { email: "near@limit.test" }, a.key.key);
  const over = await post("/api/v1/connector/submit", { email: "over@limit.test" }, a.key.key);
  check("the request at the limit still passes", near.status === 200, `${near.status}`);
  check("the next one is throttled", over.status === 429, `${over.status}`);
  check("and it says when to retry", typeof over.json.retry_after === "number");

  await sql`DELETE FROM agencies WHERE id IN (${a.id}, ${b.id})`;
  await sql`DELETE FROM rate_limits WHERE key LIKE ${`%${a.siteId}%`} OR key LIKE ${`%${b.siteId}%`}`;
  await sql.end();

  console.log();
  if (fail > 0) {
    console.log(`FAILED — ${fail} failed, ${pass} passed`);
    process.exit(1);
  }
  console.log(`connector ok — ${pass} checks passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
