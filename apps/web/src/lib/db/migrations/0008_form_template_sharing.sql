-- Template shares + approval/lock columns (ADR-007 Step 4).
ALTER TABLE "form_templates" ADD COLUMN IF NOT EXISTS "locked_at" timestamp with time zone;
ALTER TABLE "form_templates" ADD COLUMN IF NOT EXISTS "submitted_by" text;
ALTER TABLE "form_templates" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp with time zone;
ALTER TABLE "form_templates" ADD COLUMN IF NOT EXISTS "reviewed_by" text;
ALTER TABLE "form_templates" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;
ALTER TABLE "form_templates" ADD COLUMN IF NOT EXISTS "review_note" text;

CREATE TABLE IF NOT EXISTS "form_template_shares" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "template_id" uuid NOT NULL,
  "target_type" text NOT NULL,
  "target_user_id" text,
  "target_role" text,
  "team_id" text,
  "permissions" jsonb DEFAULT '["view","duplicate"]'::jsonb NOT NULL,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "form_template_shares_tpl_idx" ON "form_template_shares" ("template_id");
CREATE INDEX IF NOT EXISTS "form_template_shares_user_idx" ON "form_template_shares" ("target_user_id");
CREATE INDEX IF NOT EXISTS "form_template_shares_agency_idx" ON "form_template_shares" ("agency_id");
