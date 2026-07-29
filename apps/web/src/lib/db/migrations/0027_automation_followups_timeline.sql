-- Visitor journey + delayed automation follow-ups (Phase 3+)
CREATE TYPE "public"."automation_follow_up_status" AS ENUM('pending', 'sent', 'skipped', 'cancelled');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visitor_timeline_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "website_id" uuid,
  "event_type" text NOT NULL,
  "title" text NOT NULL,
  "detail" text,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automation_follow_ups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "website_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "rule_id" text NOT NULL,
  "rule_name" text DEFAULT '' NOT NULL,
  "status" "automation_follow_up_status" DEFAULT 'pending' NOT NULL,
  "run_at" timestamp with time zone NOT NULL,
  "open_token" text NOT NULL,
  "opened_at" timestamp with time zone,
  "branch_on_open" integer DEFAULT 1 NOT NULL,
  "offer_message" text DEFAULT '' NOT NULL,
  "reminder_message" text DEFAULT '' NOT NULL,
  "subject_offer" text DEFAULT '' NOT NULL,
  "subject_reminder" text DEFAULT '' NOT NULL,
  "to_email" text NOT NULL,
  "website_name" text DEFAULT '' NOT NULL,
  "reply_to" text DEFAULT '' NOT NULL,
  "merge_ctx" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "sent_at" timestamp with time zone,
  "sent_kind" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "visitor_timeline_events" ADD CONSTRAINT "visitor_timeline_events_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "visitor_timeline_events" ADD CONSTRAINT "visitor_timeline_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "visitor_timeline_events" ADD CONSTRAINT "visitor_timeline_events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "visitor_timeline_events" ADD CONSTRAINT "visitor_timeline_events_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "automation_follow_ups" ADD CONSTRAINT "automation_follow_ups_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "automation_follow_ups" ADD CONSTRAINT "automation_follow_ups_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "automation_follow_ups" ADD CONSTRAINT "automation_follow_ups_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "automation_follow_ups" ADD CONSTRAINT "automation_follow_ups_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visitor_timeline_contact_idx" ON "visitor_timeline_events" ("contact_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visitor_timeline_agency_idx" ON "visitor_timeline_events" ("agency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visitor_timeline_website_idx" ON "visitor_timeline_events" ("website_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "automation_follow_ups_token_key" ON "automation_follow_ups" ("open_token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automation_follow_ups_due_idx" ON "automation_follow_ups" ("status","run_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automation_follow_ups_contact_idx" ON "automation_follow_ups" ("contact_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automation_follow_ups_agency_idx" ON "automation_follow_ups" ("agency_id");
