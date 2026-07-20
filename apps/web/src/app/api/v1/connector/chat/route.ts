import { eq } from "drizzle-orm";
import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { answerVisitor, chatConversation } from "@/lib/ai/chat";
import { withAgency } from "@/lib/db";
import { clients, contacts, conversations, messages } from "@/lib/db/schema";

const MAX_QUESTION = 2000;

/**
 * POST /api/v1/connector/chat
 *
 * One turn of the widget conversation. Public and AI-backed, so it is the most
 * expensive endpoint to leave unguarded — every accepted request costs money.
 */
export async function POST(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  // Tighter than form submission: each of these calls two paid APIs.
  const limit = await rateLimit(`chat:${identity.websiteId}`, 120, 3600);
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many messages right now.", {
      retry_after: limit.retryAfterSeconds,
    });
  }

  let body: { message?: string; conversation_id?: string; email?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return connectorError("bad_request", 400, "Body must be JSON.");
  }

  const question = String(body.message ?? "").trim().slice(0, MAX_QUESTION);
  if (!question) {
    return connectorError("bad_request", 400, "Message was empty.");
  }

  const [client] = await withAgency(identity.agencyId, (tx) =>
    tx
      .select({ name: clients.name })
      .from(clients)
      .where(eq(clients.id, identity.clientId))
      .limit(1),
  );

  const conversationId = await chatConversation(
    identity.agencyId,
    identity.clientId,
    identity.websiteId,
    typeof body.conversation_id === "string" ? body.conversation_id : null,
  );

  // Store the question before answering. If the model call fails, the agency
  // still sees that somebody asked — an unanswered question is a lead, and
  // losing it because an API was down is the failure that matters.
  await withAgency(identity.agencyId, (tx) =>
    tx.insert(messages).values({
      agencyId: identity.agencyId,
      conversationId,
      author: "visitor",
      body: question,
    }),
  );

  // The widget captures contact details when the assistant asks for them; that
  // is the whole point of the channel, so it is handled before the reply.
  const email = String(body.email ?? "").trim().toLowerCase();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    await linkVisitor(identity, conversationId, email, String(body.name ?? "").trim());
  }

  const result = await answerVisitor({
    agencyId: identity.agencyId,
    clientId: identity.clientId,
    websiteId: identity.websiteId,
    conversationId,
    clientName: client?.name ?? "this business",
    question,
  });

  await withAgency(identity.agencyId, (tx) =>
    tx
      .update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, conversationId)),
  );

  if (!result.ok) {
    return Response.json(
      { error: "unavailable", message: result.error, conversation_id: conversationId },
      { status: result.status },
    );
  }

  await withAgency(identity.agencyId, (tx) =>
    tx.insert(messages).values({
      agencyId: identity.agencyId,
      conversationId,
      author: "ai",
      body: result.reply,
      model: "claude-sonnet-5",
    }),
  );

  return Response.json({
    status: "ok",
    conversation_id: conversationId,
    reply: result.reply,
  });
}

/** Attach a contact to the thread, deduping on (client, email) as everywhere else. */
async function linkVisitor(
  identity: { agencyId: string; clientId: string; websiteId: string },
  conversationId: string,
  email: string,
  name: string,
) {
  await withAgency(identity.agencyId, async (tx) => {
    const [existing] = await tx
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.email, email))
      .limit(1);

    let contactId = existing?.id;

    if (!contactId) {
      const [created] = await tx
        .insert(contacts)
        .values({
          agencyId: identity.agencyId,
          clientId: identity.clientId,
          sourceWebsiteId: identity.websiteId,
          email,
          name: name || null,
          status: "new",
        })
        .returning({ id: contacts.id });
      contactId = created.id;
    }

    await tx
      .update(conversations)
      .set({ contactId })
      .where(eq(conversations.id, conversationId));
  });
}
