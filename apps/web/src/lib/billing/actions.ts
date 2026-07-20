"use server";

import { eq } from "drizzle-orm";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { linkCustomer } from "./sync";
import { priceForPlan, stripe } from "./stripe";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Start a Stripe Checkout session for an upgrade. Returns the URL to send them to. */
export async function startCheckout(plan: "pro" | "agency") {
  const ctx = await requireAgency();
  const client = stripe();
  const price = priceForPlan(plan);

  if (!client) return { ok: false as const, error: "Billing is not configured yet." };
  if (!price) return { ok: false as const, error: `No price is configured for the ${plan} plan.` };

  const [agency] = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({ customerId: agencies.stripeCustomerId, name: agencies.name })
      .from(agencies)
      .where(eq(agencies.id, ctx.agencyId))
      .limit(1),
  );

  try {
    // Reuse the customer when we already have one, so a second upgrade does not
    // create a duplicate customer with its own payment methods and history.
    let customerId = agency?.customerId ?? null;
    if (!customerId) {
      const customer = await client.customers.create({
        name: agency?.name,
        email: ctx.userEmail,
        metadata: { agency_id: ctx.agencyId },
      });
      customerId = customer.id;
      await linkCustomer(ctx.agencyId, customerId);
    }

    const session = await client.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      // Both, because the webhook reads client_reference_id and older Stripe
      // integrations read metadata — and losing this link means a paid customer
      // whose plan never changes.
      client_reference_id: ctx.agencyId,
      metadata: { agency_id: ctx.agencyId },
      subscription_data: { metadata: { agency_id: ctx.agencyId } },
      success_url: `${appUrl()}/billing?upgraded=1`,
      cancel_url: `${appUrl()}/billing`,
      allow_promotion_codes: true,
    });

    if (!session.url) return { ok: false as const, error: "Stripe returned no checkout URL." };
    return { ok: true as const, url: session.url };
  } catch (e) {
    console.error("startCheckout failed", e);
    return { ok: false as const, error: "Could not start checkout. Try again." };
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
