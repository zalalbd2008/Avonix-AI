import type { Agency } from "@/lib/db/schema";

/**
 * What each tier is allowed to do. One file, because a limit enforced in two
 * places eventually disagrees with itself.
 *
 * Product ladder: Starter · Professional · Agency · Enterprise.
 * These are the *limits*, not the Stripe prices.
 */
export type PlanLimits = {
  label: string;
  maxClients: number;
  maxWebsitesPerClient: number;
  /** AI chat messages per calendar month, across the whole agency. */
  maxAiMessagesPerMonth: number;
  whiteLabel: boolean;
};

export const AGENCY_PLAN_ORDER = [
  "starter",
  "professional",
  "agency",
  "enterprise",
] as const satisfies readonly Agency["plan"][];

export type AgencyPlan = (typeof AGENCY_PLAN_ORDER)[number];

export const PLANS = {
  starter: {
    label: "Starter",
    maxClients: 1,
    maxWebsitesPerClient: 1,
    maxAiMessagesPerMonth: 100,
    whiteLabel: false,
  },
  professional: {
    label: "Professional",
    maxClients: 5,
    maxWebsitesPerClient: 5,
    maxAiMessagesPerMonth: 5_000,
    whiteLabel: false,
  },
  agency: {
    label: "Agency",
    maxClients: 10,
    maxWebsitesPerClient: 5,
    maxAiMessagesPerMonth: 50_000,
    whiteLabel: true,
  },
  enterprise: {
    label: "Enterprise",
    maxClients: Number.POSITIVE_INFINITY,
    maxWebsitesPerClient: Number.POSITIVE_INFINITY,
    maxAiMessagesPerMonth: Number.POSITIVE_INFINITY,
    whiteLabel: true,
  },
} as const satisfies Record<Agency["plan"], PlanLimits>;

export function limitsFor(plan: Agency["plan"]): PlanLimits {
  return PLANS[plan];
}

/** Next tier up the ladder, or null on Enterprise. */
export function nextUpgradeablePlan(
  plan: Agency["plan"],
): Exclude<Agency["plan"], "enterprise"> | null {
  const i = AGENCY_PLAN_ORDER.indexOf(plan);
  if (i < 0 || i >= AGENCY_PLAN_ORDER.length - 1) return null;
  return AGENCY_PLAN_ORDER[i + 1] as Exclude<Agency["plan"], "enterprise">;
}

/**
 * Plan limits with Platform Owner / billing overrides applied.
 * Positive override values replace the plan default; omit a key to keep it.
 */
export function effectivePlanLimits(
  plan: Agency["plan"],
  overrides?: {
    maxClients?: number;
    maxWebsites?: number;
    bonusAiCredits?: number;
  } | null,
): PlanLimits {
  const base = limitsFor(plan);
  return {
    ...base,
    maxClients:
      overrides?.maxClients != null && overrides.maxClients > 0
        ? overrides.maxClients
        : base.maxClients,
    maxWebsitesPerClient:
      overrides?.maxWebsites != null && overrides.maxWebsites > 0
        ? overrides.maxWebsites
        : base.maxWebsitesPerClient,
    maxAiMessagesPerMonth:
      Number.isFinite(base.maxAiMessagesPerMonth)
        ? base.maxAiMessagesPerMonth + Math.max(0, overrides?.bonusAiCredits ?? 0)
        : Number.POSITIVE_INFINITY,
  };
}

export function formatLimit(n: number) {
  return Number.isFinite(n) ? String(n) : "Unlimited";
}
