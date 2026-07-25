import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { getPublishedPopupsConfig } from "@/lib/popup/popup-service";

/**
 * GET /api/v1/connector/popups
 *
 * Published popups for this website (ADR-010). WP evaluates triggers client-side.
 */
export async function GET(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  const limit = await rateLimit(`popups:${identity.websiteId}`, 600, 3600);
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many requests.", {
      retry_after: limit.retryAfterSeconds,
    });
  }

  const config = await getPublishedPopupsConfig(
    identity.agencyId,
    identity.websiteId,
  );

  return Response.json({
    website_id: identity.websiteId,
    fonts: config.fonts,
    google_font_urls: config.google_font_urls,
    popups: config.popups,
  });
}
