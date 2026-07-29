/**
 * Per-website uptime / availability monitor settings.
 * Stored on `websites.settings.uptime` (JSON) — check runner ships separately.
 *
 * Probe target is always the website URL (site is already selected in nav).
 * Alert mail goes to the address configured under Email (SMTP / campaigns).
 */

export type UptimeIntervalMinutes = 1 | 5 | 15 | 30 | 60;

export type UptimeRegion = "us" | "eu" | "apac";

export type UptimeSettings = {
  enabled: boolean;
  intervalMinutes: UptimeIntervalMinutes;
  timeoutSeconds: number;
  /** Comma-friendly list; normalized to unique ints. */
  expectedStatusCodes: number[];
  regions: UptimeRegion[];
  /** Optional body keyword that must appear when up. */
  keyword: string;
  sslExpiryWatch: boolean;
  sslWarnDays: number;
  alertOnDown: boolean;
  alertOnRecovery: boolean;
  /** Runtime probe state (written by cron). */
  lastStatus?: "up" | "down" | "unknown";
  lastCheckedAt?: string;
  lastHttpStatus?: number;
  lastError?: string;
};

export const UPTIME_INTERVALS: {
  id: UptimeIntervalMinutes;
  label: string;
}[] = [
  { id: 1, label: "1 min" },
  { id: 5, label: "5 min" },
  { id: 15, label: "15 min" },
  { id: 30, label: "30 min" },
  { id: 60, label: "60 min" },
];

export const UPTIME_REGIONS: { id: UptimeRegion; label: string }[] = [
  { id: "us", label: "United States" },
  { id: "eu", label: "Europe" },
  { id: "apac", label: "Asia Pacific" },
];

export const DEFAULT_UPTIME: UptimeSettings = {
  enabled: false,
  intervalMinutes: 5,
  timeoutSeconds: 10,
  expectedStatusCodes: [200, 201, 204],
  regions: ["us", "eu"],
  keyword: "",
  sslExpiryWatch: true,
  sslWarnDays: 14,
  alertOnDown: true,
  alertOnRecovery: true,
};

function clampInt(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeCodes(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    const codes = raw
      .map((c) => Number(c))
      .filter((c) => Number.isFinite(c) && c >= 100 && c < 600)
      .map((c) => Math.round(c));
    return [...new Set(codes)].slice(0, 12);
  }
  if (typeof raw === "string") {
    return normalizeCodes(
      raw
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number),
    );
  }
  return [...DEFAULT_UPTIME.expectedStatusCodes];
}

function normalizeRegions(raw: unknown): UptimeRegion[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...DEFAULT_UPTIME.regions];
  }
  const allowed = new Set(UPTIME_REGIONS.map((r) => r.id));
  const next = raw.filter((r): r is UptimeRegion =>
    allowed.has(r as UptimeRegion),
  );
  return next.length ? [...new Set(next)] : [...DEFAULT_UPTIME.regions];
}

function normalizeInterval(raw: unknown): UptimeIntervalMinutes {
  const n = Number(raw);
  if (n === 1 || n === 5 || n === 15 || n === 30 || n === 60) return n;
  return DEFAULT_UPTIME.intervalMinutes;
}

export function mergeUptimeSettings(
  raw?: Partial<UptimeSettings> | null,
): UptimeSettings {
  if (!raw) return structuredClone(DEFAULT_UPTIME);
  return {
    enabled: Boolean(raw.enabled),
    intervalMinutes: normalizeInterval(raw.intervalMinutes),
    timeoutSeconds: clampInt(
      Number(raw.timeoutSeconds),
      3,
      60,
      DEFAULT_UPTIME.timeoutSeconds,
    ),
    expectedStatusCodes: normalizeCodes(raw.expectedStatusCodes),
    regions: normalizeRegions(raw.regions),
    keyword: typeof raw.keyword === "string" ? raw.keyword.trim() : "",
    sslExpiryWatch: raw.sslExpiryWatch !== false,
    sslWarnDays: clampInt(
      Number(raw.sslWarnDays),
      1,
      90,
      DEFAULT_UPTIME.sslWarnDays,
    ),
    alertOnDown: raw.alertOnDown !== false,
    alertOnRecovery: raw.alertOnRecovery !== false,
    lastStatus:
      raw.lastStatus === "up" || raw.lastStatus === "down" || raw.lastStatus === "unknown"
        ? raw.lastStatus
        : undefined,
    lastCheckedAt:
      typeof raw.lastCheckedAt === "string" ? raw.lastCheckedAt : undefined,
    lastHttpStatus:
      typeof raw.lastHttpStatus === "number" ? raw.lastHttpStatus : undefined,
    lastError: typeof raw.lastError === "string" ? raw.lastError.slice(0, 500) : undefined,
  };
}

export function uptimeConfigScore(settings: UptimeSettings): number {
  let score = 0;
  if (settings.enabled) score += 45;
  if (settings.regions.length >= 2) score += 20;
  if (settings.alertOnDown) score += 15;
  if (settings.sslExpiryWatch) score += 15;
  if (settings.expectedStatusCodes.length > 0) score += 5;
  return Math.min(100, score);
}
