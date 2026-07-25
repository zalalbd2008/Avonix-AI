-- CEP P1: dual-brain handoff on conversations
DO $$ BEGIN
  CREATE TYPE "public"."conversation_handoff" AS ENUM('ai', 'queued', 'agent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "handoff_status" "conversation_handoff" DEFAULT 'ai' NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_handoff_idx" ON "conversations" USING btree ("handoff_status","last_message_at");
