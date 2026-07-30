/**
 * Paid marketplace helpers — Stripe Checkout one-time payments + entitlements.
 *
 * Seller Connect payouts are ledger-only for now (seller_net_cents). Funds settle
 * on the platform Stripe account; MARKETPLACE_PLATFORM_FEE_BPS defaults to 20%.
 */
import type Stripe from "stripe";
import { and, eq, isNull } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  agencies,
  marketplaceListings,
  marketplacePurchases,
} from "@/lib/db/schema";
import { linkCustomer } from "@/lib/billing/sync";
import { stripe } from "@/lib/billing/stripe";
import { installMarketplaceListing } from "@/lib/forms/marketplace-service";
import {
  formatListingPrice,
  splitMarketplaceProceeds,
} from "@/lib/forms/marketplace-pricing";

export {
  formatListingPrice,
  marketplacePlatformFeeBps,
  normalizeListingPriceCents,
  splitMarketplaceProceeds,
} from "@/lib/forms/marketplace-pricing";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function listMyMarketplacePurchases(
  agencyId: string,
): Promise<string[]> {
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select({ listingId: marketplacePurchases.listingId })
      .from(marketplacePurchases)
      .where(eq(marketplacePurchases.status, "paid"));
    return rows.map((r) => r.listingId);
  });
}

export async function agencyOwnsMarketplaceListing(
  agencyId: string,
  listingId: string,
): Promise<boolean> {
  const paid = await withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select({ id: marketplacePurchases.id })
      .from(marketplacePurchases)
      .where(
        and(
          eq(marketplacePurchases.listingId, listingId),
          eq(marketplacePurchases.status, "paid"),
        ),
      )
      .limit(1);
    return Boolean(row);
  });
  return paid;
}

/**
 * Start Stripe Checkout for a paid listing. On success the webhook (or success
 * page confirm) marks the purchase paid and installs the template.
 */
export async function startMarketplaceCheckout(opts: {
  agencyId: string;
  agencyName: string;
  userId: string;
  userEmail: string;
  listingId: string;
}): Promise<
  | { ok: true; url: string }
  | { ok: false; error: string }
> {
  const client = stripe();
  if (!client) {
    return {
      ok: false,
      error:
        "Stripe is not configured. Set STRIPE_SECRET_KEY to sell or buy paid listings.",
    };
  }

  const listing = await withAgency(opts.agencyId, async (tx) => {
    const [row] = await tx
      .select()
      .from(marketplaceListings)
      .where(
        and(
          eq(marketplaceListings.id, opts.listingId),
          isNull(marketplaceListings.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  });

  if (!listing) return { ok: false, error: "Listing not found." };
  if (listing.status !== "published" && listing.agencyId !== opts.agencyId) {
    return { ok: false, error: "Listing is not published." };
  }
  if (listing.agencyId === opts.agencyId) {
    return {
      ok: false,
      error: "You publish this listing — install it for free from Marketplace.",
    };
  }
  if (!listing.isPremium || listing.priceCents <= 0) {
    return { ok: false, error: "This listing is free — use Install." };
  }

  const already = await agencyOwnsMarketplaceListing(
    opts.agencyId,
    listing.id,
  );
  if (already) {
    return {
      ok: false,
      error: "Already purchased — use Install to add another copy.",
    };
  }

  const { platformFeeCents, sellerNetCents } = splitMarketplaceProceeds(
    listing.priceCents,
  );

  const [agency] = await withAgency(opts.agencyId, (tx) =>
    tx
      .select({ customerId: agencies.stripeCustomerId })
      .from(agencies)
      .where(eq(agencies.id, opts.agencyId))
      .limit(1),
  );

  try {
    let customerId = agency?.customerId ?? null;
    if (!customerId) {
      const customer = await client.customers.create({
        name: opts.agencyName,
        email: opts.userEmail,
        metadata: { agency_id: opts.agencyId },
      });
      customerId = customer.id;
      await linkCustomer(opts.agencyId, customerId);
    }

    // One row per buyer+listing — refresh pending checkouts.
    const purchaseId = await withAgency(opts.agencyId, async (tx) => {
      const [existing] = await tx
        .select({ id: marketplacePurchases.id, status: marketplacePurchases.status })
        .from(marketplacePurchases)
        .where(eq(marketplacePurchases.listingId, listing.id))
        .limit(1);

      if (existing?.status === "paid") return existing.id;

      if (existing) {
        await tx
          .update(marketplacePurchases)
          .set({
            amountCents: listing.priceCents,
            currency: listing.currency || "usd",
            platformFeeCents,
            sellerNetCents,
            sellerAgencyId: listing.agencyId,
            status: "pending",
            purchasedBy: opts.userId,
            updatedAt: new Date(),
          })
          .where(eq(marketplacePurchases.id, existing.id));
        return existing.id;
      }

      const [row] = await tx
        .insert(marketplacePurchases)
        .values({
          agencyId: opts.agencyId,
          listingId: listing.id,
          sellerAgencyId: listing.agencyId,
          amountCents: listing.priceCents,
          currency: listing.currency || "usd",
          platformFeeCents,
          sellerNetCents,
          status: "pending",
          purchasedBy: opts.userId,
        })
        .returning({ id: marketplacePurchases.id });
      return row?.id ?? null;
    });

    if (!purchaseId) {
      return { ok: false, error: "Could not create purchase record." };
    }

    const currency = (listing.currency || "usd").toLowerCase();
    const base = appUrl();
    const session = await client.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      client_reference_id: opts.agencyId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: listing.priceCents,
            product_data: {
              name: listing.name.slice(0, 120),
              description: (
                listing.description || "Avonix marketplace template"
              ).slice(0, 500),
              metadata: {
                listing_id: listing.id,
                purpose: "marketplace_listing",
              },
            },
          },
        },
      ],
      metadata: {
        purpose: "marketplace_listing",
        agency_id: opts.agencyId,
        listing_id: listing.id,
        purchase_id: purchaseId,
        seller_agency_id: listing.agencyId,
        purchased_by: opts.userId,
      },
      success_url: `${base}/marketplace?purchased=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/marketplace?canceled=1`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return { ok: false, error: "Stripe returned no checkout URL." };
    }

    await withAgency(opts.agencyId, async (tx) => {
      await tx
        .update(marketplacePurchases)
        .set({
          stripeCheckoutSessionId: session.id,
          updatedAt: new Date(),
        })
        .where(eq(marketplacePurchases.id, purchaseId));
    });

    return { ok: true, url: session.url };
  } catch (e) {
    console.error("startMarketplaceCheckout", e);
    return { ok: false, error: "Could not start checkout. Try again." };
  }
}

/**
 * Mark purchase paid + install. Idempotent. Called from Stripe webhook and
 * success-page confirm.
 */
export async function fulfillMarketplacePurchase(
  session: Stripe.Checkout.Session,
): Promise<{ ok: true; installed: boolean } | { ok: false; error: string }> {
  if (session.metadata?.purpose !== "marketplace_listing") {
    return { ok: false, error: "not_marketplace" };
  }
  if (session.payment_status !== "paid") {
    return { ok: false, error: "not_paid" };
  }

  const agencyId =
    session.client_reference_id ?? session.metadata?.agency_id ?? null;
  const listingId = session.metadata?.listing_id ?? null;
  const purchaseId = session.metadata?.purchase_id ?? null;
  const userId = session.metadata?.purchased_by ?? null;

  if (!agencyId || !listingId) {
    return { ok: false, error: "missing_metadata" };
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  if (customerId) await linkCustomer(agencyId, customerId);

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const purchasedBy = await withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select()
      .from(marketplacePurchases)
      .where(
        purchaseId
          ? eq(marketplacePurchases.id, purchaseId)
          : and(
              eq(marketplacePurchases.listingId, listingId),
              eq(marketplacePurchases.agencyId, agencyId),
            ),
      )
      .limit(1);

    if (!row) {
      // Webhook arrived before insert finished — create paid row from session.
      const listing = await tx
        .select()
        .from(marketplaceListings)
        .where(eq(marketplaceListings.id, listingId))
        .limit(1)
        .then((r) => r[0]);
      if (!listing) return null;

      const amount = session.amount_total ?? listing.priceCents;
      const { platformFeeCents, sellerNetCents } =
        splitMarketplaceProceeds(amount);
      const [created] = await tx
        .insert(marketplacePurchases)
        .values({
          agencyId,
          listingId,
          sellerAgencyId: listing.agencyId,
          amountCents: amount,
          currency: (session.currency || listing.currency || "usd").toLowerCase(),
          platformFeeCents,
          sellerNetCents,
          status: "paid",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          purchasedBy: session.metadata?.purchased_by ?? null,
          paidAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            marketplacePurchases.agencyId,
            marketplacePurchases.listingId,
          ],
          set: {
            status: "paid",
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
            paidAt: new Date(),
            updatedAt: new Date(),
            amountCents: amount,
            platformFeeCents,
            sellerNetCents,
          },
        })
        .returning({
          id: marketplacePurchases.id,
          purchasedBy: marketplacePurchases.purchasedBy,
        });
      return created?.purchasedBy ?? session.metadata?.purchased_by ?? null;
    }

    if (row.status !== "paid") {
      await tx
        .update(marketplacePurchases)
        .set({
          status: "paid",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(marketplacePurchases.id, row.id));
    }
    return row.purchasedBy;
  });

  const installerId = userId || purchasedBy;
  if (!installerId) {
    // Entitlement is paid; install can happen from UI.
    return { ok: true, installed: false };
  }

  const result = await installMarketplaceListing(
    agencyId,
    installerId,
    listingId,
    { skipPaymentGate: true },
  );
  return {
    ok: true,
    installed: result.ok,
  };
}

/** Success-page fallback when webhook is slow or local. */
export async function confirmMarketplaceCheckoutSession(
  agencyId: string,
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = stripe();
  if (!client) return { ok: false, error: "Stripe is not configured." };

  try {
    const session = await client.checkout.sessions.retrieve(sessionId);
    if (
      session.metadata?.purpose !== "marketplace_listing" ||
      (session.client_reference_id ?? session.metadata?.agency_id) !== agencyId
    ) {
      return { ok: false, error: "Invalid checkout session." };
    }
    const result = await fulfillMarketplacePurchase(session);
    if (!result.ok && result.error !== "not_marketplace") {
      return { ok: false, error: result.error };
    }
    return { ok: true };
  } catch (e) {
    console.error("confirmMarketplaceCheckoutSession", e);
    return { ok: false, error: "Could not confirm purchase." };
  }
}
