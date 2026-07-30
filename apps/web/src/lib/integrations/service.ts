import type { WebsiteSettings } from "@/lib/db/schema";
import { mergeBackupsDriveOAuth, isDriveConnected } from "@/lib/backups/drive-oauth";
import {
  mergeBackupsCloudOAuth,
  isCloudConnected,
} from "@/lib/backups/cloud-oauth";
import {
  ENTERPRISE_INTEGRATIONS,
  OPTIONAL_INTEGRATIONS,
  connectionFor,
  isTelegramPhoneConnected,
  mergeIntegrationsSettings,
  type CoreModuleStatus,
  type IntegrationsSnapshot,
  type OptionalIntegrationId,
} from "./types";

function buildCoreModules(
  base: string,
  ws: WebsiteSettings,
  site: { status: string; connectorVersion: string | null },
): CoreModuleStatus[] {
  const connected = site.status === "connected";
  const driveOAuth = mergeBackupsDriveOAuth(ws.backupsDriveOAuth);
  const dropboxOAuth = mergeBackupsCloudOAuth(ws.backupsDropboxOAuth);
  const oneDriveOAuth = mergeBackupsCloudOAuth(ws.backupsOneDriveOAuth);
  const backupConnected =
    !!ws.backups?.enabled ||
    Boolean(isDriveConnected(driveOAuth)) ||
    Boolean(isCloudConnected(dropboxOAuth)) ||
    Boolean(isCloudConnected(oneDriveOAuth)) ||
    ws.integrations?.connections.some(
      (c) =>
        c.connected &&
        (c.id === "google_drive" ||
          c.id === "dropbox" ||
          c.id === "onedrive"),
    );
  return [
    {
      id: "health",
      label: "Website Health",
      active: connected,
      href: `${base}/health`,
      hint: "Overall score and checks",
    },
    {
      id: "ssl",
      label: "SSL Monitor",
      active: !!ws.uptime?.enabled,
      href: `${base}/uptime`,
      hint: "Availability probes include TLS",
    },
    {
      id: "updates",
      label: "Update Center",
      active: !!ws.updates?.enabled,
      href: `${base}/updates`,
      hint: "Core, plugins, themes, connector",
    },
    {
      id: "backup",
      label: "Backup Monitor",
      active: !!backupConnected,
      href: `${base}/backups`,
      hint: "Schedule backups and connect Google Drive",
    },
    {
      id: "audit",
      label: "Audit Log",
      active: connected && !!ws.auditLog?.enabled,
      href: `${base}/audit-log`,
      hint: "Agency and system actions",
    },
    {
      id: "errors",
      label: "Error Log",
      active: connected && !!ws.errorLog?.enabled,
      href: `${base}/error-log`,
      hint: "PHP, JS, DB and API errors",
    },
    {
      id: "links",
      label: "Broken Links",
      active: false,
      hint: "Planned — connector crawl",
    },
    {
      id: "db",
      label: "Database Cleaner",
      active: false,
      hint: "Planned — host-side tool",
    },
    {
      id: "cron",
      label: "Cron Monitor",
      active: !!ws.automation?.enabled,
      href: `${base}/automation`,
      hint: "Auto rules cron + follow-ups",
    },
    {
      id: "smtp",
      label: "SMTP Test",
      active: !!ws.email?.enabled && !!ws.email.fromEmail?.trim(),
      href: `${base}/email`,
      hint: "Outbound mail configured",
    },
    {
      id: "security",
      label: "Security Monitor (Basic)",
      active:
        connected &&
        !!site.connectorVersion &&
        !!ws.security?.enabled,
      href: `${base}/security`,
      hint: "Hardening, scans and login blocks",
    },
    {
      id: "score",
      label: "Health Score",
      active: connected,
      href: `${base}/health`,
      hint: "Overall score from live modules",
    },
  ];
}

export function loadIntegrationsSnapshot(input: {
  website: {
    id: string;
    name: string;
    url: string;
    status: string;
    connectorVersion: string | null;
  };
  clientId: string;
  settings?: WebsiteSettings | null;
}): IntegrationsSnapshot {
  const base = `/clients/${input.clientId}/websites/${input.website.id}`;
  const ws = input.settings ?? {};
  const integrations = mergeIntegrationsSettings(ws.integrations);
  const social = ws.automation?.socialAccounts ?? [];

  const optional = OPTIONAL_INTEGRATIONS.map((meta) => {
    const conn = connectionFor(integrations, meta.id);
    const auto = meta.automationProvider
      ? social.find(
          (a) => a.provider === meta.automationProvider && a.connected,
        )
      : null;
    const driveOAuth = mergeBackupsDriveOAuth(ws.backupsDriveOAuth);
    const dropboxOAuth = mergeBackupsCloudOAuth(ws.backupsDropboxOAuth);
    const oneDriveOAuth = mergeBackupsCloudOAuth(ws.backupsOneDriveOAuth);
    const oauthConnected =
      (meta.id === "google_drive" && isDriveConnected(driveOAuth)) ||
      (meta.id === "dropbox" && isCloudConnected(dropboxOAuth)) ||
      (meta.id === "onedrive" && isCloudConnected(oneDriveOAuth));
    const telegramOk =
      meta.id === "telegram" && isTelegramPhoneConnected(conn);
    const connected =
      (meta.id === "telegram"
        ? telegramOk
        : conn.connected || !!auto || oauthConnected);
    const labelText =
      (meta.id === "google_drive" && isDriveConnected(driveOAuth)
        ? `Drive (${driveOAuth.email || "connected"})`
        : meta.id === "dropbox" && isCloudConnected(dropboxOAuth)
          ? `Dropbox (${dropboxOAuth.email || dropboxOAuth.accountName || "connected"})`
          : meta.id === "onedrive" && isCloudConnected(oneDriveOAuth)
            ? `OneDrive (${oneDriveOAuth.email || oneDriveOAuth.accountName || "connected"})`
            : meta.id === "telegram" && telegramOk
              ? `Telegram (${conn.meta?.phone || "connected"})`
              : conn.label.trim()) ||
      auto?.label.trim() ||
      (connected ? "Connected" : "");

    return {
      id: meta.id,
      label: meta.label,
      hint: meta.hint,
      connected,
      labelText,
      viaAutomation: meta.automationProvider,
    };
  });

  const coreModules = buildCoreModules(base, ws, input.website);
  const coreActive = coreModules.filter((m) => m.active).length;

  return {
    website: input.website,
    stats: {
      coreActive,
      coreTotal: coreModules.length,
      optionalConnected: optional.filter((o) => o.connected).length,
      optionalTotal: optional.length,
    },
    coreModules,
    optional,
    enterprise: ENTERPRISE_INTEGRATIONS,
  };
}

export function patchConnection(
  settings: ReturnType<typeof mergeIntegrationsSettings>,
  id: OptionalIntegrationId,
  partial: Partial<ReturnType<typeof connectionFor>>,
) {
  return mergeIntegrationsSettings({
    connections: settings.connections.map((c) =>
      c.id === id ? { ...c, ...partial, id } : c,
    ),
  });
}
