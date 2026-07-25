-- Pending plugin self-uninstall after website hard-delete
CREATE TABLE IF NOT EXISTS "plugin_uninstall_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "secret_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plugin_uninstall_tokens_hash_key" ON "plugin_uninstall_tokens" ("secret_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plugin_uninstall_tokens_expires_idx" ON "plugin_uninstall_tokens" ("expires_at");
