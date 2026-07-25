-- Form analytics funnel + submission attribution.
ALTER TABLE "form_submissions" ADD COLUMN IF NOT EXISTS "meta" jsonb DEFAULT '{}'::jsonb NOT NULL;

CREATE TABLE IF NOT EXISTS "form_analytics_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "form_id" uuid NOT NULL,
  "website_id" uuid,
  "event_type" text NOT NULL,
  "session_id" text,
  "field_key" text,
  "step_id" text,
  "duration_ms" integer,
  "page_url" text,
  "utm" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "form_analytics_form_idx" ON "form_analytics_events" ("form_id","created_at");
CREATE INDEX IF NOT EXISTS "form_analytics_type_idx" ON "form_analytics_events" ("form_id","event_type");
CREATE INDEX IF NOT EXISTS "form_analytics_agency_idx" ON "form_analytics_events" ("agency_id");
