import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { mergeBackupsSettings } from "@/lib/backups/types";
import {
  mergeBackupsDriveOAuth,
  refreshDriveAccessToken,
  getGoogleDriveOAuthConfig,
} from "@/lib/backups/drive-oauth";
import { mergeIntegrationsSettings, connectionFor } from "@/lib/integrations/types";

/**
 * GET /api/v1/connector/commands
 *
 * Polled by the WP connector on heartbeat. Returns pending backup jobs.
 */
export async function GET(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  const limit = await rateLimit(`commands:${identity.websiteId}`, 120, 3600);
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many polls.", {
      retry_after: limit.retryAfterSeconds,
    });
  }

  const commands = await withAgency(identity.agencyId, async (tx) => {
    const [site] = await tx
      .select({ settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, identity.websiteId))
      .limit(1);
    if (!site) return [];

    const ws = site.settings ?? {};
    const backups = mergeBackupsSettings(ws.backups);
    const integrations = mergeIntegrationsSettings(ws.integrations);

    const pendingBackups = backups.history.filter((h) => h.status === "pending");

    // Refresh Drive token if expired before handing credentials to connector
    let driveAuth = mergeBackupsDriveOAuth(ws.backupsDriveOAuth);
    if (driveAuth.refreshToken && driveAuth.tokenExpiresAt) {
      const expires = new Date(driveAuth.tokenExpiresAt).getTime();
      if (Date.now() > expires - 60_000) {
        try {
          const refreshed = await refreshDriveAccessToken(driveAuth);
          driveAuth = {
            ...driveAuth,
            accessToken: refreshed.accessToken,
            tokenExpiresAt: refreshed.expiresAt,
          };
          const next: WebsiteSettings = {
            ...ws,
            backupsDriveOAuth: driveAuth,
          };
          await tx
            .update(websites)
            .set({ settings: next, updatedAt: new Date() })
            .where(eq(websites.id, identity.websiteId));
        } catch {
          /* connector may refresh client-side */
        }
      }
    }

    return pendingBackups.map((job) => {
      const dest = job.destination;
      let credentials: Record<string, string> = {};

      if (dest === "google_drive") {
        const conn = connectionFor(integrations, "google_drive");
        const platform = getGoogleDriveOAuthConfig();
        if (driveAuth.accessToken) {
          credentials = {
            access_token: driveAuth.accessToken,
            refresh_token: driveAuth.refreshToken,
            client_id: platform.clientId,
            client_secret: platform.clientSecret,
          };
        } else if (conn.webhookUrl) {
          credentials = { webhook_url: conn.webhookUrl };
        }
      } else if (dest === "dropbox") {
        const conn = connectionFor(integrations, "dropbox");
        credentials = { access_token: conn.apiKey };
      } else if (dest === "s3") {
        const conn = connectionFor(integrations, "s3");
        credentials = {
          secret_key: conn.apiKey,
          webhook_url: conn.webhookUrl,
        };
      } else if (dest === "onedrive") {
        const conn = connectionFor(integrations, "onedrive");
        credentials = { access_token: conn.apiKey };
      }

      return {
        id: job.id,
        type: "backup" as const,
        destination: dest,
        include_database: backups.includeDatabase,
        include_uploads: backups.includeUploads,
        credentials,
        report_url: "/api/v1/connector/commands/report",
      };
    });
  });

  return Response.json({ status: "ok", commands });
}
