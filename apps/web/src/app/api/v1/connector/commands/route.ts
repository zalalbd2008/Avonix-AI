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
import {
  mergeBackupsCloudOAuth,
  refreshDropboxAccessToken,
  refreshOneDriveAccessToken,
  getDropboxOAuthConfig,
  getOneDriveOAuthConfig,
  type BackupsCloudOAuth,
} from "@/lib/backups/cloud-oauth";
import { mergeIntegrationsSettings, connectionFor } from "@/lib/integrations/types";

async function maybeRefreshCloud(
  auth: BackupsCloudOAuth,
  refresh: (a: BackupsCloudOAuth) => Promise<{ accessToken: string; expiresAt: string }>,
): Promise<BackupsCloudOAuth> {
  if (!auth.refreshToken) return auth;
  if (!auth.tokenExpiresAt) return auth;
  const expires = new Date(auth.tokenExpiresAt).getTime();
  if (Date.now() <= expires - 60_000) return auth;
  try {
    const refreshed = await refresh(auth);
    return {
      ...auth,
      accessToken: refreshed.accessToken,
      tokenExpiresAt: refreshed.expiresAt,
    };
  } catch {
    return auth;
  }
}

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

    const pendingJobs = backups.history.filter((h) => h.status === "pending");

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
        } catch {
          /* connector may refresh client-side */
        }
      }
    }

    let dropboxAuth = mergeBackupsCloudOAuth(ws.backupsDropboxOAuth);
    dropboxAuth = await maybeRefreshCloud(dropboxAuth, refreshDropboxAccessToken);

    let oneDriveAuth = mergeBackupsCloudOAuth(ws.backupsOneDriveOAuth);
    oneDriveAuth = await maybeRefreshCloud(
      oneDriveAuth,
      refreshOneDriveAccessToken,
    );

    const tokenChanged =
      driveAuth.accessToken !== (ws.backupsDriveOAuth?.accessToken ?? "") ||
      dropboxAuth.accessToken !== (ws.backupsDropboxOAuth?.accessToken ?? "") ||
      oneDriveAuth.accessToken !== (ws.backupsOneDriveOAuth?.accessToken ?? "");

    if (tokenChanged) {
      const next: WebsiteSettings = {
        ...ws,
        backupsDriveOAuth: driveAuth,
        backupsDropboxOAuth: dropboxAuth,
        backupsOneDriveOAuth: oneDriveAuth,
      };
      await tx
        .update(websites)
        .set({ settings: next, updatedAt: new Date() })
        .where(eq(websites.id, identity.websiteId));
    }

    return pendingJobs.map((job) => {
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
        const platform = getDropboxOAuthConfig();
        if (dropboxAuth.accessToken) {
          credentials = {
            access_token: dropboxAuth.accessToken,
            refresh_token: dropboxAuth.refreshToken,
            client_id: platform.appKey,
            client_secret: platform.appSecret,
          };
        } else if (conn.apiKey) {
          credentials = { access_token: conn.apiKey };
        }
      } else if (dest === "onedrive") {
        const conn = connectionFor(integrations, "onedrive");
        const platform = getOneDriveOAuthConfig();
        if (oneDriveAuth.accessToken) {
          credentials = {
            access_token: oneDriveAuth.accessToken,
            refresh_token: oneDriveAuth.refreshToken,
            client_id: platform.clientId,
            client_secret: platform.clientSecret,
            tenant_id: platform.tenantId,
          };
        } else if (conn.apiKey) {
          credentials = { access_token: conn.apiKey };
        }
      }

      if (job.kind === "restore") {
        return {
          id: job.id,
          type: "restore" as const,
          destination: dest,
          archive_file_name: job.archiveFileName || "",
          remote_file_id: job.remoteFileId || "",
          source_backup_id: job.sourceBackupId || "",
          credentials,
          report_url: "/api/v1/connector/commands/report",
        };
      }

      return {
        id: job.id,
        type: "backup" as const,
        destination: dest,
        include_database: backups.includeDatabase,
        include_uploads: backups.includeUploads,
        include_full_site: backups.includeFullSite,
        archive_name: job.fileName || "",
        credentials,
        report_url: "/api/v1/connector/commands/report",
      };
    });
  });

  return Response.json({ status: "ok", commands });
}
