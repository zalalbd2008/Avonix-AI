import { index, integer, pgTable, text, uuid, vector } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { websites } from "./websites";

/**
 * RAG corpus for the AI chat widget: the client's own site content, crawled and
 * chunked. pgvector keeps this in the same database as everything else, so there
 * is no separate vector store to operate (ADR-004).
 *
 * Full-text search over `content` is available as a retrieval fallback via a GIN
 * index defined in db/search.sql — an expression index rather than a column,
 * because drizzle has no tsvector type and a stored copy of the text would only
 * drift from it.
 *
 * Dimension is fixed at 1024 by ADR-005 (voyage-4-lite). Changing it means
 * re-embedding the whole corpus, so it is cheap to change now and expensive
 * later.
 */
export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    ...primaryId,
    agencyId: agencyId(),
    websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),

    sourceUrl: text("source_url").notNull(),
    title: text("title"),
    content: text("content").notNull(),
    tokenCount: integer("token_count"),

    embedding: vector("embedding", { dimensions: 1024 }),

    ...timestamps,
  },
  (t) => [
    index("knowledge_website_idx").on(t.websiteId),
    index("knowledge_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
