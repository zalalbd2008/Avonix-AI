/**
 * Exercises outbound delivery of agent replies.
 *
 * Uses the dev email transport, so it runs without a sending account — and the
 * file it writes is the proof the message really left the building.
 *
 *   npx tsx scripts/test-delivery.ts
 */
import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

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

function mailFiles() {
  try {
    return readdirSync(join(process.cwd(), ".mail"));
  } catch {
    return [];
  }
}

async function main() {
  const { eq, sql } = await import("drizzle-orm");
  const { db, withAgency } = await import("../src/lib/db");
  const { agencies, contacts, conversations, messages } = await import("../src/lib/db/schema");
  const { createClientForAgency } = await import("../src/lib/clients/service");
  const { replyToConversation } = await import("../src/lib/crm/service");
  const { deliverReply } = await import("../src/lib/crm/deliver");

  rmSync(join(process.cwd(), ".mail"), { recursive: true, force: true });

  const agencyId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.agency_id', ${agencyId}, true)`);
    await tx.insert(agencies).values({
      id: agencyId,
      name: "Delivery Test",
      slug: `delivery-${randomBytes(4).toString("hex")}`,
      plan: "professional",
    });
  });

  const created = await createClientForAgency(agencyId, {
    name: "Harbour Dental",
    contactEmail: "reception@harbourdental.test",
  });
  if (!created.ok) throw new Error("client creation failed");
  const clientId = created.clientId;

  async function makeThread(email: string | null) {
    const [contact] = await withAgency(agencyId, (tx) =>
      tx
        .insert(contacts)
        .values({ agencyId, clientId, name: "Farhana Islam", email, status: "new" })
        .returning({ id: contacts.id }),
    );
    const [conversation] = await withAgency(agencyId, (tx) =>
      tx
        .insert(conversations)
        .values({
          agencyId,
          clientId,
          contactId: contact.id,
          channel: email ? "form" : "chat",
          status: "open",
          lastMessageAt: new Date(),
        })
        .returning({ id: conversations.id }),
    );
    return conversation.id;
  }

  console.log("Delivering to a contact with an email");
  const withEmail = await makeThread("farhana@example.test");
  const reply = await replyToConversation(agencyId, withEmail, "Yes — Saturdays 9am to 1pm.");
  if (!reply.ok) throw new Error("reply failed");

  const outcome = await deliverReply(agencyId, reply.messageId);
  check("reports delivered", outcome.delivered, JSON.stringify(outcome));

  const [sent] = await withAgency(agencyId, (tx) =>
    tx
      .select({ delivery: messages.delivery, at: messages.deliveredAt, err: messages.deliveryError })
      .from(messages)
      .where(eq(messages.id, reply.messageId)),
  );
  check("marks the message sent", sent.delivery === "sent", sent.delivery);
  check("records when", Boolean(sent.at));
  check("clears any earlier error", sent.err === null);

  const files = mailFiles();
  check("an email was actually produced", files.length === 1, `${files.length} files`);

  const body = files.length ? readFileSync(join(process.cwd(), ".mail", files[0]), "utf8") : "";
  check("addressed to the contact", files[0]?.includes("farhana@example.test"), files[0] ?? "");
  check("carries the reply text", body.includes("Saturdays 9am to 1pm"));
  check(
    "branded as the client, not as Avonix",
    body.includes("Harbour Dental") && !body.includes("A reply from Avonix"),
  );

  console.log("\nUntrusted reply text");
  const xss = await replyToConversation(agencyId, withEmail, '<img src=x onerror="alert(1)">');
  if (!xss.ok) throw new Error("reply failed");
  await deliverReply(agencyId, xss.messageId);
  const latest = mailFiles().sort().at(-1)!;
  const xssBody = readFileSync(join(process.cwd(), ".mail", latest), "utf8");
  check("agent text is escaped, not injected", !xssBody.includes("onerror=\"alert(1)\""), "raw tag present");
  check("and is still readable as text", xssBody.includes("&lt;img"));

  console.log("\nNo address to send to");
  const noEmail = await makeThread(null);
  const note = await replyToConversation(agencyId, noEmail, "Internal note.");
  if (!note.ok) throw new Error("reply failed");

  const before = mailFiles().length;
  const noneOutcome = await deliverReply(agencyId, note.messageId);
  check("reports not delivered", !noneOutcome.delivered);
  check("says why", !noneOutcome.delivered && noneOutcome.reason.includes("No email"), JSON.stringify(noneOutcome));
  check("treats it as permanent, not retryable", !noneOutcome.delivered && noneOutcome.permanent);
  check("sends nothing", mailFiles().length === before);

  const [internal] = await withAgency(agencyId, (tx) =>
    tx
      .select({ delivery: messages.delivery, err: messages.deliveryError })
      .from(messages)
      .where(eq(messages.id, note.messageId)),
  );
  check(
    "marked not_applicable rather than failed",
    internal.delivery === "not_applicable",
    internal.delivery,
  );
  check("with a reason an agent can read", Boolean(internal.err));

  console.log("\nThe message survives a delivery failure");
  const [stillThere] = await withAgency(agencyId, (tx) =>
    tx.select({ body: messages.body }).from(messages).where(eq(messages.id, note.messageId)),
  );
  check("the text is still stored", stillThere.body === "Internal note.");

  console.log("\nIsolation");
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

  const beforeCross = mailFiles().length;
  const cross = await deliverReply(otherId, reply.messageId);
  check("another agency cannot deliver our message", !cross.delivered);
  check("and no email is sent on its behalf", mailFiles().length === beforeCross);

  await withAgency(agencyId, (tx) => tx.delete(agencies).where(eq(agencies.id, agencyId)));
  await withAgency(otherId, (tx) => tx.delete(agencies).where(eq(agencies.id, otherId)));
  rmSync(join(process.cwd(), ".mail"), { recursive: true, force: true });

  console.log();
  if (fail > 0) {
    console.log(`FAILED — ${fail} failed, ${pass} passed`);
    process.exit(1);
  }
  console.log(`delivery ok — ${pass} checks passed`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
