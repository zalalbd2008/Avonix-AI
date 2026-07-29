/**
 * Per-website insight state — stored on `websites.settings.insights`.
 * Generated insight rows are recomputed from reports; only user actions persist.
 */

export type InsightUserStatus = "new" | "applied" | "dismissed";

export type InsightKind = "suggestion" | "fix" | "insight" | "opportunity";

export type InsightTone = "acc" | "warn" | "ok" | "mut";

export type InsightItem = {
  id: string;
  title: string;
  recommendation: string;
  kind: InsightKind;
  tone: InsightTone;
  href?: string;
  hrefLabel?: string;
};

export type InsightsSettings = {
  lastRefreshedAt?: string;
  itemStates?: Record<
    string,
    { status: InsightUserStatus; at: string }
  >;
};

export type InsightsSnapshot = {
  website: { id: string; name: string; url: string; clientId: string };
  stats: {
    newCount: number;
    actionCount: number;
    leadTrend: string | null;
    appliedCount: number;
  };
  items: InsightItem[];
  generatedAt: string;
  hasData: boolean;
};

export function mergeInsightsSettings(
  partial?: Partial<InsightsSettings> | null,
): InsightsSettings {
  return {
    lastRefreshedAt: partial?.lastRefreshedAt ?? "",
    itemStates: partial?.itemStates ?? {},
  };
}

export function insightKindLabel(kind: InsightKind): string {
  switch (kind) {
    case "suggestion":
      return "Suggestion";
    case "fix":
      return "Fix available";
    case "opportunity":
      return "Opportunity";
    default:
      return "Insight";
  }
}

export function insightToneClasses(tone: InsightTone): {
  text: string;
  bg: string;
} {
  switch (tone) {
    case "acc":
      return { text: "text-brand", bg: "bg-[rgba(255,102,0,.1)]" };
    case "warn":
      return { text: "text-warn", bg: "bg-[rgba(217,119,6,.12)]" };
    case "ok":
      return { text: "text-ok", bg: "bg-[rgba(13,148,136,.1)]" };
    default:
      return { text: "text-muted", bg: "bg-[#f1f4f8]" };
  }
}

export function userStatusForItem(
  settings: InsightsSettings,
  id: string,
): InsightUserStatus {
  return settings.itemStates?.[id]?.status ?? "new";
}

export function countByUserStatus(
  items: InsightItem[],
  settings: InsightsSettings,
  status: InsightUserStatus,
): number {
  return items.filter((i) => userStatusForItem(settings, i.id) === status)
    .length;
}
