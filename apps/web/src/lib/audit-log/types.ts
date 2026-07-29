/**
 * Per-website audit trail — stored on `websites.settings.auditLog`.
 * Entries are appended when agency users change website settings or when the
 * connector reports system events. Nothing is fabricated on an empty log.
 */

export type AuditEventKind =
  | "login"
  | "settings"
  | "content"
  | "system"
  | "security"
  | "backup"
  | "update"
  | "integration";

export type AuditEventTone = "ok" | "mut" | "warn" | "bad";

export type AuditLogEntry = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  meta: string;
  kind: AuditEventKind;
  tone: AuditEventTone;
  suspicious: boolean;
  createdAt: string;
};

export type AuditLogSettings = {
  enabled: boolean;
  retentionDays: number;
  trackLogin: boolean;
  trackSettings: boolean;
  trackContent: boolean;
  trackSystem: boolean;
  trackSecurity: boolean;
  entries: AuditLogEntry[];
};

export type AuditLogSnapshot = {
  website: {
    id: string;
    name: string;
    url: string;
    status: string;
  };
  stats: {
    events30d: number;
    users: number;
    suspicious: number;
    retentionLabel: string;
  };
  entries: AuditLogEntry[];
  loggingReady: boolean;
};

export const AUDIT_KINDS: { id: AuditEventKind; label: string }[] = [
  { id: "login", label: "Login" },
  { id: "settings", label: "Settings" },
  { id: "content", label: "Content" },
  { id: "system", label: "System" },
  { id: "security", label: "Security" },
  { id: "backup", label: "Backup" },
  { id: "update", label: "Updates" },
  { id: "integration", label: "Integrations" },
];

export const RETENTION_OPTIONS = [30, 60, 90, 180, 365] as const;

export const DEFAULT_AUDIT_LOG: AuditLogSettings = {
  enabled: true,
  retentionDays: 90,
  trackLogin: true,
  trackSettings: true,
  trackContent: true,
  trackSystem: true,
  trackSecurity: true,
  entries: [],
};

const KINDS = new Set<AuditEventKind>(AUDIT_KINDS.map((k) => k.id));
const TONES = new Set<AuditEventTone>(["ok", "mut", "warn", "bad"]);

export function newAuditId(): string {
  return `aud_${Math.random().toString(36).slice(2, 10)}`;
}

export function mergeAuditLogSettings(
  partial?: Partial<AuditLogSettings> | null,
): AuditLogSettings {
  const raw = partial ?? {};
  return {
    enabled: raw.enabled !== false,
    retentionDays: RETENTION_OPTIONS.includes(
      raw.retentionDays as (typeof RETENTION_OPTIONS)[number],
    )
      ? (raw.retentionDays as number)
      : DEFAULT_AUDIT_LOG.retentionDays,
    trackLogin: raw.trackLogin !== false,
    trackSettings: raw.trackSettings !== false,
    trackContent: raw.trackContent !== false,
    trackSystem: raw.trackSystem !== false,
    trackSecurity: raw.trackSecurity !== false,
    entries: normalizeEntries(raw.entries),
  };
}

function normalizeEntries(raw: unknown): AuditLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is AuditLogEntry => {
      if (!row || typeof row !== "object") return false;
      const e = row as AuditLogEntry;
      return (
        typeof e.id === "string" &&
        typeof e.actor === "string" &&
        typeof e.action === "string" &&
        typeof e.detail === "string" &&
        KINDS.has(e.kind) &&
        TONES.has(e.tone) &&
        typeof e.createdAt === "string"
      );
    })
    .slice(0, 500);
}

export function appendWebsiteAuditEntry(
  settings: AuditLogSettings,
  entry: Omit<AuditLogEntry, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): AuditLogSettings {
  const base = mergeAuditLogSettings(settings);
  if (!base.enabled) return base;
  const row: AuditLogEntry = {
    id: entry.id ?? newAuditId(),
    actor: entry.actor.slice(0, 120),
    action: entry.action.slice(0, 120),
    detail: entry.detail.slice(0, 280),
    meta: (entry.meta ?? "").slice(0, 160),
    kind: entry.kind,
    tone: entry.tone,
    suspicious: Boolean(entry.suspicious),
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
  return mergeAuditLogSettings({
    ...base,
    entries: [row, ...base.entries].slice(0, 500),
  });
}

export function auditLogConfigScore(settings: AuditLogSettings): number {
  let score = 20;
  if (settings.enabled) score += 25;
  const trackers = [
    settings.trackLogin,
    settings.trackSettings,
    settings.trackContent,
    settings.trackSystem,
    settings.trackSecurity,
  ].filter(Boolean).length;
  score += trackers * 9;
  if (settings.entries.length > 0) score += 6;
  return Math.min(100, score);
}

export function kindLabel(kind: AuditEventKind): string {
  return AUDIT_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

export function toneLabel(tone: AuditEventTone): string {
  switch (tone) {
    case "ok":
      return "OK";
    case "warn":
      return "Review";
    case "bad":
      return "Alert";
    default:
      return "Info";
  }
}

export function toneClasses(tone: AuditEventTone): { text: string; bg: string } {
  switch (tone) {
    case "ok":
      return { text: "text-ok", bg: "bg-[rgba(13,148,136,.1)]" };
    case "warn":
      return { text: "text-warn", bg: "bg-[rgba(217,119,6,.12)]" };
    case "bad":
      return { text: "text-bad", bg: "bg-[rgba(220,38,38,.1)]" };
    default:
      return { text: "text-muted", bg: "bg-[#f1f4f8]" };
  }
}

export function timeAgo(d: Date | string | null) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

export function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function entriesToCsv(entries: AuditLogEntry[]): string {
  const header = "when,actor,action,detail,meta,kind,tone,suspicious";
  const rows = entries.map((e) =>
    [
      e.createdAt,
      csvCell(e.actor),
      csvCell(e.action),
      csvCell(e.detail),
      csvCell(e.meta),
      e.kind,
      e.tone,
      e.suspicious ? "yes" : "no",
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

function csvCell(value: string): string {
  const v = value.replace(/"/g, '""');
  return `"${v}"`;
}
