-- Organization reusable Components / Sections / Assets (ADR-007 Step 5).

CREATE TABLE IF NOT EXISTS "form_components" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "category" text,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "thumbnail_url" text,
  "scope" text DEFAULT 'organization' NOT NULL,
  "status" text DEFAULT 'published' NOT NULL,
  "visibility" text DEFAULT 'organization' NOT NULL,
  "client_id" uuid,
  "website_id" uuid,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "is_locked" boolean DEFAULT false NOT NULL,
  "created_by" text,
  "updated_by" text,
  "fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "form_components_agency_idx" ON "form_components" ("agency_id");
CREATE INDEX IF NOT EXISTS "form_components_scope_idx" ON "form_components" ("agency_id","scope","status");
CREATE INDEX IF NOT EXISTS "form_components_created_by_idx" ON "form_components" ("created_by");

CREATE TABLE IF NOT EXISTS "form_sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "category" text,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "thumbnail_url" text,
  "scope" text DEFAULT 'organization' NOT NULL,
  "status" text DEFAULT 'published' NOT NULL,
  "visibility" text DEFAULT 'organization' NOT NULL,
  "client_id" uuid,
  "website_id" uuid,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "is_locked" boolean DEFAULT false NOT NULL,
  "created_by" text,
  "updated_by" text,
  "fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "form_sections_agency_idx" ON "form_sections" ("agency_id");
CREATE INDEX IF NOT EXISTS "form_sections_scope_idx" ON "form_sections" ("agency_id","scope","status");
CREATE INDEX IF NOT EXISTS "form_sections_created_by_idx" ON "form_sections" ("created_by");

CREATE TABLE IF NOT EXISTS "form_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "kind" text DEFAULT 'other' NOT NULL,
  "url" text NOT NULL,
  "mime_type" text,
  "size_bytes" integer,
  "width" integer,
  "height" integer,
  "folder" text,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "scope" text DEFAULT 'organization' NOT NULL,
  "visibility" text DEFAULT 'organization' NOT NULL,
  "client_id" uuid,
  "website_id" uuid,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "created_by" text,
  "updated_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "form_assets_agency_idx" ON "form_assets" ("agency_id");
CREATE INDEX IF NOT EXISTS "form_assets_kind_idx" ON "form_assets" ("agency_id","kind");
CREATE INDEX IF NOT EXISTS "form_assets_folder_idx" ON "form_assets" ("agency_id","folder");
