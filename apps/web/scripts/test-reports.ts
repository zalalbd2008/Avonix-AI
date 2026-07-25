/**
 * Exercises activity tracking and public report links.
 *
 * Two things carry real risk here and both are covered below:
 *
 *   1. `/api/v1/connector/events` writes rows attributed to a tenant, from a
 *      request that arrives with only a key.
 *   2. `/r/{slug}` serves data with no session at all, from a table that is
 *      exempt from row-level security.
 *
 *   npm run dev            # in another terminal
 *   npx tsx scripts/test-reports.ts
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

async function main() {
  const { eq, sql } = await import("drizzle-orm");
  const { db, withAgency } = await import("../src/lib/db");
  const { agencies, trackedEvents } = await import("../src/lib/db/schema");
  const { createClientForAgency } = await import("../src/lib/clients/service");
  const { createWebsiteForClient } = await import("../src/lib/websites/service");
  const { loadReport } = await import("../src/lib/reports/service");
  const { ensureShare, resolveShare, getShare } = await import("../src/lib/reports/share");
  const { maskIp, parseUserAgent } = await import("../src/lib/reports/user-agent");

  const stamp = randomBytes(4).toString("hex");

  async function makeAgency(name: string) {
    const id = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.agency_id', ${id}, true)`);
      await tx.insert(agencies).values({ id, name, slug: `${name}-${stamp}`, plan: "professional" });
    });
    return id;
  }

  const agencyA = await makeAgency("repa");
  const agencyB = await makeAgency("repb");

  const clientA = await createClientForAgency(agencyA, { name: "Harbour Dental" });
  const clientB = await createClientForAgency(agencyB, { name: "Other Client" });
  if (!clientA.ok || !clientB.ok) throw new Error("client creation failed");

  const siteA = await createWebsiteForClient(agencyA, clientA.clientId, {
    name: "Main",
    url: "https://harbourdental.test",
  });
  const siteB = await createWebsiteForClient(agencyB, clientB.clientId, {
    name: "Theirs",
    url: "https://theirs.test",
  });
  if (!siteA.ok || !siteB.ok) throw new Error("website creation failed");

  const websiteA = siteA.websiteId;
  const keyA = siteA.connectorKey;
  const websiteB = siteB.websiteId;

  console.log("User-agent parsing");
  const chrome = parseUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  );
  check("chrome is not reported as safari", chrome.browser === "Chrome", `${chrome.browser}`);
  const edge = parseUserAgent("Mozilla/5.0 Chrome/120 Safari/537.36 Edg/120");
  check("edge is not reported as chrome", edge.browser === "Edge", `${edge.browser}`);
  const iphone = parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari");
  check("an iphone is a mobile", iphone.device === "Mobile", `${iphone.device}`);
  check("no user-agent yields nulls, not guesses", parseUserAgent(null).browser === null);

  console.log("\nIP masking");
  check("ipv4 loses its last octet", maskIp("203.0.113.42") === "203.0.113.…", maskIp("203.0.113.42"));
  check("ipv6 is truncated", maskIp("2001:db8:85a3:1:2:3:4:5").startsWith("2001:db8:85a3:1:"));
  check("a missing address is a dash", maskIp(null) === "—");

  console.log("\nEvent ingest");
  async function send(body: unknown, key = keyA) {
    const res = await fetch(`${BASE}/api/v1/connector/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "User-Agent": "Mozilla/5.0 (Macintosh) Chrome/120 Safari/537.36",
      },
      body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  }

  check("a bad key is rejected", (await send({ events: [] }, `avx_${"0".repeat(40)}`)).status === 401);
  check("an empty batch is rejected", (await send({ events: [] })).status === 400);
  check(
    "an unknown event type is rejected",
    (await send({ events: [{ type: "keylogger", page_path: "/" }] })).status === 400,
  );

  const accepted = await send({
    events: [
      { type: "pageview", page_path: "/" },
      { type: "pageview", page_path: "/" },
      { type: "pageview", page_path: "/pricing" },
      {
        type: "button",
        css_class: "avx-track-book",
        label: "Book appointment",
        purpose: "Appointment booking",
        page_path: "/pricing",
      },
      { type: "consultation", css_class: "avx-consult-call", label: "Call now", page_path: "/" },
    ],
  });
  check("a valid batch is accepted", accepted.status === 200, JSON.stringify(accepted.json));
  check("and reports how many it took", accepted.json.accepted === 5, JSON.stringify(accepted.json));

  const stored = await withAgency(agencyA, (tx) =>
    tx.select().from(trackedEvents).where(eq(trackedEvents.websiteId, websiteA)),
  );
  check("every event was stored", stored.length === 5, `${stored.length}`);
  check(
    "the browser was derived server-side",
    stored.every((r) => r.browser === "Chrome"),
    JSON.stringify(stored.map((r) => r.browser)),
  );
  check(
    "the marker class survives",
    stored.some((r) => r.cssClass === "avx-track-book"),
  );

  const fromB = await withAgency(agencyB, (tx) =>
    tx.select().from(trackedEvents).where(eq(trackedEvents.websiteId, websiteA)),
  );
  check("another agency cannot read these events", fromB.length === 0, `${fromB.length}`);

  console.log("\nReport figures");
  const report = await loadReport(agencyA, websiteA, 30);
  check("the report loads", report !== null);
  check("page views are counted", report?.totals.pageviews === 3, `${report?.totals.pageviews}`);
  check("buttons are counted separately", report?.totals.buttons === 1, `${report?.totals.buttons}`);
  check("consultations too", report?.totals.consultations === 1, `${report?.totals.consultations}`);
  check(
    "top pages are ranked by views",
    report?.topPages[0]?.pagePath === "/" && report?.topPages[0]?.views === 2,
    JSON.stringify(report?.topPages),
  );
  check(
    "conversion rate is null with no leads rather than 0%",
    report?.conversionRate === 0 || report?.conversionRate === null,
    `${report?.conversionRate}`,
  );

  const crossReport = await loadReport(agencyB, websiteA, 30);
  check("another agency gets nothing for this website", crossReport === null);

  console.log("\nShare links");
  const share = await ensureShare(agencyA, websiteA, "tester");
  check("a link is created", Boolean(share?.slug), JSON.stringify(share));
  check("the slug is not guessable from the name", /-[0-9a-f]{6}$/.test(share!.slug), share!.slug);
  check("IPs are masked by default", share?.maskIps === true);

  const again = await ensureShare(agencyA, websiteA, "tester");
  check("creating twice returns the same link", again?.slug === share?.slug, `${again?.slug}`);

  const foreign = await ensureShare(agencyB, websiteA, "tester");
  check(
    "another agency cannot mint a link for this website",
    foreign === null,
    JSON.stringify(foreign),
  );

  const resolved = await resolveShare(share!.slug);
  check("the slug resolves to its own tenant", resolved?.agencyId === agencyA, `${resolved?.agencyId}`);
  check("and to its own website", resolved?.websiteId === websiteA);
  check("an unknown slug resolves to nothing", (await resolveShare("nope-000000")) === null);

  console.log("\nThe public page");
  async function publicPage(slug: string) {
    const res = await fetch(`${BASE}/r/${slug}`, { redirect: "manual" });
    return { status: res.status, body: await res.text() };
  }

  const live = await publicPage(share!.slug);
  check("a live link renders without a session", live.status === 200, `${live.status}`);
  check("it shows the website's own figures", live.body.includes("Main"), "website name missing");
  check(
    "visitor addresses are masked on it",
    !live.body.includes("203.0.113.42"),
    "a full IP address reached the public page",
  );

  const { reportShares } = await import("../src/lib/db/schema");
  await withAgency(agencyA, (tx) =>
    tx.update(reportShares).set({ enabled: false }).where(eq(reportShares.id, share!.id)),
  );

  const off = await publicPage(share!.slug);
  check("a disabled link 404s", off.status === 404, `${off.status}`);
  check(
    "and leaks nothing on the way",
    !off.body.includes("Harbour Dental"),
    "client name rendered on a disabled link",
  );

  const stillThere = await getShare(agencyA, websiteA);
  check("but the slug is kept for turning back on", stillThere?.slug === share!.slug);

  for (const id of [agencyA, agencyB]) {
    await withAgency(id, (tx) => tx.delete(agencies).where(eq(agencies.id, id)));
  }

  console.log();
  if (fail > 0) {
    console.log(`FAILED — ${fail} failed, ${pass} passed`);
    process.exit(1);
  }
  console.log(`reports ok — ${pass} checks passed`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
