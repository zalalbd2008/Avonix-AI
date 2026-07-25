-- Platform marketplace listings + installs (ADR-008 / ADR-007 Step 7).

CREATE TABLE IF NOT EXISTS "marketplace_listings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "kind" text DEFAULT 'template' NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "category" text,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "industry" text,
  "thumbnail_url" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "visibility" text DEFAULT 'public' NOT NULL,
  "is_official" boolean DEFAULT false NOT NULL,
  "is_premium" boolean DEFAULT false NOT NULL,
  "price_cents" integer DEFAULT 0 NOT NULL,
  "currency" text DEFAULT 'usd' NOT NULL,
  "fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "settings" jsonb DEFAULT '{"steps":[]}'::jsonb NOT NULL,
  "submit_label" text DEFAULT 'Send' NOT NULL,
  "success_message" text DEFAULT 'Thanks — we''ll be in touch.' NOT NULL,
  "source_template_id" uuid,
  "source_form_id" uuid,
  "install_count" integer DEFAULT 0 NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "published_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" text,
  "updated_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "marketplace_listings_agency_idx" ON "marketplace_listings" ("agency_id");
CREATE INDEX IF NOT EXISTS "marketplace_listings_status_idx" ON "marketplace_listings" ("status","visibility");
CREATE INDEX IF NOT EXISTS "marketplace_listings_official_idx" ON "marketplace_listings" ("is_official");

CREATE TABLE IF NOT EXISTS "marketplace_installs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "listing_id" uuid NOT NULL,
  "installed_template_id" uuid,
  "installed_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "marketplace_installs_agency_idx" ON "marketplace_installs" ("agency_id");
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_installs_uniq" ON "marketplace_installs" ("agency_id","listing_id");
