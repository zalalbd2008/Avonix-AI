import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { runChatTurn } from "@/lib/cep/chat-turn";
import type { CepWidgetSurface } from "@/lib/db/schema";

/**
 * POST /api/v1/connector/chat
 *
 * One turn of the CEP widget conversation (ADR-011 P1).
 */
export async function POST(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  const limit = await rateLimit(`chat:${identity.websiteId}`, 120, 3600);
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many messages right now.", {
      retry_after: limit.retryAfterSeconds,
    });
  }

  let body: {
    message?: string;
    conversation_id?: string;
    email?: string;
    name?: string;
    phone?: string;
    widget_id?: string;
    action?: string;
    surface?: string;
    attachment_name?: string;
    attachment_content?: string;
    attachment_encoding?: string;
  };
  try {
    body = await request.json();
  } catch {
    return connectorError("bad_request", 400, "Body must be JSON.");
  }

  const action =
    body.action === "transfer_agent" ||
    body.action === "start_form" ||
    body.action === "prechat_lead"
      ? body.action
      : null;
  const surface =
    body.surface === "wizard" ||
    body.surface === "sidebar" ||
    body.surface === "modal" ||
    body.surface === "fullscreen"
      ? (body.surface as CepWidgetSurface)
      : "bubble";

  const result = await runChatTurn({
    agencyId: identity.agencyId,
    clientId: identity.clientId,
    websiteId: identity.websiteId,
    message: String(body.message ?? ""),
    conversationId:
      typeof body.conversation_id === "string" ? body.conversation_id : null,
    email: body.email,
    name: body.name,
    phone: body.phone,
    action,
    surface,
    attachmentName: body.attachment_name,
    attachmentContent: body.attachment_content,
    attachmentEncoding:
      body.attachment_encoding === "base64" ? "base64" : "text",
  });

  if (!result.ok) {
    return Response.json(
      {
        error: "unavailable",
        message: result.error,
        conversation_id: result.conversationId ?? null,
      },
      { status: result.status },
    );
  }

  return Response.json({
    status: "ok",
    conversation_id: result.conversationId,
    message_id: result.messageId ?? null,
    created_at: result.createdAt ?? null,
    reply: result.reply,
    blocks: result.blocks,
    handoff_status: result.handoffStatus,
    provider: result.provider ?? null,
    model: result.model ?? null,
  });
}
