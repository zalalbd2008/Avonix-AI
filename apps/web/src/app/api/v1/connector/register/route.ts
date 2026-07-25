import { eq } from "drizzle-orm";
import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import {
  hashConnectorKey,
  looksLikeConnectorKey,
  readConnectorKey,
} from "@/lib/connector/keys";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import {
  consumeUninstallToken,
  hasUninstallToken,
} from "@/lib/delete/entities";

/**
 * POST /api/v1/connector/register
 *
 * Handshake + heartbeat. If the website was hard-deleted, a queued uninstall
 * token makes this endpoint return `action: delete_plugin` so the WP plugin
 * can remove itself.
 */
export async function POST(request: Request) {
  const key = readConnectorKey(request);
  if (key && looksLikeConnectorKey(key)) {
    const hash = hashConnectorKey(key);
    if (await hasUninstallToken(hash)) {
      await consumeUninstallToken(hash);
      return Response.json({
        status: "uninstall",
        action: "delete_plugin",
        message: "This site was removed in Avonix. Uninstall the connector.",
      });
    }
  }

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
    registered_url: site?.url ?? null,
  });
}
