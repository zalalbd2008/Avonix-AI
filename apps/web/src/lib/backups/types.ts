/**
 * Per-website backup monitor + queue — stored on `websites.settings.backups`.
 * Avonix does not store site files; it watches destination config and queues
 * backup runs for the connector / host plugin.
 */

import type { OptionalIntegrationId } from "@/lib/integrations/types";

export type BackupDestinationId =
  | OptionalIntegrationId
  | "host"
  | "none";

export type BackupSchedule = "daily" | "weekly" | "manual";

export type BackupRunStatus =
  | "success"
  | "failed"
  | "recovered"
  | "pending"
  | "running";

export type BackupHistoryEntry = {
  id: string;
  label: string;
  detail: string;
  status: BackupRunStatus;
  destination: BackupDestinationId;
  sizeLabel: string;
  createdAt: string;
  finishedAt?: string;
  /** 0–100 while running; 100 on success. */
  progress?: number;
};

export type BackupsSettings = {
  enabled: boolean;
  schedule: BackupSchedule;
  /** 0–23 UTC hour for daily / weekly runs. */
  runHourUtc: number;
  /** Day for weekly schedule (0 = Sunday). */
  runDayUtc: number;
  retentionDays: number;
  destination: BackupDestinationId;
  notifyOnFailure: boolean;
  /** Include uploads folder in full backup requests. */
  includeUploads: boolean;
  /** Include database dump in full backup requests. */
  includeDatabase: boolean;
  history: BackupHistoryEntry[];
};

export type BackupsSnapshot = {
  website: {
    id: string;
    name: string;
    url: string;
    status: string;
  };
  stats: {
    lastBackupLabel: string;
    lastBackupTone: string;
    restorePoints: number;
    sizeLabel: string;
    destinationLabel: string;
  };
  destinationOptions: { id: BackupDestinationId; label: string; connected: boolean }[];
  history: BackupHistoryEntry[];
};

export const BACKUP_DESTINATIONS: {
  id: BackupDestinationId;
  label: string;
  integrationId?: OptionalIntegrationId;
}[] = [
  { id: "none", label: "Not configured" },
  { id: "host", label: "Host / plugin (local)" },
  { id: "google_drive", label: "Google Drive", integrationId: "google_drive" },
  { id: "dropbox", label: "Dropbox", integrationId: "dropbox" },
  { id: "onedrive", label: "OneDrive", integrationId: "onedrive" },
  { id: "s3", label: "S3 Storage", integrationId: "s3" },
];

export const BACKUP_SCHEDULES: { id: BackupSchedule; label: string; hint: string }[] =
  [
    { id: "daily", label: "Daily", hint: "Once per day at the chosen hour" },
    { id: "weekly", label: "Weekly", hint: "Once per week on the chosen day" },
    { id: "manual", label: "Manual only", hint: "Run when you click Backup now" },
  ];

export const RETENTION_OPTIONS = [7, 14, 30, 60, 90] as const;

export const DEFAULT_BACKUPS: BackupsSettings = {
  enabled: false,
  schedule: "daily",
  runHourUtc: 4,
  runDayUtc: 0,
  retentionDays: 30,
  destination: "none",
  notifyOnFailure: true,
  includeUploads: true,
  includeDatabase: true,
  history: [],
};

const STATUSES = new Set<BackupRunStatus>([
  "success",
  "failed",
  "recovered",
  "pending",
  "running",
]);

const SCHEDULES = new Set<BackupSchedule>(["daily", "weekly", "manual"]);

export function newBackupId(): string {
  return `bkp_${Math.random().toString(36).slice(2, 10)}`;
}

export function mergeBackupsSettings(
  partial?: Partial<BackupsSettings> | null,
): BackupsSettings {
  const raw = partial ?? {};
  return {
    enabled: Boolean(raw.enabled),
    schedule: SCHEDULES.has(raw.schedule as BackupSchedule)
      ? (raw.schedule as BackupSchedule)
      : DEFAULT_BACKUPS.schedule,
    runHourUtc: clamp(raw.runHourUtc, 0, 23, DEFAULT_BACKUPS.runHourUtc),
    runDayUtc: clamp(raw.runDayUtc, 0, 6, DEFAULT_BACKUPS.runDayUtc),
    retentionDays: RETENTION_OPTIONS.includes(
      raw.retentionDays as (typeof RETENTION_OPTIONS)[number],
    )
      ? (raw.retentionDays as number)
      : DEFAULT_BACKUPS.retentionDays,
    destination: normalizeDestination(raw.destination),
    notifyOnFailure: raw.notifyOnFailure !== false,
    includeUploads: raw.includeUploads !== false,
    includeDatabase: raw.includeDatabase !== false,
    history: normalizeHistory(raw.history),
  };
}

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

function normalizeDestination(raw: unknown): BackupDestinationId {
  const allowed = new Set(BACKUP_DESTINATIONS.map((d) => d.id));
  if (typeof raw === "string" && allowed.has(raw as BackupDestinationId)) {
    return raw as BackupDestinationId;
  }
  return "none";
}

function normalizeHistory(raw: unknown): BackupHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is BackupHistoryEntry => {
      if (!row || typeof row !== "object") return false;
      const h = row as BackupHistoryEntry;
      return (
        typeof h.id === "string" &&
        typeof h.label === "string" &&
        typeof h.detail === "string" &&
        STATUSES.has(h.status) &&
        typeof h.createdAt === "string"
      );
    })
    .map((h) => {
      const progress = normalizeProgress(h.progress, h.status);
      return progress === undefined ? h : { ...h, progress };
    })
    .slice(0, 100);
}

function normalizeProgress(
  raw: unknown,
  status: BackupRunStatus,
): number | undefined {
  if (status === "success") return 100;
  if (status === "pending") return typeof raw === "number" ? clampProgress(raw) : 0;
  if (status === "running") {
    if (typeof raw === "number") return clampProgress(raw);
    return 5;
  }
  if (typeof raw === "number") return clampProgress(raw);
  return undefined;
}

function clampProgress(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Best-effort progress for UI when connector has not reported yet. */
export function backupProgressPercent(entry: BackupHistoryEntry): number {
  if (typeof entry.progress === "number") return clampProgress(entry.progress);
  switch (entry.status) {
    case "success":
      return 100;
    case "running":
      return 5;
    case "pending":
      return 0;
    default:
      return 0;
  }
}

export function backupsConfigScore(settings: BackupsSettings): number {
  let score = 10;
  if (settings.destination !== "none") score += 25;
  if (settings.enabled) score += 25;
  if (settings.history.some((h) => h.status === "success")) score += 25;
  if (settings.notifyOnFailure) score += 10;
  if (settings.includeDatabase && settings.includeUploads) score += 5;
  return Math.min(100, score);
}

export function backupStatusLabel(status: BackupRunStatus): string {
  switch (status) {
    case "success":
      return "Success";
    case "failed":
      return "Failed";
    case "recovered":
      return "Recovered";
    case "running":
      return "Running";
    default:
      return "Queued";
  }
}

export function backupStatusTone(status: BackupRunStatus): {
  text: string;
  bg: string;
} {
  switch (status) {
    case "success":
      return { text: "text-ok", bg: "bg-[rgba(13,148,136,.1)]" };
    case "failed":
      return { text: "text-bad", bg: "bg-[rgba(220,38,38,.1)]" };
    case "recovered":
      return { text: "text-warn", bg: "bg-[rgba(217,119,6,.12)]" };
    case "running":
      return { text: "text-brand", bg: "bg-[rgba(255,102,0,.1)]" };
    default:
      return { text: "text-muted", bg: "bg-[#f1f4f8]" };
  }
}

export function destinationLabel(id: BackupDestinationId): string {
  return BACKUP_DESTINATIONS.find((d) => d.id === id)?.label ?? "Unknown";
}

export function formatRunHour(hour: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${suffix} UTC`;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function formatRunDay(day: number): string {
  return DAY_NAMES[day] ?? "Sunday";
}
