import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { withAgency } from "@/lib/db";
import {
  formAnalyticsEvents,
  forms,
  type FormAnalyticsEventType,
  type FormUtmParams,
} from "@/lib/db/schema";
import {
  isAnalyticsEventType,
  normalizeAnalytics,
  normalizeUtm,
  utmHasValues,
} from "@/lib/forms/analytics";
import { and, eq, isNull } from "drizzle-orm";

const MAX_BODY_BYTES = 128 * 1024;
const MAX_BATCH = 40;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORM_NUMBER_RE = /^[1-9]\d{0,8}$/;

type Incoming = {
  type?: string;
  form_id?: string;
  session_id?: string;
  field_key?: string;
  step_id?: string;
  duration_ms?: number;
  page_url?: string;
  utm?: FormUtmParams;
};

/**
 * POST /api/v1/connector/form-analytics
 *
 * Batched funnel events from the embed (via the WP connector proxy).
 */
export async function POST(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  const { agencyId, clientId, websiteId } = identity;

  const limit = await rateLimit(
    `form-analytics:${websiteId}`,
    8_000,
    3600,
  );
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many events.", {
      retry_after: limit.retryAfterSeconds,
    });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return connectorError("too_large", 413, "Batch too large.");
  }

  let body: { events?: Incoming[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return connectorError("bad_request", 400, "Body must be JSON.");
  }

  const incoming = Array.isArray(body.events)
    ? body.events.slice(0, MAX_BATCH)
    : [];
  if (!incoming.length) {
    return connectorError("bad_request", 400, "No events in the batch.");
  }

  const formCache = new Map<
    string,
    { id: string; analyticsEnabled: boolean } | null
  >();

  async function resolveForm(
    rawId: string,
  ): Promise<{ id: string; analyticsEnabled: boolean } | null> {
    if (formCache.has(rawId)) return formCache.get(rawId)!;

    const row = await withAgency(agencyId, async (tx) => {
      if (UUID_RE.test(rawId)) {
        const [f] = await tx
          .select({ id: forms.id, settings: forms.settings })
          .from(forms)
          .where(
            and(
              eq(forms.id, rawId),
              eq(forms.clientId, clientId),
              isNull(forms.deletedAt),
            ),
          )
          .limit(1);
        return f ?? null;
      }
      if (FORM_NUMBER_RE.test(rawId)) {
        const [f] = await tx
          .select({ id: forms.id, settings: forms.settings })
          .from(forms)
          .where(
            and(
              eq(forms.formNumber, Number(rawId)),
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

    const resolved = row
      ? {
          id: row.id,
          analyticsEnabled: normalizeAnalytics(row.settings?.analytics)
            .enabled !== false,
        }
      : null;
    formCache.set(rawId, resolved);
    return resolved;
  }

  const rows: {
    agencyId: string;
    formId: string;
    websiteId: string;
    eventType: FormAnalyticsEventType;
    sessionId: string | null;
    fieldKey: string | null;
    stepId: string | null;
    durationMs: number | null;
    pageUrl: string | null;
    utm: FormUtmParams | null;
  }[] = [];

  for (const e of incoming) {
    if (!isAnalyticsEventType(e.type)) continue;
    const formIdRaw = str(e.form_id, 80);
    if (!formIdRaw) continue;
    const form = await resolveForm(formIdRaw);
    if (!form || !form.analyticsEnabled) continue;

    const utm = normalizeUtm(e.utm);
    rows.push({
      agencyId,
      formId: form.id,
      websiteId,
      eventType: e.type,
      sessionId: str(e.session_id, 80),
      fieldKey: str(e.field_key, 80),
      stepId: str(e.step_id, 80),
      durationMs:
        typeof e.duration_ms === "number" &&
        Number.isFinite(e.duration_ms) &&
        e.duration_ms >= 0
          ? Math.min(Math.round(e.duration_ms), 86_400_000)
          : null,
      pageUrl: str(e.page_url, 2000),
      utm: utmHasValues(utm) ? utm : null,
    });
  }

  if (!rows.length) {
    return Response.json({ status: "ok", accepted: 0 });
  }

  await withAgency(agencyId, (tx) =>
    tx.insert(formAnalyticsEvents).values(rows),
  );

  return Response.json({ status: "ok", accepted: rows.length });
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}
