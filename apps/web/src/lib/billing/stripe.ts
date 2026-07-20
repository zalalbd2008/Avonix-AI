import Stripe from "stripe";
import type { Agency } from "@/lib/db/schema";

let client: Stripe | null = null;

/**
 * The Stripe client, or null when no key is configured.
 *
 * Returning null rather than throwing lets the billing page render an honest
 * "billing is not set up" state in development instead of a 500. Every caller
 * has to handle the null, which is the point.
 */
export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

/**
 * A client for verifying webhook signatures.
 *
 * Verification is offline HMAC over the request bytes — it never calls Stripe —
 * so it works without a secret key. Constructing with a placeholder keeps the
 * webhook endpoint functional (and testable) on an instance that only receives
 * events, while any call that really needs the API still goes through
 * `stripe()` and its null check.
 */
let verifier: Stripe | null = null;
export function stripeVerifier(): Stripe {
  verifier ??= new Stripe(
    process.env.STRIPE_SECRET_KEY ?? "sk_placeholder_verification_only",
  );
  return verifier;
}

export function billingConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

/**
 * Stripe price -> our plan.
 *
 * Kept as env config rather than hard-coded ids so test and live modes, which
 * have different price ids, need no code change.
 */
export function planForPrice(priceId: string | null | undefined): Agency["plan"] | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_AGENCY) return "agency";
  return null;
}

export function priceForPlan(plan: Agency["plan"]): string | null {
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO ?? null;
  if (plan === "agency") return process.env.STRIPE_PRICE_AGENCY ?? null;
  return null;
}

/**
 * Stripe subscription status -> the status the app gates on.
 *
 * `past_due` deliberately keeps the paid plan: cutting a customer off the moment
 * a card expires punishes them for something a retry usually fixes within days.
 * Dunning is Stripe's job; ours is not to delete their access mid-retry.
 */
export function statusForSubscription(
  status: Stripe.Subscription.Status,
): Agency["status"] {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    default:
      // incomplete, incomplete_expired, canceled, paused
      return "canceled";
  }
}

/**
 * When the current period ends.
 *
 * NOT `subscription.current_period_end` — recent Stripe API versions moved that
 * field off the subscription and onto each subscription item, and reading the
 * old path silently yields undefined rather than an error.
 */
export function periodEndOf(subscription: Stripe.Subscription): Date | null {
  const seconds = subscription.items?.data?.[0]?.current_period_end;
  return typeof seconds === "number" ? new Date(seconds * 1000) : null;
}

/** The price on a subscription, for mapping back to a plan. */
export function priceIdOf(subscription: Stripe.Subscription): string | null {
  return subscription.items?.data?.[0]?.price?.id ?? null;
}
