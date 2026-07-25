-- Account profile fields for Settings → Personal Data
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phone" text;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phone_extension" text;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "locale" text DEFAULT 'en' NOT NULL;
