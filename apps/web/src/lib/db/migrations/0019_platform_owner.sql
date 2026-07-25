-- ADR-012 Platform Owner & recovery
DO $$ BEGIN
  CREATE TYPE "public"."platform_account_status" AS ENUM('active', 'disabled', 'locked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "platform_owner" boolean DEFAULT false NOT NULL,
  "break_glass" boolean DEFAULT false NOT NULL,
  "status" "platform_account_status" DEFAULT 'active' NOT NULL,
  "recovery_email" text,
  "recovery_phone" text,
  "emergency_key_hash" text,
  "mfa_enabled" boolean DEFAULT false NOT NULL,
  "break_glass_enabled_at" timestamp with time zone,
  "last_recovered_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "platform_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_accounts_user_key" ON "platform_accounts" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_accounts_owner_idx" ON "platform_accounts" USING btree ("platform_owner");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_accounts_break_glass_idx" ON "platform_accounts" USING btree ("break_glass");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_accounts_one_owner"
  ON "platform_accounts" ("platform_owner")
  WHERE "platform_owner" = true;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_recovery_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "code_hash" text NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "platform_recovery_codes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_recovery_codes_user_idx" ON "platform_recovery_codes" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platform_recovery_codes_hash_key" ON "platform_recovery_codes" USING btree ("code_hash");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_security_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text,
  "event" text NOT NULL,
  "detail" text,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "platform_security_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_security_events_user_idx" ON "platform_security_events" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_security_events_event_idx" ON "platform_security_events" USING btree ("event");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_security_events_created_idx" ON "platform_security_events" USING btree ("created_at");
