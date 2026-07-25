import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { withAgency } from "@/lib/db";
import { trackedEvents } from "@/lib/db/schema";
import { parseUserAgent } from "@/lib/reports/user-agent";

const MAX_BODY_BYTES = 128 * 1024;
const MAX_BATCH = 50;

const TYPES = new Set(["pageview", "button", "consultation", "form"]);

type Incoming = {
  type?: string;
  label?: string;
  css_class?: string;
  purpose?: string;
  page_path?: string;
};

/**
 * POST /api/v1/connector/events
 *
 * Class-based activity tracking (spec §8.3). The connector's script batches
 * clicks and page views and posts them here.
 *
 * Batched rather than one request per click: a busy page would otherwise open a
 * connection per interaction, and the first thing an agency would notice is
 * their client's site getting slower because of us.
 */
export async function POST(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  // Generous next to /submit's 300/hour: these are page views, not leads. Still
  // bounded, so one looping script cannot fill the table.
  const limit = await rateLimit(`events:${identity.websiteId}`, 5_000, 3600);
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

  const incoming = Array.isArray(body.events) ? body.events.slice(0, MAX_BATCH) : [];
  if (incoming.length === 0) {
    return connectorError("bad_request", 400, "No events in the batch.");
  }

  const ua = parseUserAgent(request.headers.get("user-agent"));
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  // Set by Vercel and most CDNs. Absent in development, and absent is honest —
  // an unknown country stays null rather than being guessed from the IP.
  const country = request.headers.get("x-vercel-ip-country");
  const city = request.headers.get("x-vercel-ip-city");

  const rows = incoming
    .filter((e) => TYPES.has(String(e.type)))
    .map((e) => ({
      agencyId: identity.agencyId,
      websiteId: identity.websiteId,
      eventType: e.type as "pageview" | "button" | "consultation" | "form",
      elementLabel: str(e.label, 200),
      cssClass: str(e.css_class, 120),
      purpose: str(e.purpose, 200),
      pagePath: str(e.page_path, 2000) ?? "/",
      ipAddress: ip,
      country: country ? decodeURIComponent(country) : null,
      city: city ? decodeURIComponent(city) : null,
      device: ua.device,
      browser: ua.browser,
    }));

  if (rows.length === 0) {
    return connectorError("bad_request", 400, "No event had a known type.");
  }

  await withAgency(identity.agencyId, (tx) => tx.insert(trackedEvents).values(rows));

  return Response.json({ status: "ok", accepted: rows.length });
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}
