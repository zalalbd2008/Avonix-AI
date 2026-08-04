import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { primaryId, softDelete, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { websites } from "./websites";

/**
 * RAG corpus for Live Chat — per-website, agency-scoped (ADR-004 / ADR-005).
 *
 * Crawl + custom sources share `knowledge_chunks`. Re-index wipes only
 * `source_type = crawl` rows so pasted FAQs / PDFs / custom URLs survive.
 */

export const knowledgeSourceTypeEnum = pgEnum("knowledge_source_type", [
  "crawl",
  "url",
  "text",
  "pdf",
  "doc",
  "image",
]);

export const knowledgeCrawlStatusEnum = pgEnum("knowledge_crawl_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

/** Admin-managed sources (custom URL, pasted text, uploads) + crawl registry. */
export const knowledgeSources = pgTable(
  "knowledge_sources",
  {
    ...primaryId,
    agencyId: agencyId(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    sourceType: knowledgeSourceTypeEnum("source_type").notNull().default("crawl"),
    label: text("label"),
    /** Canonical URL for crawl/url/pdf; null for pasted text. */
    sourceUrl: text("source_url"),
    /** Raw pasted text or extracted body (optional; chunks hold retrieval text). */
    rawContent: text("raw_content"),
    contentHash: text("content_hash"),
    status: text("status").notNull().default("active"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("knowledge_sources_website_idx").on(t.websiteId),
    index("knowledge_sources_type_idx").on(t.websiteId, t.sourceType),
  ],
);

/** One crawl / re-index attempt — status, counts, errors. */
export const knowledgeCrawlRuns = pgTable(
  "knowledge_crawl_runs",
  {
    ...primaryId,
    agencyId: agencyId(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    status: knowledgeCrawlStatusEnum("status").notNull().default("pending"),
    trigger: text("trigger").notNull().default("manual"),
    pagesFound: integer("pages_found").notNull().default(0),
    chunksWritten: integer("chunks_written").notNull().default(0),
    embedded: integer("embedded").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (t) => [index("knowledge_crawl_runs_website_idx").on(t.websiteId, t.createdAt)],
);

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    ...primaryId,
    agencyId: agencyId(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),

    sourceUrl: text("source_url").notNull(),
    title: text("title"),
    content: text("content").notNull(),
    tokenCount: integer("token_count"),

    /** crawl | url | text | pdf | doc | image — custom rows survive re-crawl. */
    sourceType: knowledgeSourceTypeEnum("source_type").notNull().default("crawl"),
    sourceId: uuid("source_id").references(() => knowledgeSources.id, {
      onDelete: "set null",
    }),
    contentHash: text("content_hash"),
    crawlRunId: uuid("crawl_run_id").references(() => knowledgeCrawlRuns.id, {
      onDelete: "set null",
    }),
    /** Optional retrieval score snapshot / enrichment. */
    confidence: real("confidence"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),

    embedding: vector("embedding", { dimensions: 1024 }),

    ...timestamps,
  },
  (t) => [
    index("knowledge_website_idx").on(t.websiteId),
    index("knowledge_website_type_idx").on(t.websiteId, t.sourceType),
    index("knowledge_embedding_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type KnowledgeCrawlRun = typeof knowledgeCrawlRuns.$inferSelect;
export type KnowledgeSourceType =
  (typeof knowledgeSourceTypeEnum.enumValues)[number];
