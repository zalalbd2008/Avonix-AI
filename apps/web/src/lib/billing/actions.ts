"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import type { Agency } from "@/lib/db/schema";
import { billingEditDenied, canManageBilling } from "./access";
import type { BillingInterval } from "./catalog";
import {
  mergeBillingOverrides,
  mergeBillingProfile,
  type BillingOverrides,
  type BillingProfile,
} from "./profile";
import { linkCustomer, syncSubscription } from "./sync";
import { intervalOf, resolveCheckoutPriceId, stripe } from "./stripe";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function revalidateBilling() {
  revalidatePath("/billing");
  revalidatePath("/billing/subscription");
  revalidatePath("/billing/plans");
  revalidatePath("/billing/usage");
  revalidatePath("/billing/payment-methods");
  revalidatePath("/billing/history");
  revalidatePath("/billing/invoices");
  revalidatePath("/billing/tax");
  revalidatePath("/billing/auto-renewal");
  revalidatePath("/billing/settings");
}

/** Start a Stripe Checkout session for an upgrade. Returns the URL to send them to. */
export async function startCheckout(
  plan: "starter" | "professional" | "agency" | "enterprise",
  interval: BillingInterval = "month",
) {
  const ctx = await requireAgency();
  if (!canManageBilling(ctx)) return billingEditDenied();
  return startCheckoutForAgency(ctx.agencyId, plan, interval, {
    successUrl: "/billing?upgraded=1",
    cancelUrl: "/billing/plans",
  });
}

/**
 * Checkout for a specific agency the caller owns/admins.
 * Used by self-serve org create (before paid access is unlocked).
 */
export async function startCheckoutForAgency(
  agencyId: string,
  plan: "starter" | "professional" | "agency" | "enterprise",
  interval: BillingInterval = "month",
  urls?: { successUrl?: string; cancelUrl?: string },
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { requireUser } = await import("@/lib/auth/session");
  const user = await requireUser();

  const { isMemberOf } = await import("@/lib/agency/organizations");
  if (!(await isMemberOf(user.userId, agencyId))) {
    return { ok: false, error: "You are not a member of that organization." };
  }

  if (plan === "enterprise") {
    return {
      ok: false,
      error: "Enterprise plans are arranged with sales — email hello@avonix.ai.",
    };
  }

  const client = stripe();
  if (!client) return { ok: false, error: "Billing is not configured yet." };

  const price = await resolveCheckoutPriceId(plan, interval);
  if (!price) {
    return {
      ok: false,
      error:
        interval === "year"
          ? `No yearly price is configured for ${plan}. Set STRIPE_PRICE_*_YEARLY or STRIPE_PRODUCT_ID.`
          : `No price is configured for the ${plan} plan. Set STRIPE_PRICE_* or STRIPE_PRODUCT_ID.`,
    };
  }

  const [agency] = await withAgency(agencyId, (tx) =>
    tx
      .select({ customerId: agencies.stripeCustomerId, name: agencies.name })
      .from(agencies)
      .where(eq(agencies.id, agencyId))
      .limit(1),
  );

  const base = appUrl();
  const successPath = urls?.successUrl ?? "/billing?upgraded=1";
  const cancelPath = urls?.cancelUrl ?? "/billing/plans";

  try {
    let customerId = agency?.customerId ?? null;
    if (!customerId) {
      const customer = await client.customers.create({
        name: agency?.name,
        email: user.userEmail,
        metadata: { agency_id: agencyId },
      });
      customerId = customer.id;
      await linkCustomer(agencyId, customerId);
    }

    const session = await client.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      client_reference_id: agencyId,
      metadata: { agency_id: agencyId, interval, plan },
      subscription_data: {
        metadata: { agency_id: agencyId, interval, plan },
      },
      success_url: `${base}${successPath.startsWith("/") ? successPath : `/${successPath}`}`,
      cancel_url: `${base}${cancelPath.startsWith("/") ? cancelPath : `/${cancelPath}`}`,
      allow_promotion_codes: true,
    });

    if (!session.url) return { ok: false, error: "Stripe returned no checkout URL." };
    return { ok: true, url: session.url };
  } catch (e) {
    console.error("startCheckoutForAgency failed", e);
    return { ok: false, error: "Could not start checkout. Try again." };
  }
}

/**
 * Open Stripe's customer portal.
 *
 * Card updates, invoices, plan changes and cancellation all live there. Building
 * our own would mean handling PCI-adjacent flows for no product gain.
 */
export async function openBillingPortal() {
  const ctx = await requireAgency();
  if (!canManageBilling(ctx)) return billingEditDenied();

  const client = stripe();
  if (!client) return { ok: false as const, error: "Billing is not configured yet." };

  const [agency] = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({ customerId: agencies.stripeCustomerId })
      .from(agencies)
      .where(eq(agencies.id, ctx.agencyId))
      .limit(1),
  );

  if (!agency?.customerId) {
    return { ok: false as const, error: "There is no subscription to manage yet." };
  }

  try {
    const session = await client.billingPortal.sessions.create({
      customer: agency.customerId,
      return_url: `${appUrl()}/billing`,
    });
    return { ok: true as const, url: session.url };
  } catch (e) {
    console.error("openBillingPortal failed", e);
    return { ok: false as const, error: "Could not open the billing portal." };
  }
}

/** Enable or disable auto-renewal via Stripe cancel_at_period_end. */
export async function setAutoRenewal(enabled: boolean) {
  const ctx = await requireAgency();
  if (!canManageBilling(ctx)) return billingEditDenied();

  const client = stripe();
  if (!client) return { ok: false as const, error: "Billing is not configured yet." };

  const [agency] = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        subscriptionId: agencies.stripeSubscriptionId,
      })
      .from(agencies)
      .where(eq(agencies.id, ctx.agencyId))
      .limit(1),
  );

  if (!agency?.subscriptionId) {
    return { ok: false as const, error: "No active subscription to update." };
  }

  try {
    const sub = await client.subscriptions.update(agency.subscriptionId, {
      cancel_at_period_end: !enabled,
    });
    await syncSubscription(sub, new Date());
    revalidateBilling();
    return { ok: true as const };
  } catch (e) {
    console.error("setAutoRenewal failed", e);
    return { ok: false as const, error: "Could not update auto renewal." };
  }
}

/** Switch the current subscription to annual (or monthly) pricing. */
export async function switchBillingInterval(interval: BillingInterval) {
  const ctx = await requireAgency();
  if (!canManageBilling(ctx)) return billingEditDenied();

  const client = stripe();
  if (!client) return { ok: false as const, error: "Billing is not configured yet." };

  const [agency] = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        plan: agencies.plan,
        subscriptionId: agencies.stripeSubscriptionId,
        billingInterval: agencies.billingInterval,
      })
      .from(agencies)
      .where(eq(agencies.id, ctx.agencyId))
      .limit(1),
  );

  if (!agency?.subscriptionId || agency.plan === "starter") {
    return { ok: false as const, error: "Upgrade to a paid plan first." };
  }
  if (agency.billingInterval === interval) {
    return { ok: false as const, error: `Already on ${interval}ly billing.` };
  }

  const price = await resolveCheckoutPriceId(agency.plan, interval);
  if (!price) {
    return {
      ok: false as const,
      error: `No ${interval}ly Stripe price configured for this plan.`,
    };
  }

  try {
    const current = await client.subscriptions.retrieve(agency.subscriptionId);
    const itemId = current.items.data[0]?.id;
    if (!itemId) return { ok: false as const, error: "Subscription has no items." };

    const sub = await client.subscriptions.update(agency.subscriptionId, {
      items: [{ id: itemId, price }],
      proration_behavior: "create_prorations",
    });
    await syncSubscription(sub, new Date());
    revalidateBilling();
    return { ok: true as const, interval: intervalOf(sub) ?? interval };
  } catch (e) {
    console.error("switchBillingInterval failed", e);
    return { ok: false as const, error: "Could not switch billing interval." };
  }
}

export async function setDefaultPaymentMethod(paymentMethodId: string) {
  const ctx = await requireAgency();
  if (!canManageBilling(ctx)) return billingEditDenied();

  const client = stripe();
  if (!client) return { ok: false as const, error: "Billing is not configured yet." };

  const [agency] = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({ customerId: agencies.stripeCustomerId })
      .from(agencies)
      .where(eq(agencies.id, ctx.agencyId))
      .limit(1),
  );
  if (!agency?.customerId) {
    return { ok: false as const, error: "No Stripe customer yet." };
  }

  try {
    await client.customers.update(agency.customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    revalidatePath("/billing/payment-methods");
    revalidatePath("/billing");
    return { ok: true as const };
  } catch (e) {
    console.error("setDefaultPaymentMethod failed", e);
    return { ok: false as const, error: "Could not update default card." };
  }
}

export async function removePaymentMethod(paymentMethodId: string) {
  const ctx = await requireAgency();
  if (!canManageBilling(ctx)) return billingEditDenied();

  const client = stripe();
  if (!client) return { ok: false as const, error: "Billing is not configured yet." };

  try {
    await client.paymentMethods.detach(paymentMethodId);
    revalidatePath("/billing/payment-methods");
    revalidatePath("/billing");
    return { ok: true as const };
  } catch (e) {
    console.error("removePaymentMethod failed", e);
    return { ok: false as const, error: "Could not remove that payment method." };
  }
}

export async function saveBillingProfile(input: Partial<BillingProfile>) {
  const ctx = await requireAgency();
  if (!canManageBilling(ctx)) return billingEditDenied();

  const [current] = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({ profile: agencies.billingProfile, name: agencies.name })
      .from(agencies)
      .where(eq(agencies.id, ctx.agencyId))
      .limit(1),
  );

  const next = mergeBillingProfile(current?.profile, {
    companyName: current?.name ?? "",
    billingEmail: ctx.userEmail,
  });
  Object.assign(next, sanitizeProfile(input));
  if (input.notifications) {
    next.notifications = {
      ...next.notifications,
      ...input.notifications,
    };
  }

  await withAgency(ctx.agencyId, (tx) =>
    tx
      .update(agencies)
      .set({ billingProfile: next, updatedAt: new Date() })
      .where(eq(agencies.id, ctx.agencyId)),
  );

  revalidatePath("/billing/tax");
  revalidatePath("/billing/settings");
  return { ok: true as const };
}

function sanitizeProfile(input: Partial<BillingProfile>): Partial<BillingProfile> {
  const out: Partial<BillingProfile> = {};
  const copy = (k: keyof Omit<BillingProfile, "notifications">) => {
    const v = input[k];
    if (typeof v === "string") out[k] = v.trim().slice(0, 200);
  };
  copy("companyName");
  copy("billingName");
  copy("billingEmail");
  copy("country");
  copy("state");
  copy("city");
  copy("zip");
  copy("taxId");
  copy("taxExemptNote");
  copy("taxStatus");
  copy("invoiceLanguage");
  copy("invoicePrefix");
  copy("poNumber");
  copy("currencyDisplay");
  return out;
}

/** Organization owner tools — not exposed to members. */
export async function runOwnerBillingTool(
  action:
    | "grant_complimentary"
    | "clear_complimentary"
    | "suspend"
    | "resume"
    | "extend_30"
    | "bonus_credits"
    | "bonus_websites"
    | "override_limits",
  payload?: { plan?: Agency["plan"]; maxClients?: number; maxWebsites?: number },
) {
  const ctx = await requireAgency();
  if (ctx.role !== "owner") {
    return { ok: false as const, error: "Only the organization owner can use these tools." };
  }

  const [row] = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        overrides: agencies.billingOverrides,
        periodEnd: agencies.currentPeriodEnd,
        plan: agencies.plan,
      })
      .from(agencies)
      .where(eq(agencies.id, ctx.agencyId))
      .limit(1),
  );

  const overrides = mergeBillingOverrides(row?.overrides);
  const patch: Partial<typeof agencies.$inferInsert> = {
    billingOverrides: overrides,
    updatedAt: new Date(),
  };

  switch (action) {
    case "grant_complimentary": {
      const plan = payload?.plan ?? "professional";
      overrides.complimentary = true;
      overrides.complimentaryPlan = plan;
      overrides.suspended = false;
      patch.plan = plan;
      patch.status = "active";
      patch.billingOverrides = overrides;
      break;
    }
    case "clear_complimentary": {
      overrides.complimentary = false;
      delete overrides.complimentaryPlan;
      patch.billingOverrides = overrides;
      if (!row?.periodEnd) patch.plan = "starter";
      break;
    }
    case "suspend": {
      overrides.suspended = true;
      patch.billingOverrides = overrides;
      break;
    }
    case "resume": {
      overrides.suspended = false;
      patch.billingOverrides = overrides;
      break;
    }
    case "extend_30": {
      const base = row?.periodEnd && row.periodEnd > new Date() ? row.periodEnd : new Date();
      const next = new Date(base);
      next.setDate(next.getDate() + 30);
      patch.currentPeriodEnd = next;
      break;
    }
    case "bonus_credits": {
      overrides.bonusAiCredits = (overrides.bonusAiCredits ?? 0) + 10_000;
      patch.billingOverrides = overrides;
      break;
    }
    case "bonus_websites": {
      overrides.bonusWebsites = (overrides.bonusWebsites ?? 0) + 10;
      patch.billingOverrides = overrides;
      break;
    }
    case "override_limits": {
      if (payload?.maxClients != null) overrides.maxClients = payload.maxClients;
      if (payload?.maxWebsites != null) overrides.maxWebsites = payload.maxWebsites;
      patch.billingOverrides = overrides;
      break;
    }
    default:
      return { ok: false as const, error: "Unknown action." };
  }

  await withAgency(ctx.agencyId, (tx) =>
    tx.update(agencies).set(patch).where(eq(agencies.id, ctx.agencyId)),
  );
  revalidateBilling();
  return { ok: true as const };
}
