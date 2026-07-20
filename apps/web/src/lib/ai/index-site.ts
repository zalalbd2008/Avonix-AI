import { eq, sql } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import { knowledgeChunks, websites } from "@/lib/db/schema";
import { embeddings } from "./embeddings";
import { chunkPage, crawlSite } from "./crawl";

export type IndexResult =
  | { ok: true; pages: number; chunks: number; embedded: boolean }
  | { ok: false; error: string };

const EMBED_BATCH = 64;

/**
 * Crawl a website and replace its indexed content.
 *
 * Replace rather than merge: pages get deleted and rewritten, and a stale chunk
 * makes the assistant confidently quote something that is no longer on the site.
 * Correctness beats the wasted embedding spend of re-indexing unchanged pages.
 */
export async function indexWebsite(
  agencyId: string,
  websiteId: string,
): Promise<IndexResult> {
  const [site] = await withAgency(agencyId, (tx) =>
    tx
      .select({ id: websites.id, url: websites.url })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1),
  );

  if (!site) return { ok: false, error: "Website not found." };

  const pages = await crawlSite(site.url);
  if (pages.length === 0) {
    return { ok: false, error: "Could not read any pages from that site." };
  }

  const chunks = pages.flatMap(chunkPage);
  if (chunks.length === 0) {
    return { ok: false, error: "That site had no indexable text." };
  }

  const provider = embeddings();
  let vectors: number[][] | null = null;

  if (provider) {
    try {
      vectors = [];
      for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
        const batch = chunks.slice(i, i + EMBED_BATCH).map((c) => c.content);
        vectors.push(...(await provider.embedDocuments(batch)));
      }
    } catch (e) {
      // Store the text anyway. Full-text retrieval still works, so a Voyage
      // outage degrades answer quality instead of leaving the site unindexed.
      console.error("indexWebsite: embedding failed, storing text only", e);
      vectors = null;
    }
  }

  await withAgency(agencyId, async (tx) => {
    await tx.delete(knowledgeChunks).where(eq(knowledgeChunks.websiteId, websiteId));

    for (let i = 0; i < chunks.length; i += 200) {
      const slice = chunks.slice(i, i + 200);
      await tx.insert(knowledgeChunks).values(
        slice.map((chunk, j) => ({
          agencyId,
          websiteId,
          sourceUrl: chunk.url,
          title: chunk.title,
          content: chunk.content,
          tokenCount: Math.ceil(chunk.content.length / 4),
          embedding: vectors ? vectors[i + j] : null,
        })),
      );
    }
  });

  return { ok: true, pages: pages.length, chunks: chunks.length, embedded: vectors !== null };
}

export type Retrieved = { content: string; title: string | null; sourceUrl: string };

/**
 * Find the passages most likely to answer a question.
 *
 * Vector similarity when embeddings exist, Postgres full-text when they do not
 * (ADR-005). The fallback is worse, not absent — "do you open Saturdays?" will
 * miss a page titled "Practice hours", which is exactly the gap embeddings close.
 */
export async function retrieve(
  agencyId: string,
  websiteId: string,
  question: string,
  limit = 6,
): Promise<Retrieved[]> {
  const provider = embeddings();

  if (provider) {
    try {
      const vector = await provider.embedQuery(question);
      const literal = `[${vector.join(",")}]`;

      return await withAgency(agencyId, (tx) =>
        tx
          .select({
            content: knowledgeChunks.content,
            title: knowledgeChunks.title,
            sourceUrl: knowledgeChunks.sourceUrl,
          })
          .from(knowledgeChunks)
          .where(
            sql`${knowledgeChunks.websiteId} = ${websiteId} and ${knowledgeChunks.embedding} is not null`,
          )
          .orderBy(sql`${knowledgeChunks.embedding} <=> ${literal}::vector`)
          .limit(limit),
      );
    } catch (e) {
      console.error("retrieve: embedding query failed, falling back to full text", e);
    }
  }

  return withAgency(agencyId, (tx) =>
    tx
      .select({
        content: knowledgeChunks.content,
        title: knowledgeChunks.title,
        sourceUrl: knowledgeChunks.sourceUrl,
      })
      .from(knowledgeChunks)
      .where(
        sql`${knowledgeChunks.websiteId} = ${websiteId}
            and to_tsvector('english', coalesce(${knowledgeChunks.title}, '') || ' ' || ${knowledgeChunks.content})
                @@ plainto_tsquery('english', ${question})`,
      )
      .limit(limit),
  );
}
