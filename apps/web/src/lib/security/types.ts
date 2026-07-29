/**
 * Per-website security monitor — stored on `websites.settings.security`.
 * Avonix watches signals from the connector; deep malware scanning ships with
 * the connector / host tooling, not inside Avonix storage.
 */

export type SecurityCheckStatus =
  | "clean"
  | "ok"
  | "warn"
  | "bad"
  | "protected"
  | "monitored"
  | "pending"
  | "off";

export type SecurityScanStatus = "success" | "failed" | "pending" | "running";

export type SecurityScanEntry = {
  id: string;
  label: string;
  detail: string;
  status: SecurityScanStatus;
  filesChecked: number;
  createdAt: string;
  finishedAt?: string;
};

export type SecuritySettings = {
  enabled: boolean;
  firewallEnabled: boolean;
  watchMalware: boolean;
  watchLogins: boolean;
  watchFileChanges: boolean;
  watchNewAdmins: boolean;
  blockXmlRpc: boolean;
  blockRestUserEnum: boolean;
  hideWpVersion: boolean;
  notifyOnThreat: boolean;
  /** Hours between scheduled scans (0 = manual only). */
  scanIntervalHours: number;
  blockedLoginCount: number;
  bannedIpCount: number;
  adminCount: number;
  scans: SecurityScanEntry[];
};

export type SecurityCheckRow = {
  id: string;
  title: string;
  detail: string;
  status: SecurityCheckStatus;
};

export type SecuritySnapshot = {
  website: {
    id: string;
    name: string;
    url: string;
    status: string;
    connectorVersion: string | null;
    lastSeenAt: string | null;
  };
  stats: {
    statusLabel: string;
    statusTone: string;
    malwareLabel: string;
    malwareTone: string;
    blockedLoginsLabel: string;
    blockedLoginsTone: string;
    firewallLabel: string;
    firewallTone: string;
  };
  checks: SecurityCheckRow[];
  scans: SecurityScanEntry[];
};

export const SCAN_INTERVALS = [0, 6, 12, 24, 168] as const;

export const DEFAULT_SECURITY: SecuritySettings = {
  enabled: false,
  firewallEnabled: true,
  watchMalware: true,
  watchLogins: true,
  watchFileChanges: true,
  watchNewAdmins: true,
  blockXmlRpc: true,
  blockRestUserEnum: true,
  hideWpVersion: true,
  notifyOnThreat: true,
  scanIntervalHours: 24,
  blockedLoginCount: 0,
  bannedIpCount: 0,
  adminCount: 0,
  scans: [],
};

const SCAN_STATUSES = new Set<SecurityScanStatus>([
  "success",
  "failed",
  "pending",
  "running",
]);

export function newSecurityScanId(): string {
  return `sec_${Math.random().toString(36).slice(2, 10)}`;
}

export function mergeSecuritySettings(
  partial?: Partial<SecuritySettings> | null,
): SecuritySettings {
  const raw = partial ?? {};
  return {
    enabled: Boolean(raw.enabled),
    firewallEnabled: raw.firewallEnabled !== false,
    watchMalware: raw.watchMalware !== false,
    watchLogins: raw.watchLogins !== false,
    watchFileChanges: raw.watchFileChanges !== false,
    watchNewAdmins: raw.watchNewAdmins !== false,
    blockXmlRpc: raw.blockXmlRpc !== false,
    blockRestUserEnum: raw.blockRestUserEnum !== false,
    hideWpVersion: raw.hideWpVersion !== false,
    notifyOnThreat: raw.notifyOnThreat !== false,
    scanIntervalHours: normalizeInterval(raw.scanIntervalHours),
    blockedLoginCount: clampCount(raw.blockedLoginCount),
    bannedIpCount: clampCount(raw.bannedIpCount),
    adminCount: clampCount(raw.adminCount),
    scans: normalizeScans(raw.scans),
  };
}

function clampCount(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(99999, Math.round(v));
}

function normalizeInterval(raw: unknown): number {
  const n = Number(raw);
  return SCAN_INTERVALS.includes(n as (typeof SCAN_INTERVALS)[number])
    ? n
    : DEFAULT_SECURITY.scanIntervalHours;
}

function normalizeScans(raw: unknown): SecurityScanEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is SecurityScanEntry => {
      if (!row || typeof row !== "object") return false;
      const s = row as SecurityScanEntry;
      return (
        typeof s.id === "string" &&
        typeof s.label === "string" &&
        typeof s.detail === "string" &&
        SCAN_STATUSES.has(s.status) &&
        typeof s.createdAt === "string"
      );
    })
    .slice(0, 50);
}

export function securityConfigScore(settings: SecuritySettings): number {
  let score = 15;
  if (settings.enabled) score += 20;
  if (settings.firewallEnabled) score += 15;
  if (settings.blockXmlRpc) score += 10;
  if (settings.blockRestUserEnum) score += 10;
  if (settings.hideWpVersion) score += 5;
  if (settings.watchMalware) score += 10;
  if (settings.watchLogins) score += 5;
  if (settings.scans.some((s) => s.status === "success")) score += 10;
  return Math.min(100, score);
}

export function checkStatusLabel(status: SecurityCheckStatus): string {
  switch (status) {
    case "clean":
      return "Clean";
    case "protected":
      return "Protected";
    case "monitored":
      return "Monitored";
    case "warn":
      return "Warning";
    case "bad":
      return "Issue";
    case "pending":
      return "Pending";
    case "off":
      return "Off";
    default:
      return "OK";
  }
}

export function checkStatusTone(status: SecurityCheckStatus): {
  text: string;
  bg: string;
} {
  switch (status) {
    case "clean":
    case "ok":
    case "protected":
      return { text: "text-ok", bg: "bg-[rgba(13,148,136,.1)]" };
    case "monitored":
    case "warn":
      return { text: "text-warn", bg: "bg-[rgba(217,119,6,.12)]" };
    case "bad":
      return { text: "text-bad", bg: "bg-[rgba(220,38,38,.1)]" };
    case "pending":
      return { text: "text-brand", bg: "bg-[rgba(255,102,0,.1)]" };
    default:
      return { text: "text-muted", bg: "bg-[#f1f4f8]" };
  }
}

export function scanStatusLabel(status: SecurityScanStatus): string {
  switch (status) {
    case "success":
      return "Success";
    case "failed":
      return "Failed";
    case "running":
      return "Running";
    default:
      return "Queued";
  }
}

export function scanIntervalLabel(hours: number): string {
  if (hours === 0) return "Manual only";
  if (hours === 168) return "Weekly";
  if (hours === 24) return "Daily";
  return `Every ${hours}h`;
}

function timeAgo(d: Date | string | null) {
  if (!d) return null;
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

export function overallSecurityStatus(
  settings: SecuritySettings,
  connected: boolean,
): { label: string; tone: string } {
  if (!connected) return { label: "Disconnected", tone: "text-warn" };
  if (!settings.enabled) return { label: "Monitor off", tone: "text-muted" };
  const pending = settings.scans.some(
    (s) => s.status === "pending" || s.status === "running",
  );
  if (pending) return { label: "Scanning", tone: "text-brand" };
  const failed = settings.scans.some((s) => s.status === "failed");
  if (failed) return { label: "Review", tone: "text-warn" };
  if (settings.blockedLoginCount > 10) return { label: "Alert", tone: "text-warn" };
  return { label: "OK", tone: "text-ok" };
}

export function buildSecurityChecks(input: {
  settings: SecuritySettings;
  connected: boolean;
  sslWatch: boolean;
  connectorVersion: string | null;
}): SecurityCheckRow[] {
  const s = input.settings;
  const lastScan = [...s.scans]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .find((scan) => scan.status === "success" || scan.status === "running");

  const pendingScan = s.scans.some(
    (scan) => scan.status === "pending" || scan.status === "running",
  );

  const checks: SecurityCheckRow[] = [];

  if (s.watchMalware) {
    checks.push({
      id: "malware",
      title: "Malware scan",
      detail: lastScan
        ? `Last run ${timeAgo(lastScan.finishedAt ?? lastScan.createdAt) ?? "recently"} · ${lastScan.filesChecked.toLocaleString()} files checked`
        : pendingScan
          ? "Scan queued — waiting for connector"
          : s.enabled
            ? "No scan yet — click Run scan"
            : "Enable monitor to schedule scans",
      status: pendingScan
        ? "pending"
        : lastScan
          ? "clean"
          : s.enabled
            ? "warn"
            : "off",
    });
  }

  if (s.watchLogins) {
    checks.push({
      id: "logins",
      title: "Login attempts",
      detail:
        s.blockedLoginCount > 0
          ? `${s.blockedLoginCount} blocked this period · ${s.bannedIpCount} IP${s.bannedIpCount === 1 ? "" : "s"} banned`
          : s.enabled
            ? "Monitoring enabled — no blocks recorded yet"
            : "Turn on monitor to watch failed logins",
      status:
        s.blockedLoginCount > 10
          ? "warn"
          : s.enabled
            ? "monitored"
            : "off",
    });
  }

  if (s.watchFileChanges) {
    checks.push({
      id: "files",
      title: "File changes",
      detail: input.connected
        ? "wp-config.php and core paths watched via connector heartbeat"
        : "Connect the plugin to watch critical files",
      status: input.connected ? "ok" : "warn",
    });
  }

  if (s.watchNewAdmins) {
    checks.push({
      id: "admins",
      title: "Admin accounts",
      detail:
        s.adminCount > 0
          ? `${s.adminCount} admin${s.adminCount === 1 ? "" : "s"} · no new accounts flagged`
          : input.connected
            ? "Waiting for admin count from connector"
            : "Connect plugin to report admin accounts",
      status: input.connected ? "ok" : "off",
    });
  }

  checks.push({
    id: "xmlrpc",
    title: "XML-RPC",
    detail: s.blockXmlRpc
      ? "Disabled to prevent brute-force and pingback abuse"
      : "Still reachable — recommended to block",
    status: s.blockXmlRpc ? "protected" : "warn",
  });

  checks.push({
    id: "rest-users",
    title: "REST user enum",
    detail: s.blockRestUserEnum
      ? "User listing blocked on REST API"
      : "Public user discovery may be possible",
    status: s.blockRestUserEnum ? "protected" : "warn",
  });

  checks.push({
    id: "ssl",
    title: "SSL / TLS",
    detail: input.sslWatch
      ? "Certificate expiry watched via Uptime monitor"
      : "Enable SSL expiry watch under Uptime",
    status: input.sslWatch ? "ok" : "warn",
  });

  checks.push({
    id: "connector",
    title: "Connector key",
    detail: input.connectorVersion
      ? `v${input.connectorVersion} connected · rotate keys under Settings`
      : "Install or reconnect the Avonix connector",
    status: input.connected ? "ok" : "bad",
  });

  if (s.hideWpVersion) {
    checks.push({
      id: "wp-version",
      title: "WP version header",
      detail: "Generator meta hidden from public HTML",
      status: "protected",
    });
  }

  return checks;
}
