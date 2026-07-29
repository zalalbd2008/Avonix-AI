import type { WebsiteSettings } from "@/lib/db/schema";
import {
  buildSecurityChecks,
  mergeSecuritySettings,
  overallSecurityStatus,
  type SecuritySnapshot,
} from "./types";

export function loadSecuritySnapshot(input: {
  website: {
    id: string;
    name: string;
    url: string;
    status: string;
    connectorVersion: string | null;
    lastSeenAt: Date | string | null;
  };
  settings?: WebsiteSettings | null;
}): SecuritySnapshot {
  const ws = input.settings ?? {};
  const security = mergeSecuritySettings(ws.security);
  const connected = input.website.status === "connected";
  const sslWatch = ws.uptime?.sslExpiryWatch !== false;

  const overall = overallSecurityStatus(security, connected);
  const checks = buildSecurityChecks({
    settings: security,
    connected,
    sslWatch,
    connectorVersion: input.website.connectorVersion,
  });

  const lastSuccess = security.scans.find((s) => s.status === "success");
  const malwareLabel = lastSuccess
    ? "0 flagged"
    : security.scans.some((s) => s.status === "failed")
      ? "Review"
      : "—";
  const malwareTone = lastSuccess
    ? "text-ok"
    : security.scans.some((s) => s.status === "failed")
      ? "text-warn"
      : "text-muted";

  const scans = [...security.scans].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    website: {
      ...input.website,
      lastSeenAt: input.website.lastSeenAt
        ? new Date(input.website.lastSeenAt).toISOString()
        : null,
    },
    stats: {
      statusLabel: overall.label,
      statusTone: overall.tone,
      malwareLabel,
      malwareTone,
      blockedLoginsLabel: String(security.blockedLoginCount),
      blockedLoginsTone:
        security.blockedLoginCount > 10 ? "text-warn" : "text-ink",
      firewallLabel: security.firewallEnabled ? "On" : "Off",
      firewallTone: security.firewallEnabled ? "text-ok" : "text-muted",
    },
    checks,
    scans,
  };
}
