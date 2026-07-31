import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { buildConnectorZip } from "@/lib/connector/plugin-zip";

/**
 * GET /api/v1/connector/plugin-zip
 *
 * Connector-key download of the latest Avonix WP plugin zip (self-update).
 */
export async function GET(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  const limit = await rateLimit(`plugin-zip:${identity.websiteId}`, 20, 3600);
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many zip downloads.", {
      retry_after: limit.retryAfterSeconds,
    });
  }

  try {
    const { bytes, filename } = await buildConnectorZip();
    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Avonix-Connector-Version": filename.replace(
          /^avonix-connector-|\.zip$/g,
          "",
        ),
      },
    });
  } catch (e) {
    console.error("connector plugin-zip failed", e);
    return connectorError(
      "server_error",
      500,
      "Could not build the connector zip.",
    );
  }
}
