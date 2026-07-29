/**
 * Per-website runtime error log — stored on `websites.settings.errorLog`.
 * Entries arrive from the connector; Avonix does not invent errors.
 */

export type ErrorKind =
  | "fatal"
  | "warning"
  | "notice"
  | "db"
  | "api"
  | "smtp"
  | "js";

export type ErrorLogEntry = {
  id: string;
  kind: ErrorKind;
  title: string;
  message: string;
  source: string;
  createdAt: string;
};

export type ErrorLogSettings = {
  enabled: boolean;
  collectPhp: boolean;
  collectJs: boolean;
  collectDb: boolean;
  collectApi: boolean;
  collectSmtp: boolean;
  retentionDays: number;
  notifyOnFatal: boolean;
  entries: ErrorLogEntry[];
};

export type ErrorLogSnapshot = {
  website: {
    id: string;
    name: string;
    url: string;
    status: string;
    connectorVersion: string | null;
  };
  stats: {
    fatal: number;
    warning: number;
    notice: number;
    db: number;
    api: number;
    smtp: number;
    js: number;
    total: number;
  };
  entries: ErrorLogEntry[];
  collectorReady: boolean;
};

export const ERROR_KINDS: {
  id: ErrorKind;
  label: string;
  statLabel: string;
}[] = [
  { id: "fatal", label: "Fatal", statLabel: "Fatal errors" },
  { id: "warning", label: "Warnings", statLabel: "Warnings" },
  { id: "notice", label: "Notices", statLabel: "Notices" },
  { id: "db", label: "Database", statLabel: "DB errors" },
  { id: "api", label: "API", statLabel: "API errors" },
  { id: "smtp", label: "SMTP", statLabel: "SMTP errors" },
  { id: "js", label: "JavaScript", statLabel: "JS errors" },
];

export const RETENTION_OPTIONS = [7, 14, 30, 90] as const;

export const DEFAULT_ERROR_LOG: ErrorLogSettings = {
  enabled: true,
  collectPhp: true,
  collectJs: true,
  collectDb: true,
  collectApi: true,
  collectSmtp: true,
  retentionDays: 30,
  notifyOnFatal: true,
  entries: [],
};

const KINDS = new Set<ErrorKind>(ERROR_KINDS.map((k) => k.id));

export function mergeErrorLogSettings(
  partial?: Partial<ErrorLogSettings> | null,
): ErrorLogSettings {
  const raw = partial ?? {};
  return {
    enabled: raw.enabled !== false,
    collectPhp: raw.collectPhp !== false,
    collectJs: raw.collectJs !== false,
    collectDb: raw.collectDb !== false,
    collectApi: raw.collectApi !== false,
    collectSmtp: raw.collectSmtp !== false,
    retentionDays: RETENTION_OPTIONS.includes(
      raw.retentionDays as (typeof RETENTION_OPTIONS)[number],
    )
      ? (raw.retentionDays as number)
      : DEFAULT_ERROR_LOG.retentionDays,
    notifyOnFatal: raw.notifyOnFatal !== false,
    entries: normalizeEntries(raw.entries),
  };
}

function normalizeEntries(raw: unknown): ErrorLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is ErrorLogEntry => {
      if (!row || typeof row !== "object") return false;
      const e = row as ErrorLogEntry;
      return (
        typeof e.id === "string" &&
        KINDS.has(e.kind) &&
        typeof e.title === "string" &&
        typeof e.message === "string" &&
        typeof e.createdAt === "string"
      );
    })
    .slice(0, 500);
}

export function errorLogConfigScore(settings: ErrorLogSettings): number {
  let score = 20;
  if (settings.enabled) score += 25;
  const collectors = [
    settings.collectPhp,
    settings.collectJs,
    settings.collectDb,
    settings.collectApi,
    settings.collectSmtp,
  ].filter(Boolean).length;
  score += collectors * 8;
  if (settings.notifyOnFatal) score += 7;
  return Math.min(100, score);
}

export function kindLabel(kind: ErrorKind): string {
  return ERROR_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

export function kindTone(kind: ErrorKind): { text: string; bg: string } {
  switch (kind) {
    case "fatal":
    case "db":
      return { text: "text-bad", bg: "bg-[rgba(220,38,38,.1)]" };
    case "warning":
    case "smtp":
    case "api":
      return { text: "text-warn", bg: "bg-[rgba(217,119,6,.12)]" };
    case "js":
      return { text: "text-brand", bg: "bg-[rgba(255,102,0,.1)]" };
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

export function countByKind(
  entries: ErrorLogEntry[],
  kind: ErrorKind,
): number {
  return entries.filter((e) => e.kind === kind).length;
}
