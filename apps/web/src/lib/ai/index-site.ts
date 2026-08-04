import { and, eq, sql } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  knowledgeChunks,
  knowledgeCrawlRuns,
  websites,
} from "@/lib/db/schema";
import { embeddings } from "./embeddings";
import { chunkPage, crawlSite, type Chunk } from "./crawl";

export type IndexResult =
  | {
      ok: true;
      pages: number;
      chunks: number;
      embedded: boolean;
      runId: string;
    }
  | { ok: false; error: string };

const EMBED_BATCH = 64;

/**
 * Crawl a website and refresh crawl-sourced chunks only.
 * Custom sources (text / url / pdf / …) are never deleted.
 */
export async function indexWebsite(
  agencyId: string,
  websiteId: string,
  trigger: "manual" | "scheduled" | "automatic" = "manual",
): Promise<IndexResult> {
  const [site] = await withAgency(agencyId, (tx) =>
    tx
      .select({ id: websites.id, url: websites.url })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1),
  );

  if (!site) return { ok: false, error: "Website not found." };

  const [run] = await withAgency(agencyId, (tx) =>
    tx
      .insert(knowledgeCrawlRuns)
      .values({
        agencyId,
        websiteId,
        status: "running",
        trigger,
        startedAt: new Date(),
      })
      .returning({ id: knowledgeCrawlRuns.id }),
  );

  try {
    const pages = await crawlSite(site.url);
    if (pages.length === 0) {
      await finishRun(agencyId, run.id, {
        status: "failed",
        error: "Could not read any pages from that site.",
      });
      return { ok: false, error: "Could not read any pages from that site." };
    }

    const chunks = pages.flatMap(chunkPage);
    if (chunks.length === 0) {
      await finishRun(agencyId, run.id, {
        status: "failed",
        error: "That site had no indexable text.",
        pagesFound: pages.length,
      });
      return { ok: false, error: "That site had no indexable text." };
    }

    const vectors = await embedChunks(chunks);

    await withAgency(agencyId, async (tx) => {
      // Merge-safe: only remove previous crawl chunks (keep custom knowledge).
      await tx
        .delete(knowledgeChunks)
        .where(
          and(
            eq(knowledgeChunks.websiteId, websiteId),
            eq(knowledgeChunks.sourceType, "crawl"),
          ),
        );

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
            sourceType: "crawl" as const,
            contentHash: chunk.contentHash,
            crawlRunId: run.id,
            embedding: vectors ? vectors[i + j] : null,
          })),
        );
      }
    });

    await finishRun(agencyId, run.id, {
      status: "succeeded",
      pagesFound: pages.length,
      chunksWritten: chunks.length,
      embedded: vectors ? chunks.length : 0,
    });

    return {
      ok: true,
      pages: pages.length,
      chunks: chunks.length,
      embedded: vectors !== null,
      runId: run.id,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Indexing failed.";
    await finishRun(agencyId, run.id, { status: "failed", error: msg });
    return { ok: false, error: msg };
  }
}

async function finishRun(
  agencyId: string,
  runId: string,
  patch: {
    status: "succeeded" | "failed";
    error?: string;
    pagesFound?: number;
    chunksWritten?: number;
    embedded?: number;
  },
) {
  await withAgency(agencyId, (tx) =>
    tx
      .update(knowledgeCrawlRuns)
      .set({
        status: patch.status,
        error: patch.error ?? null,
        pagesFound: patch.pagesFound ?? 0,
        chunksWritten: patch.chunksWritten ?? 0,
        embedded: patch.embedded ?? 0,
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(knowledgeCrawlRuns.id, runId)),
  );
}

async function embedChunks(chunks: Chunk[]): Promise<number[][] | null> {
  const provider = embeddings();
  if (!provider) return null;
  try {
    const vectors: number[][] = [];
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH).map((c) => c.content);
      vectors.push(...(await provider.embedDocuments(batch)));
    }
    return vectors;
  } catch (e) {
    console.error("indexWebsite: embedding failed, storing text only", e);
    return null;
  }
}

export type Retrieved = {
  content: string;
  title: string | null;
  sourceUrl: string;
  sourceType?: string | null;
};

/**
 * Find the passages most likely to answer a question (per website only).
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
            sourceType: knowledgeChunks.sourceType,
          })
          .from(knowledgeChunks)
          .where(
            sql`${knowledgeChunks.websiteId} = ${websiteId} and ${knowledgeChunks.embedding} is not null`,
          )
          .orderBy(sql`${knowledgeChunks.embedding} <=> ${literal}::vector`)
          .limit(limit),
      );
    } catch (e) {
      console.error("retrieve: vector search failed, falling back to FTS", e);
    }
  }

  return await withAgency(agencyId, (tx) =>
    tx
      .select({
        content: knowledgeChunks.content,
        title: knowledgeChunks.title,
        sourceUrl: knowledgeChunks.sourceUrl,
        sourceType: knowledgeChunks.sourceType,
      })
      .from(knowledgeChunks)
      .where(
        sql`${knowledgeChunks.websiteId} = ${websiteId}
          and to_tsvector('english', ${knowledgeChunks.content})
            @@ plainto_tsquery('english', ${question})`,
      )
      .orderBy(
        sql`ts_rank(to_tsvector('english', ${knowledgeChunks.content}), plainto_tsquery('english', ${question})) desc`,
      )
      .limit(limit),
  );
}
