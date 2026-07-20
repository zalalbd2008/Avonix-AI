import { eq } from "drizzle-orm";
import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";

/**
 * POST /api/v1/connector/register
 *
 * The plugin's handshake: proves it holds the key, reports where it is installed
 * and which version it runs, and flips the site to `connected`.
 *
 * Called on plugin activation and periodically as a heartbeat, so it must be
 * idempotent.
 */
export async function POST(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  const limit = await rateLimit(`register:${identity.websiteId}`, 60, 3600);
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many registration attempts.", {
      retry_after: limit.retryAfterSeconds,
    });
  }

  let body: { site_url?: string; version?: string } = {};
  try {
    body = await request.json();
  } catch {
    // A heartbeat with no body is fine.
  }

  const version =
    typeof body.version === "string" ? body.version.slice(0, 40) : null;

  await withAgency(identity.agencyId, (tx) =>
    tx
      .update(websites)
      .set({
        status: "connected",
        connectorVersion: version,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(websites.id, identity.websiteId)),
  );

  const [site] = await withAgency(identity.agencyId, (tx) =>
    tx
      .select({ url: websites.url })
      .from(websites)
      .where(eq(websites.id, identity.websiteId))
      .limit(1),
  );

  return Response.json({
    status: "connected",
    website_id: identity.websiteId,
    // Echoed so the plugin can warn when it is installed on a different domain
    // than the one registered — a common cause of "why are no leads arriving".
    registered_url: site?.url ?? null,
  });
}
