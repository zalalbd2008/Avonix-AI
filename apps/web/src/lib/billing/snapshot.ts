import { count, eq } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import { agencies, clients, memberships, websites } from "@/lib/db/schema";
import type { Agency } from "@/lib/db/schema";
import { limitsFor } from "@/lib/plans";
import { catalogForAgencyPlan, formatMoney } from "./catalog";
import {
  mergeBillingOverrides,
  mergeBillingProfile,
  type BillingOverrides,
  type BillingProfile,
} from "./profile";
import { billingConfigured } from "./stripe";

export type BillingStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "suspended"
  | "expired"
  | "cancelling";

export type BillingSnapshot = {
  agencyId: string;
  agencyName: string;
  plan: Agency["plan"];
  planLabel: string;
  catalogLabel: string;
  status: BillingStatus;
  statusLabel: string;
  billingCycle: "month" | "year" | "trial" | "none";
  renewalDate: Date | null;
  nextCharge: string;
  planStarted: Date | null;
  planExpires: Date | null;
  cancelling: boolean;
  trialEndsAt: Date | null;
  hasStripeCustomer: boolean;
  hasSubscription: boolean;
  billingReady: boolean;
  profile: BillingProfile;
  overrides: BillingOverrides;
  usage: {
    clients: { used: number; limit: number };
    websites: { used: number; limit: number };
    users: { used: number; limit: number };
    ai: { used: number; limit: number };
  };
};

function mapStatus(opts: {
  status: string;
  cancelling: boolean;
  periodEnd: Date | null;
  trialEndsAt: Date | null;
  plan: string;
  suspended?: boolean;
}): { status: BillingStatus; label: string } {
  if (opts.suspended) return { status: "suspended", label: "Suspended" };
  if (opts.cancelling) return { status: "cancelling", label: "Cancelling" };
  if (opts.status === "past_due") return { status: "past_due", label: "Past due" };
  if (opts.status === "canceled" || opts.status === "suspended") {
    return { status: "suspended", label: "Suspended" };
  }
  if (opts.status === "trialing" || opts.trialEndsAt) {
    return { status: "trialing", label: "Trialing" };
  }
  if (opts.status === "active") {
    return { status: "active", label: "Active" };
  }
  return { status: "active", label: "Active" };
}

export async function loadBillingSnapshot(
  agencyId: string,
): Promise<BillingSnapshot> {
  const data = await withAgency(agencyId, async (tx) => {
    const [[agency], [clientCount], [websiteCount], [memberCount]] =
      await Promise.all([
        tx
          .select({
            name: agencies.name,
            plan: agencies.plan,
            status: agencies.status,
            periodEnd: agencies.currentPeriodEnd,
            cancelling: agencies.cancelAtPeriodEnd,
            trialEndsAt: agencies.trialEndsAt,
            customerId: agencies.stripeCustomerId,
            subscriptionId: agencies.stripeSubscriptionId,
            billingInterval: agencies.billingInterval,
            createdAt: agencies.createdAt,
            billingProfile: agencies.billingProfile,
            billingOverrides: agencies.billingOverrides,
          })
          .from(agencies)
          .where(eq(agencies.id, agencyId))
          .limit(1),
        tx.select({ n: count() }).from(clients),
        tx.select({ n: count() }).from(websites),
        tx.select({ n: count() }).from(memberships),
      ]);
    return {
      agency,
      clients: clientCount.n,
      websites: websiteCount.n,
      users: memberCount.n,
    };
  });

  const overrides = mergeBillingOverrides(data.agency.billingOverrides);
  const profile = mergeBillingProfile(data.agency.billingProfile, {
    companyName: data.agency.name,
  });

  const limits = limitsFor(data.agency.plan);
  const catalog = catalogForAgencyPlan(data.agency.plan);
  const mapped = mapStatus({
    status: data.agency.status,
    cancelling: data.agency.cancelling,
    periodEnd: data.agency.periodEnd,
    trialEndsAt: data.agency.trialEndsAt,
    plan: data.agency.plan,
    suspended: overrides.suspended,
  });

  const interval = data.agency.billingInterval;
  const billingCycle: BillingSnapshot["billingCycle"] =
    !data.agency.subscriptionId && data.agency.trialEndsAt
      ? "trial"
      : !data.agency.subscriptionId
        ? "none"
        : interval === "year"
          ? "year"
          : "month";

  const renewal = data.agency.periodEnd ?? data.agency.trialEndsAt;
  const price =
    billingCycle === "year" ? catalog.yearlyPrice : catalog.monthlyPrice;

  const websiteLimit = Number.isFinite(limits.maxWebsitesPerClient)
    ? limits.maxWebsitesPerClient * Math.max(1, data.clients) +
      (overrides.bonusWebsites ?? 0)
    : Number.POSITIVE_INFINITY;
  const clientLimit = overrides.maxClients ?? limits.maxClients;
  const userLimit = overrides.maxUsers ?? 30;
  const aiLimit =
    limits.maxAiMessagesPerMonth + (overrides.bonusAiCredits ?? 0);

  return {
    agencyId,
    agencyName: data.agency.name,
    plan: data.agency.plan,
    planLabel: limits.label,
    catalogLabel: catalog.label,
    status: mapped.status,
    statusLabel: mapped.label,
    billingCycle,
    renewalDate: renewal,
    nextCharge:
      !data.agency.subscriptionId || price == null
        ? "—"
        : formatMoney(
            price,
            billingCycle === "year" ? "year" : "month",
          ),
    planStarted: data.agency.createdAt,
    planExpires: data.agency.periodEnd ?? data.agency.trialEndsAt,
    cancelling: data.agency.cancelling,
    trialEndsAt: data.agency.trialEndsAt,
    hasStripeCustomer: Boolean(data.agency.customerId),
    hasSubscription: Boolean(data.agency.subscriptionId),
    billingReady: billingConfigured(),
    profile,
    overrides,
    usage: {
      clients: {
        used: data.clients,
        limit: Number.isFinite(clientLimit) ? clientLimit : Number.POSITIVE_INFINITY,
      },
      websites: {
        used: data.websites,
        limit: overrides.maxWebsites ?? websiteLimit,
      },
      users: { used: data.users, limit: userLimit },
      ai: { used: 0, limit: aiLimit },
    },
  };
}

export function formatBillingDate(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
