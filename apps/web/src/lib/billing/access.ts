import { and, eq, isNull } from "drizzle-orm";
import type { ActiveContext } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { mergeBillingOverrides } from "./profile";

/** Owners/admins (`*`) or custom roles with `billing.edit` may change billing. */
export function canManageBilling(ctx: Pick<ActiveContext, "permissions">) {
  if (ctx.permissions === "*") return true;
  return ctx.permissions.includes("billing.edit");
}

export function billingEditDenied() {
  return {
    ok: false as const,
    error: "You need billing manage permission to do that.",
  };
}

/**
 * Whether the org may use the product workspace.
 * Complimentary (Platform Owner grant) or an active Stripe subscription.
 */
export async function agencyHasPaidAccess(agencyId: string): Promise<boolean> {
  const [row] = await withAgency(agencyId, (tx) =>
    tx
      .select({
        subscriptionId: agencies.stripeSubscriptionId,
        periodEnd: agencies.currentPeriodEnd,
        cancelAtPeriodEnd: agencies.cancelAtPeriodEnd,
        status: agencies.status,
        overrides: agencies.billingOverrides,
      })
      .from(agencies)
      .where(and(eq(agencies.id, agencyId), isNull(agencies.deletedAt)))
      .limit(1),
  );

  if (!row) return false;

  const overrides = mergeBillingOverrides(row.overrides);
  if (overrides.complimentary) return true;
  if (overrides.suspended) return false;

  if (row.subscriptionId) {
    if (row.status === "past_due") return true;
    if (row.status === "canceled") {
      return Boolean(row.periodEnd && row.periodEnd > new Date());
    }
    return true;
  }

  if (row.cancelAtPeriodEnd && row.periodEnd && row.periodEnd > new Date()) {
    return true;
  }

  return false;
}
