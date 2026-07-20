import type { Agency } from "@/lib/db/schema";

/**
 * What each tier is allowed to do. One file, because a limit enforced in two
 * places eventually disagrees with itself.
 *
 * ADR-003 sets the shape of the ladder but deliberately leaves prices unset
 * until there are ten paying customers. These are the *limits*, not the prices —
 * they gate behaviour and have to exist before the first client is created.
 */
export type PlanLimits = {
  label: string;
  maxClients: number;
  maxWebsitesPerClient: number;
  /** AI chat messages per calendar month, across the whole agency. */
  maxAiMessagesPerMonth: number;
  whiteLabel: boolean;
};

export const PLANS = {
  free: {
    label: "Free",
    maxClients: 1,
    maxWebsitesPerClient: 1,
    maxAiMessagesPerMonth: 100,
    whiteLabel: false,
  },
  pro: {
    label: "Pro",
    maxClients: Number.POSITIVE_INFINITY,
    maxWebsitesPerClient: Number.POSITIVE_INFINITY,
    maxAiMessagesPerMonth: 5_000,
    whiteLabel: false,
  },
  /** v2 — white-label and resale. Present so the type is complete. */
  agency: {
    label: "Agency",
    maxClients: Number.POSITIVE_INFINITY,
    maxWebsitesPerClient: Number.POSITIVE_INFINITY,
    maxAiMessagesPerMonth: 50_000,
    whiteLabel: true,
  },
} as const satisfies Record<Agency["plan"], PlanLimits>;

export function limitsFor(plan: Agency["plan"]): PlanLimits {
  return PLANS[plan];
}

export function formatLimit(n: number) {
  return Number.isFinite(n) ? String(n) : "Unlimited";
}
