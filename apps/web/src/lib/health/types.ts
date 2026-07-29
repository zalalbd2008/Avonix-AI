/**
 * Website health score — computed from live module config and connector signals.
 * Optional overrides in `websites.settings.health` come from the connector.
 */

import type { WebsiteSettings } from "@/lib/db/schema";
import { accessibilityScore, mergeAccessibilitySettings } from "@/lib/accessibility/types";
import { mergeBackupsSettings } from "@/lib/backups/types";
import { mergeUpdatesSettings } from "@/lib/updates/types";
import { mergeUptimeSettings } from "@/lib/uptime/types";
import {
  mergeWebsiteEmailSettings,
  websiteEmailConfigScore,
} from "@/lib/website-email/types";

export type HealthCheckStatus = "ok" | "warn" | "bad" | "off" | "unknown";

export type HealthCheck = {
  id: string;
  label: string;
  status: HealthCheckStatus;
  hint: string;
  href?: string;
};

export type HealthSummaryCard = {
  id: string;
  title: string;
  value: string;
  detail: string;
  tone: "ok" | "warn" | "muted" | "brand";
  href?: string;
  hrefLabel?: string;
};

export type HealthSettings = {
  lastCheckedAt?: string;
  /** Days until SSL cert expires (connector-reported). */
  sslExpiryDays?: number | null;
  /** Days until domain expires (WHOIS / connector). */
  domainExpiryDays?: number | null;
  /** Rolling uptime % when probes have run. */
  uptimePercent?: number | null;
};

export type HealthSnapshot = {
  website: {
    id: string;
    name: string;
    url: string;
    status: string;
    connectorVersion: string | null;
    lastSeenAt: string | null;
  };
  score: number;
  scoreTone: string;
  scoreBar: string;
  checkedLabel: string;
  checks: HealthCheck[];
  cards: HealthSummaryCard[];
};

export function mergeHealthSettings(
  partial?: Partial<HealthSettings> | null,
): HealthSettings {
  const raw = partial ?? {};
  return {
    lastCheckedAt:
      typeof raw.lastCheckedAt === "string" ? raw.lastCheckedAt : "",
    sslExpiryDays: normalizeDays(raw.sslExpiryDays),
    domainExpiryDays: normalizeDays(raw.domainExpiryDays),
    uptimePercent: normalizePercent(raw.uptimePercent),
  };
}

function normalizeDays(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function normalizePercent(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100) / 100;
}

function checkPoints(status: HealthCheckStatus): number {
  switch (status) {
    case "ok":
      return 100;
    case "warn":
      return 55;
    case "bad":
      return 15;
    case "off":
      return 30;
    default:
      return 40;
  }
}

export function computeHealthScore(checks: HealthCheck[]): number {
  if (checks.length === 0) return 0;
  const total = checks.reduce((n, c) => n + checkPoints(c.status), 0);
  return Math.round(total / checks.length);
}

export function scoreTone(score: number): { text: string; bar: string } {
  if (score >= 80) return { text: "text-ok", bar: "bg-ok" };
  if (score >= 55) return { text: "text-warn", bar: "bg-warn" };
  return { text: "text-bad", bar: "bg-bad" };
}

export function checkIcon(status: HealthCheckStatus): string {
  switch (status) {
    case "ok":
      return "✓";
    case "warn":
      return "⚠";
    case "bad":
      return "✕";
    default:
      return "○";
  }
}

export function checkColor(status: HealthCheckStatus): string {
  switch (status) {
    case "ok":
      return "text-ok";
    case "warn":
      return "text-warn";
    case "bad":
      return "text-bad";
    default:
      return "text-faint";
  }
}

function timeAgo(d: Date | string | null) {
  if (!d) return "never";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

export function buildHealthSnapshot(input: {
  clientId: string;
  website: {
    id: string;
    name: string;
    url: string;
    status: string;
    connectorVersion: string | null;
    lastSeenAt: Date | string | null;
  };
  settings?: WebsiteSettings | null;
  ai?: { chunks: number; modelReady: boolean };
  pendingUpdates?: number;
}): HealthSnapshot {
  const base = `/clients/${input.clientId}/websites/${input.website.id}`;
  const ws = input.settings ?? {};
  const health = mergeHealthSettings(ws.health);
  const uptime = mergeUptimeSettings(ws.uptime);
  const backups = mergeBackupsSettings(ws.backups);
  const updates = mergeUpdatesSettings(ws.updates);
  const emailScore = websiteEmailConfigScore(mergeWebsiteEmailSettings(ws.email));
  const a11yScore = accessibilityScore(
    mergeAccessibilitySettings(ws.accessibility),
  );

  const connected = input.website.status === "connected";
  const pendingUpdates = input.pendingUpdates ?? 0;
  const lastBackup = backups.history.find((h) => h.status === "success");
  const aiChunks = input.ai?.chunks ?? 0;
  const aiReady = Boolean(input.ai?.modelReady);
  const sslDays = health.sslExpiryDays;
  const domainDays = health.domainExpiryDays;
  const uptimePct = health.uptimePercent;

  const sslStatus: HealthCheckStatus = !connected
    ? "off"
    : !uptime.sslExpiryWatch
      ? "warn"
      : sslDays != null && sslDays <= 3
        ? "bad"
        : sslDays != null && sslDays <= 14
          ? "warn"
          : "ok";

  const backupStatus: HealthCheckStatus = !backups.enabled
    ? "off"
    : lastBackup
      ? "ok"
      : backups.destination !== "none"
        ? "warn"
        : "off";

  const aiStatus: HealthCheckStatus = !connected
    ? "off"
    : aiReady && aiChunks > 0
      ? "ok"
      : aiChunks > 0
        ? "warn"
        : "off";

  const smtpStatus: HealthCheckStatus =
    emailScore >= 70 ? "ok" : emailScore >= 40 ? "warn" : "off";

  const updatesStatus: HealthCheckStatus = !updates.enabled
    ? "off"
    : pendingUpdates > 0
      ? "warn"
      : "ok";

  const domainStatus: HealthCheckStatus =
    domainDays == null
      ? "unknown"
      : domainDays <= 3
        ? "bad"
        : domainDays <= 14
          ? "warn"
          : "ok";

  const uptimeStatus: HealthCheckStatus = !uptime.enabled
    ? "off"
    : uptime.lastStatus === "down"
      ? "bad"
      : uptime.lastStatus === "up"
        ? "ok"
        : "warn";

  const cronStatus: HealthCheckStatus = ws.automation?.enabled ? "ok" : "off";

  const securityStatus: HealthCheckStatus = !ws.security?.enabled
    ? "off"
    : ws.security.scans.some((s) => s.status === "failed")
      ? "warn"
      : "ok";

  const errorStatus: HealthCheckStatus = !ws.errorLog?.enabled
    ? "off"
    : (ws.errorLog.entries.filter((e) => e.kind === "fatal").length ?? 0) > 0
      ? "bad"
      : (ws.errorLog.entries.filter((e) => e.kind === "warning").length ?? 0) >
          0
        ? "warn"
        : "ok";

  const a11yStatus: HealthCheckStatus = !ws.accessibility?.enabled
    ? "off"
    : a11yScore >= 70
      ? "ok"
      : a11yScore >= 40
        ? "warn"
        : "bad";

  const checks: HealthCheck[] = [
    {
      id: "ssl",
      label: "SSL secure",
      status: sslStatus,
      hint:
        sslDays != null
          ? `Expires in ${sslDays} days`
          : uptime.sslExpiryWatch
            ? "Expiry watch enabled"
            : "Enable SSL watch under Uptime",
      href: `${base}/uptime`,
    },
    {
      id: "backup",
      label: "Backup OK",
      status: backupStatus,
      hint: lastBackup
        ? `Last success ${timeAgo(lastBackup.finishedAt ?? lastBackup.createdAt)}`
        : "Configure backups and destination",
      href: `${base}/backups`,
    },
    {
      id: "ai",
      label: "AI online",
      status: aiStatus,
      hint:
        aiChunks > 0
          ? `${aiChunks} knowledge passages indexed`
          : "Train Chat AI on site content",
      href: `${base}/chat-ai`,
    },
    {
      id: "smtp",
      label: "SMTP working",
      status: smtpStatus,
      hint:
        emailScore >= 70
          ? "Outbound mail configured"
          : "Complete SMTP / OAuth setup",
      href: `${base}/email`,
    },
    {
      id: "updates",
      label:
        pendingUpdates > 0
          ? `${pendingUpdates} plugin update${pendingUpdates === 1 ? "" : "s"}`
          : "Updates current",
      status: updatesStatus,
      hint: updates.enabled
        ? "Update Center watching core, plugins and themes"
        : "Turn on update watching",
      href: `${base}/updates`,
    },
    {
      id: "domain",
      label:
        domainDays != null
          ? `Domain · ${domainDays}d`
          : "Domain expiry",
      status: domainStatus,
      hint:
        domainDays != null
          ? "Auto reminders at 30 / 15 / 7 days when connector reports WHOIS"
          : "Waiting for connector WHOIS signal",
    },
    {
      id: "uptime",
      label: "Uptime probe",
      status: uptimeStatus,
      hint: uptime.enabled
        ? `Every ${uptime.intervalMinutes} min · ${uptime.regions.length} region(s)`
        : "Arm uptime monitoring",
      href: `${base}/uptime`,
    },
    {
      id: "cron",
      label: "Cron working",
      status: cronStatus,
      hint: ws.automation?.enabled
        ? "Auto rules and follow-ups scheduled"
        : "Enable automation cron",
      href: `${base}/automation`,
    },
    {
      id: "security",
      label: "Security OK",
      status: securityStatus,
      hint: ws.security?.enabled
        ? "Security monitor enabled"
        : "Turn on security monitor",
      href: `${base}/security`,
    },
    {
      id: "errors",
      label: "Error log",
      status: errorStatus,
      hint: ws.errorLog?.enabled
        ? `${ws.errorLog.entries.length} events collected`
        : "Enable runtime error collectors",
      href: `${base}/error-log`,
    },
    {
      id: "accessibility",
      label: "Accessibility",
      status: a11yStatus,
      hint: ws.accessibility?.enabled
        ? `Widget readiness ${a11yScore}%`
        : "Publish accessibility widget",
      href: `${base}/accessibility`,
    },
    {
      id: "connector",
      label: "Connector",
      status: connected ? "ok" : "bad",
      hint: connected
        ? `v${input.website.connectorVersion ?? "?"} · seen ${timeAgo(input.website.lastSeenAt)}`
        : "Install or reconnect the plugin",
      href: `${base}/settings`,
    },
  ];

  const score = computeHealthScore(checks);
  const tone = scoreTone(score);
  const checkedAt =
    health.lastCheckedAt ||
    input.website.lastSeenAt?.toString() ||
    "";
  const checkedLabel = checkedAt ? timeAgo(checkedAt) : "not yet";

  const uptimeLabel =
    uptimePct != null
      ? `${uptimePct}%`
      : uptime.lastStatus === "up"
        ? "Up"
        : uptime.enabled
          ? "Monitoring"
          : "—";

  const cards: HealthSummaryCard[] = [
    {
      id: "ssl-card",
      title: "SSL",
      value:
        sslDays != null
          ? `${sslDays} days`
          : sslStatus === "ok"
            ? "Active"
            : "Watch",
      detail:
        sslDays != null
          ? "Certificate expiry"
          : "Enable expiry watch under Uptime",
      tone:
        sslDays != null && sslDays <= 14
          ? "warn"
          : sslStatus === "ok"
            ? "ok"
            : "muted",
      href: `${base}/uptime`,
      hrefLabel: "Uptime →",
    },
    {
      id: "domain-card",
      title: "Domain expiry",
      value: domainDays != null ? `${domainDays} days` : "—",
      detail: "WHOIS / registrar signal from connector",
      tone:
        domainDays != null && domainDays <= 30 ? "warn" : "muted",
    },
    {
      id: "uptime-card",
      title: "Uptime",
      value: uptimeLabel,
      detail: uptime.enabled
        ? `Probe every ${uptime.intervalMinutes} min`
        : "Monitoring off",
      tone:
        uptime.lastStatus === "down"
          ? "warn"
          : uptimePct != null && uptimePct >= 99
            ? "ok"
            : "muted",
      href: `${base}/uptime`,
      hrefLabel: "Monitor →",
    },
    {
      id: "backup-card",
      title: "Last backup",
      value: lastBackup
        ? timeAgo(lastBackup.finishedAt ?? lastBackup.createdAt)
        : "Never",
      detail: lastBackup
        ? lastBackup.detail
        : backups.enabled
          ? "Waiting for first run"
          : "Backups not configured",
      tone: lastBackup ? "ok" : "muted",
      href: `${base}/backups`,
      hrefLabel: "Backups →",
    },
  ];

  return {
    website: {
      ...input.website,
      lastSeenAt: input.website.lastSeenAt
        ? new Date(input.website.lastSeenAt).toISOString()
        : null,
    },
    score,
    scoreTone: tone.text,
    scoreBar: tone.bar,
    checkedLabel,
    checks,
    cards,
  };
}
