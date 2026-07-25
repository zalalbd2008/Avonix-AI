-- Billing profile / overrides / interval for Plan & Billing screens
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "billing_interval" text;
--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "billing_profile" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "billing_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL;
