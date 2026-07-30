import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { getConnectorLanguagesConfig } from "@/lib/languages/connector-config";

/**
 * GET /api/v1/connector/languages
 *
 * Language switcher + translate config for this website.
 * WP renders the floating translator; page text uses Google Translate when engine ≠ none.
 */
export async function GET(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  const limit = await rateLimit(`languages:${identity.websiteId}`, 600, 3600);
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many requests.", {
      retry_after: limit.retryAfterSeconds,
    });
  }

  const config = await getConnectorLanguagesConfig(
    identity.agencyId,
    identity.websiteId,
  );

  if (!config) {
    return connectorError("not_found", 404, "Website not found.");
  }

  return Response.json({
    website_id: identity.websiteId,
    ...config,
  });
}
