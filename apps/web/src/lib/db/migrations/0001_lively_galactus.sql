CREATE TYPE "public"."tracked_event_type" AS ENUM('pageview', 'button', 'consultation', 'form');--> statement-breakpoint
CREATE TABLE "report_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"branding" jsonb DEFAULT '{"logoUrl":null,"footerCredit":"","phone":"","email":""}'::jsonb NOT NULL,
	"mask_ips" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracked_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"event_type" "tracked_event_type" NOT NULL,
	"element_label" text,
	"css_class" text,
	"purpose" text,
	"page_path" text NOT NULL,
	"ip_address" text,
	"country" text,
	"city" text,
	"device" text,
	"browser" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_events" ADD CONSTRAINT "tracked_events_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_events" ADD CONSTRAINT "tracked_events_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "report_shares_slug_key" ON "report_shares" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "report_shares_website_key" ON "report_shares" USING btree ("website_id");--> statement-breakpoint
CREATE INDEX "tracked_events_website_idx" ON "tracked_events" USING btree ("website_id","created_at");--> statement-breakpoint
CREATE INDEX "tracked_events_type_idx" ON "tracked_events" USING btree ("website_id","event_type");--> statement-breakpoint
CREATE INDEX "tracked_events_agency_idx" ON "tracked_events" USING btree ("agency_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_agency_user_key" ON "memberships" USING btree ("agency_id","user_id");