import type {
  FormAnalyticsConfig,
  FormAnalyticsEventType,
  FormSubmissionMeta,
  FormUtmParams,
} from "@/lib/db/schema";

export const DEFAULT_ANALYTICS: FormAnalyticsConfig = {
  enabled: true,
  trackViews: true,
  trackStarts: true,
  trackFieldDropoff: true,
  trackUtm: true,
  trackCompletionTime: true,
};

export function normalizeAnalytics(
  raw?: FormAnalyticsConfig | null,
): FormAnalyticsConfig {
  return {
    enabled: raw?.enabled !== false,
    trackViews: raw?.trackViews !== false,
    trackStarts: raw?.trackStarts !== false,
    trackFieldDropoff: raw?.trackFieldDropoff !== false,
    trackUtm: raw?.trackUtm !== false,
    trackCompletionTime: raw?.trackCompletionTime !== false,
  };
}

export function normalizeUtm(raw?: FormUtmParams | null): FormUtmParams {
  const pick = (v?: string) => (v?.trim() ? v.trim().slice(0, 200) : undefined);
  const out: FormUtmParams = {};
  const source = pick(raw?.source);
  const medium = pick(raw?.medium);
  const campaign = pick(raw?.campaign);
  const term = pick(raw?.term);
  const content = pick(raw?.content);
  if (source) out.source = source;
  if (medium) out.medium = medium;
  if (campaign) out.campaign = campaign;
  if (term) out.term = term;
  if (content) out.content = content;
  return out;
}

export function utmHasValues(utm?: FormUtmParams | null): boolean {
  if (!utm) return false;
  return Boolean(
    utm.source || utm.medium || utm.campaign || utm.term || utm.content,
  );
}

export function normalizeSubmissionMeta(
  raw?: FormSubmissionMeta | null,
): FormSubmissionMeta {
  const utm = normalizeUtm(raw?.utm);
  const out: FormSubmissionMeta = {};
  if (utmHasValues(utm)) out.utm = utm;
  if (raw?.referrer?.trim()) out.referrer = raw.referrer.trim().slice(0, 2000);
  if (raw?.pageUrl?.trim()) out.pageUrl = raw.pageUrl.trim().slice(0, 2000);
  if (raw?.startedAt?.trim()) out.startedAt = raw.startedAt.trim().slice(0, 40);
  if (raw?.completedAt?.trim())
    out.completedAt = raw.completedAt.trim().slice(0, 40);
  if (
    typeof raw?.durationMs === "number" &&
    Number.isFinite(raw.durationMs) &&
    raw.durationMs >= 0
  ) {
    out.durationMs = Math.min(Math.round(raw.durationMs), 86_400_000);
  }
  if (raw?.sessionId?.trim()) out.sessionId = raw.sessionId.trim().slice(0, 80);
  if (raw?.ai && typeof raw.ai === "object") {
    out.ai = normalizeSubmissionAi(raw.ai);
  }
  if (raw?.scores && typeof raw.scores === "object") {
    out.scores = normalizeUniqueScores(raw.scores);
  }
  if (raw?.portalToken?.trim()) {
    out.portalToken = raw.portalToken.trim().slice(0, 200);
  }
  return out;
}

function normalizeUniqueScores(
  raw: NonNullable<FormSubmissionMeta["scores"]>,
): NonNullable<FormSubmissionMeta["scores"]> {
  const out: NonNullable<FormSubmissionMeta["scores"]> = {};
  for (const key of [
    "leadHealth",
    "complexity",
    "salesProbability",
    "clientReadiness",
    "roiPercent",
  ] as const) {
    const v = raw[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = Math.max(0, Math.min(key === "roiPercent" ? 10_000 : 100, Math.round(v)));
    }
  }
  if (typeof raw.estimatedDeliveryDays === "number" && Number.isFinite(raw.estimatedDeliveryDays)) {
    out.estimatedDeliveryDays = Math.max(0, Math.min(730, Math.round(raw.estimatedDeliveryDays)));
  }
  if (raw.budgetRecommendation?.trim()) {
    out.budgetRecommendation = raw.budgetRecommendation.trim().slice(0, 320);
  }
  if (raw.summary?.trim()) out.summary = raw.summary.trim().slice(0, 500);
  if (raw.roiLabel?.trim()) out.roiLabel = raw.roiLabel.trim().slice(0, 80);
  return out;
}

function normalizeSubmissionAi(
  raw: NonNullable<FormSubmissionMeta["ai"]>,
): NonNullable<FormSubmissionMeta["ai"]> {
  const out: NonNullable<FormSubmissionMeta["ai"]> = {};
  if (typeof raw.score === "number" && Number.isFinite(raw.score)) {
    out.score = Math.max(0, Math.min(100, Math.round(raw.score)));
  }
  if (typeof raw.spam === "boolean") out.spam = raw.spam;
  if (raw.spamReason?.trim()) out.spamReason = raw.spamReason.trim().slice(0, 240);
  if (typeof raw.duplicate === "boolean") out.duplicate = raw.duplicate;
  if (raw.duplicateOf?.trim()) out.duplicateOf = raw.duplicateOf.trim().slice(0, 80);
  if (raw.category?.trim()) out.category = raw.category.trim().slice(0, 60);
  if (raw.followUp?.trim()) out.followUp = raw.followUp.trim().slice(0, 800);
  if (raw.rewrittenMessage?.trim())
    out.rewrittenMessage = raw.rewrittenMessage.trim().slice(0, 5000);
  if (raw.model?.trim()) out.model = raw.model.trim().slice(0, 80);
  return out;
}

const EVENT_TYPES = new Set<FormAnalyticsEventType>([
  "view",
  "start",
  "field",
  "step",
  "complete",
  "abandon",
]);

export function isAnalyticsEventType(v: unknown): v is FormAnalyticsEventType {
  return typeof v === "string" && EVENT_TYPES.has(v as FormAnalyticsEventType);
}

export type FormAnalyticsSummary = {
  views: number;
  starts: number;
  completes: number;
  abandons: number;
  completionRate: number;
  abandonmentRate: number;
  avgCompletionMs: number | null;
  fieldDropoff: { key: string; focuses: number }[];
  utmSources: { label: string; n: number }[];
  daily: { day: string; views: number; starts: number; completes: number }[];
};

export function emptyAnalyticsSummary(): FormAnalyticsSummary {
  return {
    views: 0,
    starts: 0,
    completes: 0,
    abandons: 0,
    completionRate: 0,
    abandonmentRate: 0,
    avgCompletionMs: null,
    fieldDropoff: [],
    utmSources: [],
    daily: [],
  };
}

export function formatDuration(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** Build summary from raw event rows (already filtered to a form + range). */
export function summarizeAnalyticsEvents(
  rows: {
    eventType: string;
    fieldKey: string | null;
    durationMs: number | null;
    utm: FormUtmParams | null;
    createdAt: Date;
  }[],
): FormAnalyticsSummary {
  let views = 0;
  let starts = 0;
  let completes = 0;
  let abandons = 0;
  let durationSum = 0;
  let durationN = 0;
  const fieldCounts = new Map<string, number>();
  const utmCounts = new Map<string, number>();
  const dailyMap = new Map<
    string,
    { views: number; starts: number; completes: number }
  >();

  function dayKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  function bumpDay(
    d: Date,
    key: "views" | "starts" | "completes",
  ) {
    const k = dayKey(d);
    const cur = dailyMap.get(k) ?? { views: 0, starts: 0, completes: 0 };
    cur[key] += 1;
    dailyMap.set(k, cur);
  }

  for (const r of rows) {
    const t = r.eventType;
    if (t === "view") {
      views += 1;
      bumpDay(r.createdAt, "views");
    } else if (t === "start") {
      starts += 1;
      bumpDay(r.createdAt, "starts");
    } else if (t === "complete") {
      completes += 1;
      bumpDay(r.createdAt, "completes");
      if (typeof r.durationMs === "number" && r.durationMs >= 0) {
        durationSum += r.durationMs;
        durationN += 1;
      }
    } else if (t === "abandon") {
      abandons += 1;
    } else if (t === "field" && r.fieldKey) {
      fieldCounts.set(r.fieldKey, (fieldCounts.get(r.fieldKey) ?? 0) + 1);
    }

    const utm = normalizeUtm(r.utm);
    if (utmHasValues(utm)) {
      const label =
        [utm.source, utm.medium, utm.campaign].filter(Boolean).join(" / ") ||
        "utm";
      utmCounts.set(label, (utmCounts.get(label) ?? 0) + 1);
    }
  }

  const denom = Math.max(starts, 1);
  const completionRate = starts === 0 ? 0 : completes / starts;
  const abandonmentRate =
    starts === 0 ? 0 : Math.max(0, 1 - completionRate);

  return {
    views,
    starts,
    completes,
    abandons: abandons || Math.max(0, starts - completes),
    completionRate,
    abandonmentRate,
    avgCompletionMs: durationN ? Math.round(durationSum / durationN) : null,
    fieldDropoff: [...fieldCounts.entries()]
      .map(([key, focuses]) => ({ key, focuses }))
      .sort((a, b) => b.focuses - a.focuses)
      .slice(0, 20),
    utmSources: [...utmCounts.entries()]
      .map(([label, n]) => ({ label, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 12),
    daily: [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ day, ...v })),
  };
}
