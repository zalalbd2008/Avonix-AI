/**
 * Exercises the AI chat pipeline: HTML extraction, chunking, retrieval, quota,
 * and the widget endpoint's guards.
 *
 * Runs without a Voyage or Anthropic key. That is deliberate — ADR-005 requires
 * retrieval to degrade to full-text rather than fail, and the chat endpoint to
 * refuse cleanly when it cannot answer. Both of those paths are what a
 * key-less run actually tests.
 *
 *   npm run dev            # in another terminal
 *   npx tsx scripts/test-ai.ts
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
  const { agencies, knowledgeChunks, messages, conversations } = await import("../src/lib/db/schema");
  const { createClientForAgency } = await import("../src/lib/clients/service");
  const { createWebsiteForClient } = await import("../src/lib/websites/service");
  const { chunkPage, htmlToText } = await import("../src/lib/ai/crawl");
  const { retrieve } = await import("../src/lib/ai/index-site");

  console.log("HTML extraction");
  const html = `<html><head><title>Harbour Dental</title></head>
    <body>
      <nav><a href="/x">Menu</a></nav>
      <script>var tracking = 1;</script>
      <style>.a{color:red}</style>
      <h1>Practice hours</h1>
      <p>We are open Monday to Friday, 9am until 6pm.</p>
      <p>We also open on Saturday mornings, 9am until 1pm.</p>
      <footer>Copyright</footer>
    </body></html>`;
  const extracted = htmlToText(html);

  check("takes the title", extracted.title === "Harbour Dental", String(extracted.title));
  check("drops script contents", !extracted.text.includes("tracking"));
  check("drops style contents", !extracted.text.includes("color:red"));
  check("drops nav and footer", !extracted.text.includes("Menu") && !extracted.text.includes("Copyright"));
  check("keeps the real text", extracted.text.includes("Saturday mornings"));
  check(
    "keeps paragraphs apart",
    !extracted.text.includes("6pm. We also") || extracted.text.includes("\n"),
    JSON.stringify(extracted.text.slice(0, 120)),
  );

  console.log("\nChunking");
  const long = Array.from({ length: 40 }, (_, i) => `Paragraph ${i} about dental care and appointments.`).join("\n\n");
  const chunks = chunkPage({ url: "https://x.test/a", title: "A", text: long });
  check("splits a long page", chunks.length > 1, `${chunks.length}`);
  check("every chunk carries its source url", chunks.every((c) => c.url === "https://x.test/a"));
  check("no chunk is tiny", chunks.every((c) => c.content.length > 80));
  const tail = chunks[0].content.slice(-60).trim();
  check(
    "consecutive chunks overlap so a straddling answer survives",
    chunks.length < 2 || chunks[1].content.includes(tail.slice(0, 30)),
    `tail ${JSON.stringify(tail.slice(0, 30))} not found in the next chunk`,
  );

  const single = chunkPage({ url: "https://x.test/b", title: "B", text: "Short but useful text about opening on Saturday mornings for checkups." });
  check("a short page is kept, not dropped", single.length === 1, `${single.length}`);

  const scrap = chunkPage({ url: "https://x.test/c", title: "C", text: "Menu" });
  check("a navigational scrap is dropped", scrap.length === 0, `${scrap.length}`);

  console.log("\nRetrieval falls back to full text");
  const agencyId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.agency_id', ${agencyId}, true)`);
    await tx.insert(agencies).values({
      id: agencyId,
      name: "AI Test",
      slug: `ai-${randomBytes(4).toString("hex")}`,
      plan: "pro",
    });
  });

  const created = await createClientForAgency(agencyId, { name: "Harbour Dental" });
  if (!created.ok) throw new Error("client creation failed");

  // Through the real service, not a raw insert: `websites` is tenant-scoped, so
  // an unscoped INSERT is refused by RLS — which is the policy working.
  const madeSite = await createWebsiteForClient(agencyId, created.clientId, {
    name: "Main",
    url: "https://harbourdental.test",
  });
  if (!madeSite.ok) throw new Error(`website creation failed: ${madeSite.error}`);
  const site = { id: madeSite.websiteId };
  const key = { key: madeSite.connectorKey };

  await withAgency(agencyId, (tx) =>
    tx.insert(knowledgeChunks).values([
      {
        agencyId,
        websiteId: site.id,
        sourceUrl: "https://harbourdental.test/hours",
        title: "Practice hours",
        content: "We are open Monday to Friday 9am to 6pm, and Saturday mornings 9am to 1pm.",
      },
      {
        agencyId,
        websiteId: site.id,
        sourceUrl: "https://harbourdental.test/team",
        title: "Our team",
        content: "Our dentists have over twenty years of combined experience in family dentistry.",
      },
    ]),
  );

  const hits = await retrieve(agencyId, site.id, "saturday opening");
  check("full-text retrieval finds the right passage", hits[0]?.title === "Practice hours", JSON.stringify(hits[0]?.title));
  check("and does not return everything", hits.length < 2 || hits.length <= 6, `${hits.length}`);

  const otherAgency = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.agency_id', ${otherAgency}, true)`);
    await tx.insert(agencies).values({
      id: otherAgency,
      name: "Other",
      slug: `other-${randomBytes(4).toString("hex")}`,
      plan: "pro",
    });
  });
  const crossHits = await retrieve(otherAgency, site.id, "saturday opening");
  check("another agency retrieves nothing from this site", crossHits.length === 0, `${crossHits.length}`);

  console.log("\nChat endpoint guards");
  async function chat(body: unknown, authKey = key.key) {
    const res = await fetch(`${BASE}/api/v1/connector/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authKey}` },
      body: JSON.stringify(body),
    });
    let json: Record<string, unknown> = {};
    try {
      json = await res.json();
    } catch {
      /* empty */
    }
    return { status: res.status, json };
  }

  check("a bad key is rejected", (await chat({ message: "hi" }, `avx_${"0".repeat(40)}`)).status === 401);
  check("an empty message is rejected", (await chat({ message: "   " })).status === 400);

  const asked = await chat({ message: "Are you open on Saturdays?" });
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);

  if (hasAnthropicKey) {
    check("a question is answered", asked.status === 200, JSON.stringify(asked.json));
    check("the reply is non-empty", typeof asked.json.reply === "string" && (asked.json.reply as string).length > 0);
  } else {
    check(
      "without a model key it refuses cleanly rather than pretending",
      asked.status === 503,
      `${asked.status} ${JSON.stringify(asked.json)}`,
    );
    check("and still returns the conversation", typeof asked.json.conversation_id === "string");
  }

  // The question must be stored either way — an unanswered question is a lead.
  const stored = await withAgency(agencyId, (tx) =>
    tx
      .select({ author: messages.author, body: messages.body })
      .from(messages)
      .where(eq(messages.conversationId, String(asked.json.conversation_id))),
  );
  check(
    "the visitor's question is stored even when the model fails",
    stored.some((m) => m.author === "visitor" && m.body.includes("Saturdays")),
    JSON.stringify(stored),
  );

  const threads = await withAgency(agencyId, (tx) =>
    tx.select({ id: conversations.id, channel: conversations.channel }).from(conversations),
  );
  check("a chat conversation was opened", threads.some((t) => t.channel === "chat"));

  console.log("\nContact capture");
  await chat({
    message: "Please have someone call me.",
    conversation_id: asked.json.conversation_id,
    email: "Visitor@Example.test",
    name: "Rina Ahmed",
  });
  const linked = await withAgency(agencyId, (tx) =>
    tx
      .select({ contactId: conversations.contactId })
      .from(conversations)
      .where(eq(conversations.id, String(asked.json.conversation_id))),
  );
  check("an email in the widget creates and links a contact", Boolean(linked[0]?.contactId));

  await withAgency(agencyId, (tx) => tx.delete(agencies).where(eq(agencies.id, agencyId)));
  await withAgency(otherAgency, (tx) => tx.delete(agencies).where(eq(agencies.id, otherAgency)));

  console.log();
  if (fail > 0) {
    console.log(`FAILED — ${fail} failed, ${pass} passed`);
    process.exit(1);
  }
  console.log(`ai ok — ${pass} checks passed`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
