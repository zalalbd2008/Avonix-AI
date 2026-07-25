CREATE TABLE IF NOT EXISTS "popup_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "type" text DEFAULT 'custom' NOT NULL,
  "category" text,
  "payload" jsonb NOT NULL,
  "source_popup_id" uuid,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "popup_templates" ADD CONSTRAINT "popup_templates_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "popup_templates" ADD CONSTRAINT "popup_templates_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "popup_templates_agency_idx" ON "popup_templates" USING btree ("agency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "popup_templates_agency_type_idx" ON "popup_templates" USING btree ("agency_id","type");
