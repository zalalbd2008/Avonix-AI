CREATE TABLE IF NOT EXISTS "cta_button_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "category" text,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "payload" jsonb NOT NULL,
  "scope" text DEFAULT 'organization' NOT NULL,
  "status" text DEFAULT 'published' NOT NULL,
  "visibility" text DEFAULT 'organization' NOT NULL,
  "client_id" uuid,
  "website_id" uuid,
  "team_id" text,
  "source_button_id" uuid,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cta_button_templates" ADD CONSTRAINT "cta_button_templates_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cta_button_templates" ADD CONSTRAINT "cta_button_templates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cta_button_templates" ADD CONSTRAINT "cta_button_templates_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cta_button_templates" ADD CONSTRAINT "cta_button_templates_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cta_button_templates_agency_idx" ON "cta_button_templates" USING btree ("agency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cta_button_templates_scope_idx" ON "cta_button_templates" USING btree ("agency_id","scope","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cta_button_templates_website_idx" ON "cta_button_templates" USING btree ("website_id");
