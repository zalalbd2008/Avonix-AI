-- Missed-chat dedupe + email click tracking
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "missed_chat_alerted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "automation_follow_ups" ADD COLUMN IF NOT EXISTS "clicked_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_missed_chat_idx" ON "conversations" ("handoff_status", "last_message_at");
