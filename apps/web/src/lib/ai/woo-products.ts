/** WooCommerce product card — synced from WP connector. */
export type WooProductCard = {
  id: number;
  title: string;
  url: string;
  image?: string;
  price?: string;
  onSale?: boolean;
  inStock?: boolean;
  addUrl?: string;
  addText?: string;
  sku?: string;
  description?: string;
};

export type WebsiteWooSettings = {
  active?: boolean;
  products?: WooProductCard[];
  syncedAt?: string;
  syncRequested?: boolean;
};

/** Nexus-style product intent heuristics. */
export function isProductQuery(message: string): boolean {
  const text = String(message ?? "").trim();
  if (!text) return false;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const isNew = /\b(new\s*arrivals?|newest|latest|recently\s*(?:added|arrived))\b/i.test(text);
  const isBest = /\b(best[\s-]?sell\w*|top[\s-]?(?:rated|selling)|popular|trending|featured|recommend\w*)\b/i.test(text);
  const isBrowse = /\b(products?|items?|catalog\w*|shop|store|browse|collection|buy|purchase|deals?|sale|cart)\b/i.test(text);
  const isSpecific = /\b(price|pricing|cost|stock|size|colou?r|do you (?:have|sell)|looking for|show me)\b/i.test(text);
  const isShortName =
    wordCount >= 1 &&
    wordCount <= 4 &&
    !/^\s*(?:hi|hey|hello|thanks?|ok|bye|help|agent|human)\b/i.test(text);
  return isNew || isBest || isBrowse || isSpecific || isShortName;
}

export function matchWooProducts(
  message: string,
  products: WooProductCard[],
  limit = 8,
): WooProductCard[] {
  if (!products.length || !isProductQuery(message)) return [];

  const text = message.toLowerCase();
  const isNew = /\b(new\s*arrivals?|newest|latest)\b/i.test(message);
  const isBest = /\b(best|popular|trending|featured)\b/i.test(message);

  let list = [...products];
  if (isNew) {
    list = list.slice().reverse();
  } else if (!isBest) {
    const terms = text.split(/\s+/).filter((t) => t.length > 2);
    if (terms.length) {
      list = list.filter((p) => {
        const hay = `${p.title} ${p.description ?? ""} ${p.sku ?? ""}`.toLowerCase();
        return terms.some((t) => hay.includes(t));
      });
    }
  }

  if (!list.length) list = products.slice(0, limit);
  return list.slice(0, limit);
}

export function productToKnowledgeText(p: WooProductCard): string {
  const bits = [
    p.title,
    p.price ? `Price: ${p.price}` : "",
    p.sku ? `SKU: ${p.sku}` : "",
    p.inStock === false ? "Out of stock" : "In stock",
    p.description ?? "",
    `URL: ${p.url}`,
  ].filter(Boolean);
  return bits.join(" | ");
}
