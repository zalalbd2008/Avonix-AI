-- Scope CRM ops rows to a website (site workspace CRM)
ALTER TABLE "crm_tasks" ADD COLUMN IF NOT EXISTS "website_id" uuid;
--> statement-breakpoint
ALTER TABLE "crm_notes" ADD COLUMN IF NOT EXISTS "website_id" uuid;
--> statement-breakpoint
ALTER TABLE "crm_files" ADD COLUMN IF NOT EXISTS "website_id" uuid;
--> statement-breakpoint
ALTER TABLE "crm_assignment_rules" ADD COLUMN IF NOT EXISTS "website_id" uuid;
--> statement-breakpoint
ALTER TABLE "crm_tickets" ADD COLUMN IF NOT EXISTS "website_id" uuid;
--> statement-breakpoint
ALTER TABLE "crm_calendar_events" ADD COLUMN IF NOT EXISTS "website_id" uuid;
--> statement-breakpoint
ALTER TABLE "crm_documents" ADD COLUMN IF NOT EXISTS "website_id" uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_tasks_website_idx" ON "crm_tasks" ("website_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_notes_website_idx" ON "crm_notes" ("website_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_files_website_idx" ON "crm_files" ("website_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_assign_website_idx" ON "crm_assignment_rules" ("website_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_tickets_website_idx" ON "crm_tickets" ("website_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_calendar_website_idx" ON "crm_calendar_events" ("website_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_documents_website_idx" ON "crm_documents" ("website_id");
