/**
 * Exercises the CRM services: contact status, replies, and the pipeline.
 *
 *   npx tsx scripts/test-crm.ts
 */
import { randomBytes } from "node:crypto";
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

async function main() {
  const { eq, sql } = await import("drizzle-orm");
  const { db, withAgency } = await import("../src/lib/db");
  const { agencies, contacts, conversations, messages, pipelineCards } =
    await import("../src/lib/db/schema");
  const { createClientForAgency } = await import("../src/lib/clients/service");
  const {
    loadPipeline,
    moveContactToStage,
    replyToConversation,
    setContactStatus,
    setConversationStatus,
  } = await import("../src/lib/crm/service");

  // Two agencies, so every "can it reach across?" question has a real answer.
  const ids = [crypto.randomUUID(), crypto.randomUUID()];
  for (const id of ids) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.agency_id', ${id}, true)`);
      await tx.insert(agencies).values({
        id,
        name: "CRM test",
        slug: `crm-${randomBytes(4).toString("hex")}`,
        plan: "professional",
      });
    });
  }
  const [A, B] = ids;

  const created = await createClientForAgency(A, { name: "CRM Client" });
  if (!created.ok) throw new Error("client creation failed");
  const clientId = created.clientId;

  const [contact] = await withAgency(A, (tx) =>
    tx
      .insert(contacts)
      .values({ agencyId: A, clientId, name: "Lead One", email: "lead@one.test", status: "new" })
      .returning({ id: contacts.id }),
  );

  const [conversation] = await withAgency(A, (tx) =>
    tx
      .insert(conversations)
      .values({
        agencyId: A,
        clientId,
        contactId: contact.id,
        channel: "form",
        status: "open",
        lastMessageAt: new Date(),
      })
      .returning({ id: conversations.id }),
  );

  console.log("Contact status");
  check("moves to a valid status", (await setContactStatus(A, contact.id, "qualified")).ok);
  const [afterStatus] = await withAgency(A, (tx) =>
    tx.select({ status: contacts.status }).from(contacts).where(eq(contacts.id, contact.id)),
  );
  check("the change is persisted", afterStatus.status === "qualified", afterStatus.status);

  const crossStatus = await setContactStatus(B, contact.id, "won");
  check("another agency cannot change it", !crossStatus.ok, JSON.stringify(crossStatus));
  const [stillQualified] = await withAgency(A, (tx) =>
    tx.select({ status: contacts.status }).from(contacts).where(eq(contacts.id, contact.id)),
  );
  check("and the value is untouched", stillQualified.status === "qualified", stillQualified.status);

  console.log("\nReplies");
  check("rejects an empty reply", !(await replyToConversation(A, conversation.id, "   ")).ok);

  const first = await replyToConversation(A, conversation.id, "Thanks for getting in touch.");
  check("stores a reply", first.ok, JSON.stringify(first));

  const [afterFirst] = await withAgency(A, (tx) =>
    tx
      .select({ firstReply: conversations.firstHumanReplyAt })
      .from(conversations)
      .where(eq(conversations.id, conversation.id)),
  );
  check("stamps the first human reply", Boolean(afterFirst.firstReply));

  const stamp = afterFirst.firstReply;
  await new Promise((r) => setTimeout(r, 25));
  await replyToConversation(A, conversation.id, "One more thing.");
  const [afterSecond] = await withAgency(A, (tx) =>
    tx
      .select({ firstReply: conversations.firstHumanReplyAt })
      .from(conversations)
      .where(eq(conversations.id, conversation.id)),
  );
  check(
    "a second reply does not move that stamp",
    afterSecond.firstReply?.getTime() === stamp?.getTime(),
    `${String(afterSecond.firstReply)} vs ${String(stamp)}`,
  );

  const stored = await withAgency(A, (tx) =>
    tx.select({ author: messages.author }).from(messages).where(eq(messages.conversationId, conversation.id)),
  );
  check("both replies are stored as agent messages", stored.length === 2 && stored.every((m) => m.author === "agent"), `${stored.length}`);

  check("another agency cannot reply", !(await replyToConversation(B, conversation.id, "hello")).ok);

  console.log("\nConversation status");
  check("closes", (await setConversationStatus(A, conversation.id, "closed")).ok);
  check("reopens", (await setConversationStatus(A, conversation.id, "open")).ok);

  console.log("\nPipeline");
  const board = await loadPipeline(A, clientId);
  check("the client has a pipeline with four stages", board?.stages.length === 4, `${board?.stages.length}`);

  const [newStage, contactedStage] = board!.stages;
  check("placing a contact works", (await moveContactToStage(A, contact.id, newStage.id)).ok);

  const afterPlace = await loadPipeline(A, clientId);
  check("the card lands in the first stage", afterPlace!.stages[0].cards.length === 1);

  check("moving it works", (await moveContactToStage(A, contact.id, contactedStage.id)).ok);
  const afterMove = await loadPipeline(A, clientId);
  check("the first stage is now empty", afterMove!.stages[0].cards.length === 0);
  check("and the second holds it", afterMove!.stages[1].cards.length === 1);

  const cardRows = await withAgency(A, (tx) =>
    tx.select({ id: pipelineCards.id }).from(pipelineCards).where(eq(pipelineCards.contactId, contact.id)),
  );
  check("moving does not duplicate the card", cardRows.length === 1, `${cardRows.length}`);

  check("another agency cannot move it", !(await moveContactToStage(B, contact.id, newStage.id)).ok);
  check("the other agency sees no pipeline for this client", (await loadPipeline(B, clientId)) === null);

  for (const id of ids) {
    await withAgency(id, (tx) => tx.delete(agencies).where(eq(agencies.id, id)));
  }

  console.log();
  if (fail > 0) {
    console.log(`FAILED — ${fail} failed, ${pass} passed`);
    process.exit(1);
  }
  console.log(`crm ok — ${pass} checks passed`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
