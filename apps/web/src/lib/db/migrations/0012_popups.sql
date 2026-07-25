CREATE TABLE IF NOT EXISTS "popups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "website_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "type" text DEFAULT 'welcome' NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "priority_rank" integer DEFAULT 100 NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "payload" jsonb NOT NULL,
  "created_by" text,
  "updated_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "popups" ADD CONSTRAINT "popups_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "popups" ADD CONSTRAINT "popups_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "popups" ADD CONSTRAINT "popups_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "popups" ADD CONSTRAINT "popups_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "popups" ADD CONSTRAINT "popups_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "popups_agency_idx" ON "popups" USING btree ("agency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "popups_website_idx" ON "popups" USING btree ("website_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "popups_website_type_idx" ON "popups" USING btree ("website_id","type");
