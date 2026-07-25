-- Organization Cloud Form Template Library (ADR-007).
CREATE TABLE IF NOT EXISTS "form_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "category" text,
  "sub_category" text,
  "industry" text,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "department" text,
  "language" text DEFAULT 'en' NOT NULL,
  "region" text,
  "thumbnail_url" text,
  "preview_image_url" text,
  "version" integer DEFAULT 1 NOT NULL,
  "fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "settings" jsonb DEFAULT '{"steps":[]}'::jsonb NOT NULL,
  "submit_label" text DEFAULT 'Send' NOT NULL,
  "success_message" text DEFAULT 'Thanks — we''ll be in touch.' NOT NULL,
  "scope" text DEFAULT 'organization' NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "visibility" text DEFAULT 'organization' NOT NULL,
  "client_id" uuid,
  "website_id" uuid,
  "team_id" text,
  "source_form_id" uuid,
  "created_by" text,
  "updated_by" text,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "is_locked" boolean DEFAULT false NOT NULL,
  "locked_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "form_templates_agency_idx" ON "form_templates" ("agency_id");
CREATE INDEX IF NOT EXISTS "form_templates_scope_idx" ON "form_templates" ("agency_id","scope","status");
CREATE INDEX IF NOT EXISTS "form_templates_website_idx" ON "form_templates" ("website_id");
CREATE INDEX IF NOT EXISTS "form_templates_created_by_idx" ON "form_templates" ("created_by");

CREATE TABLE IF NOT EXISTS "form_template_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "template_id" uuid NOT NULL,
  "version" integer NOT NULL,
  "changelog" text,
  "fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "settings" jsonb DEFAULT '{"steps":[]}'::jsonb NOT NULL,
  "submit_label" text DEFAULT 'Send' NOT NULL,
  "success_message" text DEFAULT 'Thanks — we''ll be in touch.' NOT NULL,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "form_template_versions_tpl_idx" ON "form_template_versions" ("template_id","version");
CREATE INDEX IF NOT EXISTS "form_template_versions_agency_idx" ON "form_template_versions" ("agency_id");
