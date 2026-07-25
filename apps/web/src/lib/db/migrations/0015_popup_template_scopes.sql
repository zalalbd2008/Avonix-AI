ALTER TABLE "popup_templates" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "popup_templates" ADD COLUMN IF NOT EXISTS "scope" text DEFAULT 'organization' NOT NULL;
--> statement-breakpoint
ALTER TABLE "popup_templates" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'published' NOT NULL;
--> statement-breakpoint
ALTER TABLE "popup_templates" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'organization' NOT NULL;
--> statement-breakpoint
ALTER TABLE "popup_templates" ADD COLUMN IF NOT EXISTS "client_id" uuid;
--> statement-breakpoint
ALTER TABLE "popup_templates" ADD COLUMN IF NOT EXISTS "website_id" uuid;
--> statement-breakpoint
ALTER TABLE "popup_templates" ADD COLUMN IF NOT EXISTS "team_id" text;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "popup_templates" ADD CONSTRAINT "popup_templates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "popup_templates" ADD CONSTRAINT "popup_templates_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "popup_templates_scope_idx" ON "popup_templates" USING btree ("agency_id","scope","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "popup_templates_website_idx" ON "popup_templates" USING btree ("website_id");
