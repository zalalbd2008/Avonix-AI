-- Context-aware CTA button groups + buttons (ADR-009).

CREATE TABLE IF NOT EXISTS "cta_button_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "website_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "priority_rank" integer DEFAULT 100 NOT NULL,
  "settings" jsonb DEFAULT '{"placement":{"mobile":"footer_mobile","tablet":"footer_tablet","desktop":"floating"},"pageTarget":{"mode":"everywhere"},"priority":"medium","frequency":"always","maxVisible":4,"collapseToFab":true,"safeArea":true}'::jsonb NOT NULL,
  "created_by" text,
  "updated_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "cta_button_groups_agency_idx" ON "cta_button_groups" ("agency_id");
CREATE INDEX IF NOT EXISTS "cta_button_groups_website_idx" ON "cta_button_groups" ("website_id","status");

CREATE TABLE IF NOT EXISTS "cta_buttons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "name" text NOT NULL,
  "status" text DEFAULT 'published' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "payload" jsonb NOT NULL,
  "created_by" text,
  "updated_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "cta_buttons_agency_idx" ON "cta_buttons" ("agency_id");
CREATE INDEX IF NOT EXISTS "cta_buttons_group_idx" ON "cta_buttons" ("group_id","sort_order");
