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
import { CONNECTOR_VERSION, compareVersions } from "@/lib/connector/version";
import {
  mergeUpdatesSettings,
  type UpdatePendingAction,
} from "@/lib/updates/types";

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
 * Polled by the WP connector on heartbeat. Returns pending backup jobs and
 * queued software update actions (connector / plugins / themes / core).
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
      .select({
        settings: websites.settings,
        connectorVersion: websites.connectorVersion,
      })
      .from(websites)
      .where(eq(websites.id, identity.websiteId))
      .limit(1);
    if (!site) return [];

    const ws = site.settings ?? {};
    const backups = mergeBackupsSettings(ws.backups);
    const integrations = mergeIntegrationsSettings(ws.integrations);
    const updates = mergeUpdatesSettings(ws.updates);
    // Remote software updates need connector v1.3.15+ (Plugin_Upgrader path).
    const supportsRemoteUpdates =
      !!site.connectorVersion &&
      compareVersions(site.connectorVersion, "1.3.15") >= 0;

    const pendingJobs = backups.history.filter((h) => h.status === "pending");
    const now = Date.now();
    const STUCK_MS = 20 * 60 * 1000;
    const queuedUpdates = supportsRemoteUpdates
      ? updates.pendingActions.filter((a) => {
          if (!a.status || a.status === "pending") return true;
          if (a.status !== "running") return false;
          const t = Date.parse(a.createdAt);
          return Number.isFinite(t) && now - t > STUCK_MS;
        })
      : [];

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

    const claimedIds = new Set(queuedUpdates.map((a) => a.id));
    const nextPending: UpdatePendingAction[] = updates.pendingActions.map(
      (a) => (claimedIds.has(a.id) ? { ...a, status: "running" as const } : a),
    );

    const tokenChanged =
      driveAuth.accessToken !== (ws.backupsDriveOAuth?.accessToken ?? "") ||
      dropboxAuth.accessToken !== (ws.backupsDropboxOAuth?.accessToken ?? "") ||
      oneDriveAuth.accessToken !== (ws.backupsOneDriveOAuth?.accessToken ?? "");

    const updatesClaimed = claimedIds.size > 0;

    if (tokenChanged || updatesClaimed) {
      const next: WebsiteSettings = {
        ...ws,
        backupsDriveOAuth: driveAuth,
        backupsDropboxOAuth: dropboxAuth,
        backupsOneDriveOAuth: oneDriveAuth,
        ...(updatesClaimed
          ? { updates: { ...updates, pendingActions: nextPending } }
          : {}),
      };
      await tx
        .update(websites)
        .set({ settings: next, updatedAt: new Date() })
        .where(eq(websites.id, identity.websiteId));
    }

    const backupCommands = pendingJobs.map((job) => {
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

    const updateCommands = queuedUpdates.map((action) => ({
      id: action.id,
      type: "software_update" as const,
      kind: action.kind,
      target_type: action.targetType,
      slug: action.slug,
      label: action.label,
      latest_version:
        action.targetType === "connector" ? CONNECTOR_VERSION : undefined,
      package_url:
        action.targetType === "connector" && action.kind === "update"
          ? "/api/v1/connector/plugin-zip"
          : undefined,
      report_url: "/api/v1/connector/commands/report",
    }));

    return [...backupCommands, ...updateCommands];
  });

  return Response.json({ status: "ok", commands });
}
