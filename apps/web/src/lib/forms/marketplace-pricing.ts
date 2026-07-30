/** Shared pricing helpers (no Stripe / DB) — avoids circular imports. */

/** Platform take rate in basis points (2000 = 20%). */
export function marketplacePlatformFeeBps(): number {
  const raw = Number(process.env.MARKETPLACE_PLATFORM_FEE_BPS ?? "2000");
  if (!Number.isFinite(raw) || raw < 0) return 2000;
  return Math.min(Math.floor(raw), 9000);
}

export function splitMarketplaceProceeds(amountCents: number): {
  platformFeeCents: number;
  sellerNetCents: number;
} {
  const fee = Math.floor((amountCents * marketplacePlatformFeeBps()) / 10_000);
  return {
    platformFeeCents: fee,
    sellerNetCents: Math.max(0, amountCents - fee),
  };
}

/** Clamp publish price: free or up to $999.99. */
export function normalizeListingPriceCents(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.round(n), 99_999);
}

export function formatListingPrice(
  priceCents: number,
  currency = "usd",
): string {
  if (priceCents <= 0) return "Free";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(priceCents / 100);
  } catch {
    return `$${(priceCents / 100).toFixed(2)}`;
  }
}
