import Stripe from "stripe";
import type { Agency } from "@/lib/db/schema";
import type { BillingInterval } from "./catalog";

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

type PriceEnv = {
  month?: string;
  year?: string;
  /** Legacy aliases still accepted */
  monthLegacy?: string;
  yearLegacy?: string;
};

const PRICE_ENV: Record<Agency["plan"], PriceEnv> = {
  starter: {
    month: "STRIPE_PRICE_STARTER",
    year: "STRIPE_PRICE_STARTER_YEARLY",
  },
  professional: {
    month: "STRIPE_PRICE_PROFESSIONAL",
    year: "STRIPE_PRICE_PROFESSIONAL_YEARLY",
    monthLegacy: "STRIPE_PRICE_PRO",
    yearLegacy: "STRIPE_PRICE_PRO_YEARLY",
  },
  agency: {
    month: "STRIPE_PRICE_AGENCY",
    year: "STRIPE_PRICE_AGENCY_YEARLY",
  },
  enterprise: {
    month: "STRIPE_PRICE_ENTERPRISE",
    year: "STRIPE_PRICE_ENTERPRISE_YEARLY",
  },
};

function envPrice(name: string | undefined): string | undefined {
  if (!name) return undefined;
  return process.env[name] || undefined;
}

function productEnvForPlan(plan: Agency["plan"]): string | undefined {
  const keyed = process.env[`STRIPE_PRODUCT_${plan.toUpperCase()}`];
  if (keyed) return keyed;
  return process.env.STRIPE_PRODUCT_ID || undefined;
}

/**
 * Stripe price -> our plan.
 *
 * Kept as env config rather than hard-coded ids so test and live modes, which
 * have different price ids, need no code change. Monthly and yearly prices map
 * to the same plan tier.
 */
export function planForPrice(priceId: string | null | undefined): Agency["plan"] | null {
  if (!priceId) return null;
  for (const [plan, env] of Object.entries(PRICE_ENV) as [
    Agency["plan"],
    PriceEnv,
  ][]) {
    const ids = [
      envPrice(env.month),
      envPrice(env.year),
      envPrice(env.monthLegacy),
      envPrice(env.yearLegacy),
    ].filter((id): id is string => typeof id === "string" && id.startsWith("price_"));
    if (ids.includes(priceId)) return plan;
  }
  return null;
}

export function priceForPlan(
  plan: Agency["plan"],
  interval: BillingInterval = "month",
): string | null {
  const env = PRICE_ENV[plan];
  if (!env) return null;
  if (interval === "year") {
    return (
      envPrice(env.year) ??
      envPrice(env.yearLegacy) ??
      envPrice(env.month) ??
      envPrice(env.monthLegacy) ??
      null
    );
  }
  return envPrice(env.month) ?? envPrice(env.monthLegacy) ?? null;
}

/**
 * Resolve a Checkout `price` id. Accepts either:
 * - `price_…` in STRIPE_PRICE_* (preferred)
 * - `prod_…` in STRIPE_PRODUCT_* / STRIPE_PRODUCT_ID (looks up an active recurring price)
 */
export async function resolveCheckoutPriceId(
  plan: Agency["plan"],
  interval: BillingInterval = "month",
): Promise<string | null> {
  const configured = priceForPlan(plan, interval);
  if (configured?.startsWith("price_")) return configured;

  const productId =
    (configured?.startsWith("prod_") ? configured : null) ??
    productEnvForPlan(plan);
  if (!productId?.startsWith("prod_")) return null;

  const client = stripe();
  if (!client) return null;

  const prices = await client.prices.list({
    product: productId,
    active: true,
    type: "recurring",
    limit: 20,
  });

  const match = prices.data.find((p) => p.recurring?.interval === interval);
  const fallback = prices.data.find((p) => p.recurring?.interval === "month");
  return match?.id ?? fallback?.id ?? prices.data[0]?.id ?? null;
}

/**
 * Map a charged price back to a plan — env price ids first, then product ownership.
 */
export async function planForPriceResolved(
  priceId: string | null | undefined,
): Promise<Agency["plan"] | null> {
  const direct = planForPrice(priceId);
  if (direct) return direct;
  if (!priceId) return null;

  const client = stripe();
  if (!client) return null;

  try {
    const price = await client.prices.retrieve(priceId);
    const productId =
      typeof price.product === "string" ? price.product : price.product.id;

    for (const plan of Object.keys(PRICE_ENV) as Agency["plan"][]) {
      const configured = productEnvForPlan(plan);
      if (configured === productId) return plan;
      const priceEnv = priceForPlan(plan, "month");
      if (priceEnv?.startsWith("prod_") && priceEnv === productId) return plan;
    }

    if (process.env.STRIPE_PRODUCT_ID === productId) {
      return "professional";
    }
  } catch (e) {
    console.error("planForPriceResolved", e);
  }
  return null;
}

export function intervalForPrice(
  priceId: string | null | undefined,
): BillingInterval | null {
  if (!priceId) return null;
  for (const env of Object.values(PRICE_ENV)) {
    if (
      priceId === envPrice(env.year) ||
      priceId === envPrice(env.yearLegacy)
    ) {
      return "year";
    }
    if (
      priceId === envPrice(env.month) ||
      priceId === envPrice(env.monthLegacy)
    ) {
      return "month";
    }
  }
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

export function intervalOf(subscription: Stripe.Subscription): BillingInterval | null {
  const fromEnv = intervalForPrice(priceIdOf(subscription));
  if (fromEnv) return fromEnv;
  const recurring = subscription.items?.data?.[0]?.price?.recurring?.interval;
  if (recurring === "year") return "year";
  if (recurring === "month") return "month";
  return null;
}
