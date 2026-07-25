-- Template favorites + collections (ADR-007 Step 3).
CREATE TABLE IF NOT EXISTS "form_template_favorites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "template_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "form_template_favorites_uniq"
  ON "form_template_favorites" ("agency_id","user_id","template_id");
CREATE INDEX IF NOT EXISTS "form_template_favorites_user_idx"
  ON "form_template_favorites" ("user_id");

CREATE TABLE IF NOT EXISTS "form_template_collections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "visibility" text DEFAULT 'personal' NOT NULL,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "form_template_collections_agency_idx"
  ON "form_template_collections" ("agency_id");
CREATE INDEX IF NOT EXISTS "form_template_collections_owner_idx"
  ON "form_template_collections" ("created_by");

CREATE TABLE IF NOT EXISTS "form_template_collection_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "collection_id" uuid NOT NULL,
  "template_id" uuid NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "form_template_collection_items_uniq"
  ON "form_template_collection_items" ("collection_id","template_id");
CREATE INDEX IF NOT EXISTS "form_template_collection_items_tpl_idx"
  ON "form_template_collection_items" ("template_id");
