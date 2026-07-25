CREATE TABLE IF NOT EXISTS "cep_widgets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "website_id" uuid NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "surface" text DEFAULT 'bubble' NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "priority_rank" integer DEFAULT 100 NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cep_widgets" ADD CONSTRAINT "cep_widgets_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cep_widgets" ADD CONSTRAINT "cep_widgets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cep_widgets" ADD CONSTRAINT "cep_widgets_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cep_widgets_agency_idx" ON "cep_widgets" USING btree ("agency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cep_widgets_website_idx" ON "cep_widgets" USING btree ("website_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cep_widgets_website_enabled_idx" ON "cep_widgets" USING btree ("website_id","is_enabled");
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "blocks" jsonb;
