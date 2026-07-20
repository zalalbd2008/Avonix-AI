import { timingSafeEqual } from "node:crypto";
import { appendInboundEmail } from "@/lib/crm/inbound";
import { rateLimit } from "@/lib/connector/rate-limit";
import { parseInbound } from "@/lib/email/inbound";

const MAX_BODY_BYTES = 1024 * 1024; // inbound mail carries quoted history

/**
 * POST /api/v1/inbound/email
 *
 * Where a visitor's emailed reply comes back in. Public, so it is treated the
 * same way as the connector endpoints: authenticated, rate limited, size
 * capped, and silent about what it knows.
 *
 * Neither Postmark nor Resend signs inbound payloads the way Stripe signs
 * webhooks, so the guard is a shared secret configured on the provider — in the
 * URL for Postmark, as a header for Resend. Without INBOUND_WEBHOOK_SECRET set,
 * the route refuses everything rather than accepting anonymous mail.
 */
export async function POST(request: Request) {
  const expected = process.env.INBOUND_WEBHOOK_SECRET;
  if (!expected) {
    console.error("inbound: INBOUND_WEBHOOK_SECRET is not set — rejecting");
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const presented =
    request.headers.get("x-avonix-inbound-secret") ?? url.searchParams.get("secret") ?? "";

  if (!secretsMatch(expected, presented)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit("inbound:email", 1000, 3600);
  if (!limit.ok) {
    return Response.json(
      { error: "rate_limited", retry_after: limit.retryAfterSeconds },
      { status: 429 },
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: "too_large" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = await parseInbound(payload, request.headers);
  if (!parsed) {
    console.error("inbound: no adapter recognised the payload");
    // 200 so the provider does not retry a payload no version of this code can
    // read; the log is where this gets noticed.
    return Response.json({ status: "unrecognised" }, { status: 200 });
  }

  const result = await appendInboundEmail(parsed.email);

  if (!result.ok) {
    // These carry 2xx on purpose. An unknown or expired thread is not a
    // transport failure, and answering 4xx would make the provider retry for
    // hours and, over time, reveal which tokens are live.
    return Response.json(
      { status: "ignored", reason: result.reason },
      { status: result.status },
    );
  }

  return Response.json({
    status: "ok",
    conversation_id: result.conversationId,
  });
}

function secretsMatch(expected: string, presented: string) {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(presented, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
