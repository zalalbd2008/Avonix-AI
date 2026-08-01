-- Platform AI API keys (encrypted jsonb on platform_settings)
ALTER TABLE "platform_settings"
  ADD COLUMN IF NOT EXISTS "ai_keys" jsonb DEFAULT '{}'::jsonb NOT NULL;
