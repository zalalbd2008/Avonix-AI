"use server";

import { eq } from "drizzle-orm";
import { requireAgencyMembership } from "@/lib/auth/session";
import { agencyHasPaidAccess } from "@/lib/billing/access";
import {
  startCheckoutForAgency,
} from "@/lib/billing/actions";
import type { BillingInterval } from "@/lib/billing/catalog";
import { withAgency } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { syncSubscription } from "@/lib/billing/sync";
import { stripe } from "@/lib/billing/stripe";

/**
 * After Stripe Checkout success — pull latest subscription if webhook is slow.
 */
export async function syncOnboardingBilling(): Promise<
  { ok: true; paid: boolean } | { ok: false; error: string }
> {
  const ctx = await requireAgencyMembership();

  if (await agencyHasPaidAccess(ctx.agencyId)) {
    return { ok: true, paid: true };
  }

  const client = stripe();
  if (!client) {
    return { ok: false, error: "Billing is not configured yet." };
  }

  const [agency] = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        customerId: agencies.stripeCustomerId,
        subscriptionId: agencies.stripeSubscriptionId,
      })
      .from(agencies)
      .where(eq(agencies.id, ctx.agencyId))
      .limit(1),
  );

  try {
    if (agency?.subscriptionId) {
      const sub = await client.subscriptions.retrieve(agency.subscriptionId);
      await syncSubscription(sub, new Date());
    } else if (agency?.customerId) {
      const list = await client.subscriptions.list({
        customer: agency.customerId,
        status: "all",
        limit: 5,
      });
      const active = list.data.find(
        (s) =>
          s.status === "active" ||
          s.status === "trialing" ||
          s.status === "past_due",
      );
      if (active) await syncSubscription(active, new Date());
    }
  } catch (e) {
    console.error("syncOnboardingBilling", e);
    return { ok: false, error: "Could not confirm payment yet. Try again." };
  }

  return { ok: true, paid: await agencyHasPaidAccess(ctx.agencyId) };
}

export async function resumeOnboardingCheckout(
  plan: "starter" | "professional" | "agency",
  interval: BillingInterval,
) {
  const ctx = await requireAgencyMembership();
  return startCheckoutForAgency(ctx.agencyId, plan, interval, {
    successUrl: "/onboarding/billing?upgraded=1",
    cancelUrl: "/onboarding/billing",
  });
}

/**
 * Escape hatch: if the user has another paid org, leave the unpaid paywall.
 */
export async function switchToPaidOrganization(): Promise<
  { ok: true; href: string } | { ok: false; error: string }
> {
  const ctx = await requireAgencyMembership();
  const { listOrganizations } = await import("@/lib/agency/organizations");
  const { writeActiveOrgCookie } = await import("@/lib/auth/active-org");
  const { agencyHasPaidAccess } = await import("@/lib/billing/access");

  const orgs = await listOrganizations(ctx.userId);
  for (const org of orgs) {
    if (org.id === ctx.agencyId) continue;
    if (await agencyHasPaidAccess(org.id)) {
      await writeActiveOrgCookie(org.id);
      return { ok: true, href: "/organizations" };
    }
  }

  return {
    ok: false,
    error: "No other active organization found. Complete payment to continue.",
  };
}
