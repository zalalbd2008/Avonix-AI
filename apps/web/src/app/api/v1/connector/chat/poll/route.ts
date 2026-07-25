import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { listMessagesAfter } from "@/lib/cep/cep-service";

/**
 * GET /api/v1/connector/chat/poll?conversation_id=&after=
 *
 * Visitor / WP polls for agent + system messages after a cursor (CEP P1 realtime).
 */
export async function GET(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversation_id")?.trim();
  if (!conversationId) {
    return connectorError("bad_request", 400, "conversation_id is required.");
  }

  const afterRaw = url.searchParams.get("after");
  const afterCreatedAt = afterRaw ? new Date(afterRaw) : null;
  if (afterRaw && Number.isNaN(afterCreatedAt?.getTime())) {
    return connectorError("bad_request", 400, "Invalid after timestamp.");
  }

  const result = await listMessagesAfter({
    agencyId: identity.agencyId,
    websiteId: identity.websiteId,
    conversationId,
    afterCreatedAt,
  });

  if (!result.conversation) {
    return connectorError("not_found", 404, "Conversation not found.");
  }

  // Only push non-visitor messages the visitor hasn't seen
  const messages = result.messages
    .filter((m) => m.author !== "visitor")
    .map((m) => ({
      id: m.id,
      author: m.author,
      body: m.body,
      blocks: m.blocks,
      created_at: m.createdAt.toISOString(),
    }));

  return Response.json({
    status: "ok",
    conversation_id: conversationId,
    handoff_status: result.conversation.handoffStatus,
    messages,
  });
}
