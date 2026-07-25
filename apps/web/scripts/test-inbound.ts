/**
 * Exercises inbound email: a visitor's reply coming back into the thread.
 *
 * Public endpoint, so the tests are adversarial — forged posts, unknown tokens,
 * loops, replays, and someone else's thread.
 *
 *   npm run dev            # in another terminal
 *   npx tsx scripts/test-inbound.ts
 */
import { randomBytes } from "node:crypto";
import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const SECRET = process.env.INBOUND_WEBHOOK_SECRET!;

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

/** A Postmark inbound payload, shaped the way they actually send it. */
function postmarkPayload(opts: {
  token: string | null;
  from?: string;
  fromName?: string;
  text?: string;
  stripped?: string;
  subject?: string;
  messageId?: string;
  headers?: { Name: string; Value: string }[];
}) {
  const to = opts.token
    ? `reply+${opts.token}@inbound.localhost.test`
    : "reply@inbound.localhost.test";
  return {
    MessageID: opts.messageId ?? randomBytes(8).toString("hex"),
    From: opts.from ?? "farhana@example.test",
    FromName: opts.fromName ?? "Farhana Islam",
    FromFull: { Email: opts.from ?? "farhana@example.test", Name: opts.fromName ?? "Farhana Islam" },
    ToFull: [{ Email: to, Name: "", MailboxHash: opts.token ?? "" }],
    Subject: opts.subject ?? "Re: your enquiry — Harbour Dental",
    TextBody: opts.text ?? "Saturday at 10 works for me.\n\nOn Mon, Avonix wrote:\n> Yes — Saturdays 9am to 1pm.",
    StrippedTextReply: opts.stripped,
    Headers: opts.headers ?? [],
  };
}

async function postInbound(body: unknown, secret: string | null = SECRET) {
  const url = secret ? `${BASE}/api/v1/inbound/email?secret=${secret}` : `${BASE}/api/v1/inbound/email`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

async function main() {
  const { eq, sql } = await import("drizzle-orm");
  const { db, withAgency } = await import("../src/lib/db");
  const { agencies, contacts, conversations, messages, replyTokens } = await import("../src/lib/db/schema");
  const { createClientForAgency } = await import("../src/lib/clients/service");
  const { replyToConversation } = await import("../src/lib/crm/service");
  const { deliverReply } = await import("../src/lib/crm/deliver");

  rmSync(join(process.cwd(), ".mail"), { recursive: true, force: true });

  const agencyId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.agency_id', ${agencyId}, true)`);
    await tx.insert(agencies).values({
      id: agencyId,
      name: "Inbound Test",
      slug: `inbound-${randomBytes(4).toString("hex")}`,
      plan: "professional",
    });
  });

  const created = await createClientForAgency(agencyId, {
    name: "Harbour Dental",
    contactEmail: "reception@harbourdental.test",
  });
  if (!created.ok) throw new Error("client creation failed");

  const [contact] = await withAgency(agencyId, (tx) =>
    tx
      .insert(contacts)
      .values({
        agencyId,
        clientId: created.clientId,
        email: "farhana@example.test",
        status: "new",
      })
      .returning({ id: contacts.id }),
  );

  const [conversation] = await withAgency(agencyId, (tx) =>
    tx
      .insert(conversations)
      .values({
        agencyId,
        clientId: created.clientId,
        contactId: contact.id,
        channel: "form",
        status: "open",
        lastMessageAt: new Date(),
      })
      .returning({ id: conversations.id }),
  );

  console.log("Reply-To carries a routable address");
  const outbound = await replyToConversation(agencyId, conversation.id, "Yes — Saturdays 9am to 1pm.");
  if (!outbound.ok) throw new Error("reply failed");
  await deliverReply(agencyId, outbound.messageId);

  const [withToken] = await withAgency(agencyId, (tx) =>
    tx
      .select({ token: replyTokens.token })
      .from(replyTokens)
      .where(eq(replyTokens.conversationId, conversation.id)),
  );
  check("a reply token is minted on first outbound", Boolean(withToken?.token));

  const mailFile = readdirSync(join(process.cwd(), ".mail"))[0];
  check("the outbound email exists", Boolean(mailFile));

  const token = withToken!.token;

  console.log("\nAuthentication");
  check("no secret is rejected", (await postInbound(postmarkPayload({ token }), null)).status === 401);
  check("a wrong secret is rejected", (await postInbound(postmarkPayload({ token }), "wrong-secret")).status === 401);

  console.log("\nA real reply");
  const good = await postInbound(postmarkPayload({ token }));
  check("is accepted", good.status === 200 && good.json.status === "ok", JSON.stringify(good.json));

  const thread = await withAgency(agencyId, (tx) =>
    tx
      .select({ author: messages.author, body: messages.body })
      .from(messages)
      .where(eq(messages.conversationId, conversation.id)),
  );
  const visitorMessages = thread.filter((m) => m.author === "visitor");
  check("lands in the thread as the visitor", visitorMessages.length === 1, `${visitorMessages.length}`);
  check(
    "quoted history is stripped",
    visitorMessages[0]?.body === "Saturday at 10 works for me.",
    JSON.stringify(visitorMessages[0]?.body),
  );

  const [named] = await withAgency(agencyId, (tx) =>
    tx.select({ name: contacts.name }).from(contacts).where(eq(contacts.id, contact.id)),
  );
  check("a missing contact name is filled in", named.name === "Farhana Islam", String(named.name));

  console.log("\nReopening");
  await withAgency(agencyId, (tx) =>
    tx.update(conversations).set({ status: "closed" }).where(eq(conversations.id, conversation.id)),
  );
  await postInbound(postmarkPayload({ token, text: "One more question." }));
  const [reopened] = await withAgency(agencyId, (tx) =>
    tx.select({ status: conversations.status }).from(conversations).where(eq(conversations.id, conversation.id)),
  );
  check("a closed thread reopens", reopened.status === "open", reopened.status);

  console.log("\nDuplicates and loops");
  const dupeId = randomBytes(8).toString("hex");
  await postInbound(postmarkPayload({ token, messageId: dupeId, text: "Sent twice." }));
  const before = (await countVisitor()).length;
  await postInbound(postmarkPayload({ token, messageId: dupeId, text: "Sent twice." }));
  check("a retried delivery is not stored twice", (await countVisitor()).length === before, "duplicate stored");

  const autoBefore = (await countVisitor()).length;
  await postInbound(
    postmarkPayload({
      token,
      text: "I am on leave until Monday.",
      headers: [{ Name: "Auto-Submitted", Value: "auto-replied" }],
    }),
  );
  check("an auto-reply header is ignored", (await countVisitor()).length === autoBefore);

  await postInbound(postmarkPayload({ token, subject: "Out of Office", text: "Away." }));
  check("an out-of-office subject is ignored", (await countVisitor()).length === autoBefore);

  await postInbound(postmarkPayload({ token, text: "   ", stripped: "   " }));
  check("an empty body is ignored", (await countVisitor()).length === autoBefore);

  console.log("\nUnknown and forged tokens");
  const unknown = await postInbound(postmarkPayload({ token: randomBytes(16).toString("hex") }));
  check("an unknown token is not an error", unknown.status === 202, `${unknown.status}`);
  check("and stores nothing", (await countVisitor()).length === autoBefore);

  const noToken = await postInbound(postmarkPayload({ token: null }));
  check("a message with no token is rejected", noToken.status === 422, `${noToken.status}`);

  console.log("\nAnother agency's thread");
  const otherId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.agency_id', ${otherId}, true)`);
    await tx.insert(agencies).values({
      id: otherId,
      name: "Other",
      slug: `other-${randomBytes(4).toString("hex")}`,
      plan: "professional",
    });
  });
  const otherClient = await createClientForAgency(otherId, { name: "Other Client" });
  if (!otherClient.ok) throw new Error("client creation failed");

  const otherVisible = await withAgency(otherId, (tx) =>
    tx.select({ id: messages.id }).from(messages).where(eq(messages.conversationId, conversation.id)),
  );
  check("the other agency cannot read this thread", otherVisible.length === 0, `${otherVisible.length}`);

  await withAgency(agencyId, (tx) => tx.delete(agencies).where(eq(agencies.id, agencyId)));
  await withAgency(otherId, (tx) => tx.delete(agencies).where(eq(agencies.id, otherId)));
  rmSync(join(process.cwd(), ".mail"), { recursive: true, force: true });

  console.log();
  if (fail > 0) {
    console.log(`FAILED — ${fail} failed, ${pass} passed`);
    process.exit(1);
  }
  console.log(`inbound ok — ${pass} checks passed`);

  async function countVisitor() {
    const rows = await withAgency(agencyId, (tx) =>
      tx
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.conversationId, conversation.id)),
    );
    return rows;
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
