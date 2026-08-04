import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { runChatTurn } from "@/lib/cep/chat-turn";
import type { CepWidgetSurface } from "@/lib/db/schema";

/**
 * POST /api/v1/connector/chat/stream
 *
 * SSE chat turn (CEP P1). Emits token events then a final `done` payload.
 * Transfer / handoff / lead_form paths emit a single done event (no tokens).
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
    action?: string;
    surface?: string;
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
    body.surface === "wizard" ? "wizard" : ("bubble" as CepWidgetSurface);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }

      try {
        send("status", { phase: "thinking" });

        const result = await runChatTurn({
          agencyId: identity.agencyId,
          clientId: identity.clientId,
          websiteId: identity.websiteId,
          message: String(body.message ?? ""),
          conversationId:
            typeof body.conversation_id === "string"
              ? body.conversation_id
              : null,
          email: body.email,
          name: body.name,
          phone: body.phone,
          action,
          surface,
        });

        if (!result.ok) {
          send("error", {
            message: result.error,
            conversation_id: result.conversationId ?? null,
          });
          controller.close();
          return;
        }

        // Progressive token reveal for AI replies (P1 streaming UX).
        // Real provider token streams land in a follow-up when WP SSE is stable.
        if (!result.skippedAi && result.reply) {
          const chunks = chunkText(result.reply, 12);
          let acc = "";
          for (const part of chunks) {
            acc += part;
            send("token", { text: part, accumulated: acc });
            await sleep(18);
          }
        }

        send("done", {
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
      } catch (e) {
        console.error("chat stream failed", e);
        send("error", { message: "Stream failed." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function chunkText(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    out.push(text.slice(i, i + size));
  }
  return out.length ? out : [text];
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
