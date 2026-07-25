-- Ultimate form builder: multi-step titles live in settings jsonb.
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "settings" jsonb DEFAULT '{"steps":[]}'::jsonb NOT NULL;
