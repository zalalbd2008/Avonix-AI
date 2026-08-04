import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { withAgency } from "@/lib/db";
import { knowledgeChunks, websites } from "@/lib/db/schema";
import type { WebsiteSettings } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  productToKnowledgeText,
  type WooProductCard,
} from "@/lib/ai/woo-products";
import { chunkText, contentHash } from "@/lib/ai/crawl";
import { embeddings } from "@/lib/ai/embeddings";

/**
 * POST /api/v1/connector/woo/sync
 * WP connector pushes WooCommerce product catalog for indexing + carousel.
 */
export async function POST(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  const limit = await rateLimit(`woo:${identity.websiteId}`, 30, 3600);
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many sync requests.");
  }

  let body: { products?: WooProductCard[]; woo_active?: boolean };
  try {
    body = await request.json();
  } catch {
    return connectorError("bad_request", 400, "Body must be JSON.");
  }

  const products = Array.isArray(body.products) ? body.products.slice(0, 80) : [];
  const wooActive = Boolean(body.woo_active);

  await withAgency(identity.agencyId, async (tx) => {
    const [site] = await tx
      .select({ settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, identity.websiteId))
      .limit(1);
    if (!site) return;

    const ws: WebsiteSettings = {
      ...(site.settings ?? {}),
      woo: {
        active: wooActive,
        products,
        syncedAt: new Date().toISOString(),
        syncRequested: false,
      },
    };

    await tx
      .update(websites)
      .set({ settings: ws, updatedAt: new Date() })
      .where(eq(websites.id, identity.websiteId));

    if (!products.length) return;

    const urls = products.map((p) => p.url).filter(Boolean);
    if (urls.length) {
      await tx
        .delete(knowledgeChunks)
        .where(
          and(
            eq(knowledgeChunks.websiteId, identity.websiteId),
            eq(knowledgeChunks.sourceType, "url"),
            inArray(knowledgeChunks.sourceUrl, urls),
          ),
        );
    }

    const provider = embeddings();
    const rows = products.flatMap((p) => {
      const text = productToKnowledgeText(p);
      const chunks = chunkText({
        url: p.url,
        title: p.title,
        text,
      });
      return chunks.map((c) => ({ product: p, chunk: c }));
    });

    const vectors =
      provider && rows.length
        ? await provider.embedDocuments(rows.map((r) => r.chunk.content)).catch(
            () => null,
          )
        : null;

    if (rows.length) {
      await tx.insert(knowledgeChunks).values(
        rows.map((r, i) => ({
          agencyId: identity.agencyId,
          websiteId: identity.websiteId,
          sourceUrl: r.chunk.url,
          title: r.product.title,
          content: r.chunk.content,
          tokenCount: Math.ceil(r.chunk.content.length / 4),
          sourceType: "url" as const,
          contentHash: contentHash(r.chunk.content),
          embedding: vectors ? vectors[i] : null,
          meta: { wooProductId: r.product.id, kind: "woocommerce" },
        })),
      );
    }
  });

  return Response.json({
    status: "ok",
    indexed: products.length,
  });
}
