-- Knowledge Studio foundations: source types, merge-safe crawl, run history
DO $$ BEGIN
  CREATE TYPE "public"."knowledge_source_type" AS ENUM('crawl', 'url', 'text', 'pdf', 'doc', 'image');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."knowledge_crawl_status" AS ENUM('pending', 'running', 'succeeded', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "knowledge_sources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL REFERENCES "agencies"("id") ON DELETE CASCADE,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
  "source_type" "knowledge_source_type" DEFAULT 'crawl' NOT NULL,
  "label" text,
  "source_url" text,
  "raw_content" text,
  "content_hash" text,
  "status" text DEFAULT 'active' NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "knowledge_sources_website_idx" ON "knowledge_sources" ("website_id");
CREATE INDEX IF NOT EXISTS "knowledge_sources_type_idx" ON "knowledge_sources" ("website_id", "source_type");

CREATE TABLE IF NOT EXISTS "knowledge_crawl_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL REFERENCES "agencies"("id") ON DELETE CASCADE,
  "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE CASCADE,
  "status" "knowledge_crawl_status" DEFAULT 'pending' NOT NULL,
  "trigger" text DEFAULT 'manual' NOT NULL,
  "pages_found" integer DEFAULT 0 NOT NULL,
  "chunks_written" integer DEFAULT 0 NOT NULL,
  "embedded" integer DEFAULT 0 NOT NULL,
  "error" text,
  "started_at" timestamptz,
  "finished_at" timestamptz,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "knowledge_crawl_runs_website_idx" ON "knowledge_crawl_runs" ("website_id", "created_at");

ALTER TABLE "knowledge_chunks"
  ADD COLUMN IF NOT EXISTS "source_type" "knowledge_source_type" DEFAULT 'crawl' NOT NULL;
ALTER TABLE "knowledge_chunks"
  ADD COLUMN IF NOT EXISTS "source_id" uuid REFERENCES "knowledge_sources"("id") ON DELETE SET NULL;
ALTER TABLE "knowledge_chunks"
  ADD COLUMN IF NOT EXISTS "content_hash" text;
ALTER TABLE "knowledge_chunks"
  ADD COLUMN IF NOT EXISTS "crawl_run_id" uuid REFERENCES "knowledge_crawl_runs"("id") ON DELETE SET NULL;
ALTER TABLE "knowledge_chunks"
  ADD COLUMN IF NOT EXISTS "confidence" real;
ALTER TABLE "knowledge_chunks"
  ADD COLUMN IF NOT EXISTS "meta" jsonb DEFAULT '{}'::jsonb NOT NULL;

CREATE INDEX IF NOT EXISTS "knowledge_website_type_idx" ON "knowledge_chunks" ("website_id", "source_type");

-- Backfill existing chunks as crawl-sourced
UPDATE "knowledge_chunks" SET "source_type" = 'crawl' WHERE "source_type" IS NULL;
