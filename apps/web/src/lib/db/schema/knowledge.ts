import { index, integer, pgTable, text, uuid, vector } from "drizzle-orm/pg-core";
import { tenantColumns, timestamps } from "./_shared";
import { websites } from "./websites";

/**
 * RAG corpus for the AI chat widget: the client's own site content, crawled and
 * chunked. pgvector keeps this in the same database as everything else, so there
 * is no separate vector store to operate (ADR-004).
 *
 * NOTE: `dimensions` must match whatever embedding model ADR-005 settles on.
 * 1536 is a placeholder until that decision is made.
 */
export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    ...tenantColumns,
    websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),

    sourceUrl: text("source_url").notNull(),
    title: text("title"),
    content: text("content").notNull(),
    tokenCount: integer("token_count"),

    embedding: vector("embedding", { dimensions: 1536 }),

    ...timestamps,
  },
  (t) => [
    index("knowledge_website_idx").on(t.websiteId),
    index("knowledge_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
