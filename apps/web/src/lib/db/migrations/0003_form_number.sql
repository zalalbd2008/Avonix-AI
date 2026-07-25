-- Sequential shortcode ids per website: [avonix_form id="1"]
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "form_number" integer;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(website_id, client_id)
      ORDER BY created_at ASC
    ) AS n
  FROM forms
)
UPDATE forms
SET form_number = ranked.n
FROM ranked
WHERE forms.id = ranked.id AND forms.form_number IS NULL;

UPDATE forms SET form_number = 1 WHERE form_number IS NULL;

ALTER TABLE "forms" ALTER COLUMN "form_number" SET DEFAULT 1;
ALTER TABLE "forms" ALTER COLUMN "form_number" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "forms_website_number_uidx"
  ON "forms" ("website_id", "form_number")
  WHERE "website_id" IS NOT NULL;
