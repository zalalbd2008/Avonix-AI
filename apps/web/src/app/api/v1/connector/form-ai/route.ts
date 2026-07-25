import { and, eq, isNull } from "drizzle-orm";
import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { withAgency } from "@/lib/db";
import { forms } from "@/lib/db/schema";
import { normalizeAi, rewriteFormMessage } from "@/lib/forms/ai";

const MAX_BODY_BYTES = 16 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORM_NUMBER_RE = /^[1-9]\d{0,8}$/;

/**
 * POST /api/v1/connector/form-ai
 *
 * Embed-side rewrite / autofill for a visitor message (via WP connector proxy).
 */
export async function POST(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  const { agencyId, clientId, websiteId } = identity;

  const limit = await rateLimit(`form-ai:${websiteId}`, 60, 3600);
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many AI requests.", {
      retry_after: limit.retryAfterSeconds,
    });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return connectorError("too_large", 413, "Body too large.");
  }

  let body: {
    form_id?: string;
    message?: string;
    intent?: string;
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return connectorError("bad_request", 400, "Body must be JSON.");
  }

  const formIdRaw = typeof body.form_id === "string" ? body.form_id.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!formIdRaw || !message) {
    return connectorError("bad_request", 400, "form_id and message are required.");
  }

  const form = await withAgency(agencyId, async (tx) => {
    if (UUID_RE.test(formIdRaw)) {
      const [f] = await tx
        .select({ id: forms.id, name: forms.name, settings: forms.settings })
        .from(forms)
        .where(
          and(
            eq(forms.id, formIdRaw),
            eq(forms.clientId, clientId),
            isNull(forms.deletedAt),
          ),
        )
        .limit(1);
      return f ?? null;
    }
    if (FORM_NUMBER_RE.test(formIdRaw)) {
      const [f] = await tx
        .select({ id: forms.id, name: forms.name, settings: forms.settings })
        .from(forms)
        .where(
          and(
            eq(forms.formNumber, Number(formIdRaw)),
            eq(forms.websiteId, websiteId),
            eq(forms.clientId, clientId),
            isNull(forms.deletedAt),
          ),
        )
        .limit(1);
      return f ?? null;
    }
    return null;
  });

  if (!form) {
    return connectorError("not_found", 404, "Form not found.");
  }

  const ai = normalizeAi(form.settings?.ai);
  if (ai.enabled === false || !ai.autofill) {
    return connectorError("forbidden", 403, "AI rewrite is not enabled for this form.");
  }

  const result = await rewriteFormMessage({
    agencyId,
    formName: form.name,
    message,
    intent: typeof body.intent === "string" ? body.intent.slice(0, 120) : undefined,
  });

  if (!result.ok) {
    return connectorError("ai_unavailable", 503, result.error);
  }

  return Response.json({ status: "ok", text: result.text });
}
