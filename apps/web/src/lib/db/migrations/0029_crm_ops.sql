CREATE TYPE "public"."crm_task_status" AS ENUM('open', 'done', 'cancelled');
--> statement-breakpoint
CREATE TYPE "public"."crm_ticket_status" AS ENUM('open', 'pending', 'waiting', 'resolved', 'closed');
--> statement-breakpoint
CREATE TYPE "public"."crm_doc_status" AS ENUM('draft', 'sent', 'viewed', 'approved', 'signed', 'paid', 'void');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "contact_id" uuid,
  "title" text NOT NULL,
  "due_at" timestamp with time zone,
  "status" "crm_task_status" DEFAULT 'open' NOT NULL,
  "assignee" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "contact_id" uuid,
  "body" text NOT NULL,
  "pinned" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "contact_id" uuid,
  "name" text NOT NULL,
  "kind" text DEFAULT 'other' NOT NULL,
  "url" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_assignment_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "name" text NOT NULL,
  "match_field" text DEFAULT 'city' NOT NULL,
  "match_value" text NOT NULL,
  "assignee" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "contact_id" uuid,
  "subject" text NOT NULL,
  "status" "crm_ticket_status" DEFAULT 'open' NOT NULL,
  "assignee" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_calendar_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "contact_id" uuid,
  "title" text NOT NULL,
  "kind" text DEFAULT 'meeting' NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "contact_id" uuid,
  "doc_type" text NOT NULL,
  "title" text NOT NULL,
  "status" "crm_doc_status" DEFAULT 'draft' NOT NULL,
  "amount_cents" integer DEFAULT 0 NOT NULL,
  "currency" text DEFAULT 'USD' NOT NULL,
  "body" text DEFAULT '' NOT NULL,
  "meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "crm_files" ADD CONSTRAINT "crm_files_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "crm_files" ADD CONSTRAINT "crm_files_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "crm_assignment_rules" ADD CONSTRAINT "crm_assignment_rules_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "crm_assignment_rules" ADD CONSTRAINT "crm_assignment_rules_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "crm_tickets" ADD CONSTRAINT "crm_tickets_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "crm_tickets" ADD CONSTRAINT "crm_tickets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "crm_calendar_events" ADD CONSTRAINT "crm_calendar_events_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "crm_calendar_events" ADD CONSTRAINT "crm_calendar_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "crm_documents" ADD CONSTRAINT "crm_documents_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "crm_documents" ADD CONSTRAINT "crm_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_tasks_client_idx" ON "crm_tasks" ("client_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_tasks_agency_idx" ON "crm_tasks" ("agency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_notes_client_idx" ON "crm_notes" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_notes_contact_idx" ON "crm_notes" ("contact_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_files_client_idx" ON "crm_files" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_assignment_rules_client_idx" ON "crm_assignment_rules" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_tickets_client_idx" ON "crm_tickets" ("client_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_calendar_client_idx" ON "crm_calendar_events" ("client_id","starts_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_documents_client_idx" ON "crm_documents" ("client_id","doc_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_documents_agency_idx" ON "crm_documents" ("agency_id");
