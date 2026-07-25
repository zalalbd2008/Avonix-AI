import type { FormAppointmentConfig } from "@/lib/db/schema";

export const DEFAULT_APPOINTMENT_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

/** Mon–Fri */
export const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5];

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const COMMON_TIMEZONES = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Istanbul",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export type ResolvedAppointmentConfig = {
  minDaysFromToday: number;
  maxDaysAhead: number;
  weekdays: number[];
  slots: string[];
  slotDurationMin: number;
  showTimezone: boolean;
};

export const DEFAULT_APPOINTMENT_CONFIG: ResolvedAppointmentConfig = {
  minDaysFromToday: 0,
  maxDaysAhead: 60,
  weekdays: [...DEFAULT_WEEKDAYS],
  slots: [...DEFAULT_APPOINTMENT_SLOTS],
  slotDurationMin: 30,
  showTimezone: true,
};

export function resolveAppointmentConfig(
  raw?: FormAppointmentConfig | null,
): ResolvedAppointmentConfig {
  const weekdays = normalizeWeekdays(raw?.weekdays);
  const slots = normalizeSlots(raw?.slots);
  return {
    minDaysFromToday: clampInt(
      raw?.minDaysFromToday,
      0,
      365,
      DEFAULT_APPOINTMENT_CONFIG.minDaysFromToday,
    ),
    maxDaysAhead: clampInt(
      raw?.maxDaysAhead,
      1,
      365,
      DEFAULT_APPOINTMENT_CONFIG.maxDaysAhead,
    ),
    weekdays,
    slots,
    slotDurationMin: clampInt(
      raw?.slotDurationMin,
      5,
      480,
      DEFAULT_APPOINTMENT_CONFIG.slotDurationMin,
    ),
    showTimezone: raw?.showTimezone !== false,
  };
}

function normalizeWeekdays(raw?: number[]): number[] {
  if (!Array.isArray(raw) || !raw.length) {
    return [...DEFAULT_WEEKDAYS];
  }
  const set = new Set(
    raw
      .map((n) => Math.round(Number(n)))
      .filter((n) => n >= 0 && n <= 6),
  );
  const out = [...set].sort((a, b) => a - b);
  return out.length ? out : [...DEFAULT_WEEKDAYS];
}

const SLOT_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function normalizeSlots(raw?: string[]): string[] {
  if (!Array.isArray(raw) || !raw.length) {
    return [...DEFAULT_APPOINTMENT_SLOTS];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    const t = String(s).trim();
    if (!SLOT_RE.test(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 48) break;
  }
  return out.length ? out.sort() : [...DEFAULT_APPOINTMENT_SLOTS];
}

function clampInt(
  v: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof v !== "number" || Number.isNaN(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

/** Stored value: `YYYY-MM-DD|HH:mm` or `YYYY-MM-DD|HH:mm|Timezone`. */
export type AppointmentValue = {
  date: string;
  time: string;
  timezone?: string;
};

export function parseAppointmentValue(
  raw?: string | null,
): AppointmentValue | null {
  if (!raw?.trim()) return null;
  const parts = raw.trim().split("|");
  const date = parts[0] ?? "";
  const time = parts[1] ?? "";
  const timezone = parts[2]?.trim() || undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !SLOT_RE.test(time)) return null;
  return { date, time, timezone };
}

export function serializeAppointmentValue(v: AppointmentValue): string {
  const base = `${v.date}|${v.time}`;
  return v.timezone?.trim() ? `${base}|${v.timezone.trim()}` : base;
}

export function formatAppointmentSummary(raw?: string | null): string {
  const v = parseAppointmentValue(raw);
  if (!v) return "";
  const d = new Date(`${v.date}T${v.time}:00`);
  const dateLabel = Number.isNaN(d.getTime())
    ? v.date
    : d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  const timeLabel = formatSlotLabel(v.time);
  return v.timezone
    ? `${dateLabel} · ${timeLabel} · ${v.timezone}`
    : `${dateLabel} · ${timeLabel}`;
}

export function formatSlotLabel(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Local YYYY-MM-DD for a Date. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function isDateBookable(
  dateKey: string,
  cfg: ResolvedAppointmentConfig,
  today = startOfDay(new Date()),
): boolean {
  const [y, m, day] = dateKey.split("-").map(Number);
  if (!y || !m || !day) return false;
  const d = new Date(y, m - 1, day);
  if (Number.isNaN(d.getTime())) return false;
  const min = addDays(today, cfg.minDaysFromToday);
  const max = addDays(today, cfg.maxDaysAhead);
  if (d < min || d > max) return false;
  return cfg.weekdays.includes(d.getDay());
}

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function timezoneOptions(preferred?: string): string[] {
  const set = new Set(COMMON_TIMEZONES);
  if (preferred?.trim()) set.add(preferred.trim());
  try {
    const detected = detectTimezone();
    if (detected) set.add(detected);
  } catch {
    /* ignore */
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
