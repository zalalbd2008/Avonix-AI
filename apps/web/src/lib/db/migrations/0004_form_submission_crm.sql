-- Admin CRM layer: per-submission priority / notes / tags / status / timeline.
ALTER TABLE "form_submissions" ADD COLUMN IF NOT EXISTS "crm" jsonb DEFAULT '{}'::jsonb NOT NULL;
