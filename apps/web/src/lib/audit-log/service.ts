import type { WebsiteSettings } from "@/lib/db/schema";
import { mergeAuditLogSettings, type AuditLogSnapshot } from "./types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function loadAuditLogSnapshot(input: {
  website: {
    id: string;
    name: string;
    url: string;
    status: string;
  };
  settings?: WebsiteSettings | null;
}): AuditLogSnapshot {
  const auditLog = mergeAuditLogSettings(input.settings?.auditLog);
  const since = Date.now() - THIRTY_DAYS_MS;

  const entries = [...auditLog.entries].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const recent = entries.filter(
    (e) => new Date(e.createdAt).getTime() >= since,
  );
  const actors = new Set(
    recent.map((e) => e.actor.trim()).filter(Boolean),
  );

  const connected = input.website.status === "connected";
  const loggingReady =
    connected &&
    auditLog.enabled &&
    (auditLog.trackLogin ||
      auditLog.trackSettings ||
      auditLog.trackContent ||
      auditLog.trackSystem ||
      auditLog.trackSecurity);

  return {
    website: input.website,
    stats: {
      events30d: recent.length,
      users: actors.size,
      suspicious: recent.filter((e) => e.suspicious).length,
      retentionLabel: `${auditLog.retentionDays}d`,
    },
    entries,
    loggingReady,
  };
}
