-- ADR-012 amend: up to 4 Platform Owners + settings
ALTER TABLE "platform_accounts" ADD COLUMN IF NOT EXISTS "purpose" text DEFAULT 'primary' NOT NULL;
--> statement-breakpoint
ALTER TABLE "platform_accounts" ADD COLUMN IF NOT EXISTS "label" text;
--> statement-breakpoint
DROP INDEX IF EXISTS "platform_accounts_one_owner";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
  "max_platform_owners" integer DEFAULT 4 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "platform_settings" ("id", "max_platform_owners")
VALUES ('default', 4)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
-- At most one break-glass seat
CREATE UNIQUE INDEX IF NOT EXISTS "platform_accounts_one_break_glass"
  ON "platform_accounts" ("break_glass")
  WHERE "break_glass" = true;
