-- Align agency_plan with product tiers:
-- Starter · Professional · Agency · Enterprise
-- Legacy: free → starter, pro → professional

ALTER TABLE "agencies" ALTER COLUMN "plan" DROP DEFAULT;--> statement-breakpoint

ALTER TABLE "agencies" ALTER COLUMN "plan" TYPE text USING "plan"::text;--> statement-breakpoint

DROP TYPE "public"."agency_plan";--> statement-breakpoint

UPDATE "agencies"
SET "plan" = CASE "plan"
  WHEN 'free' THEN 'starter'
  WHEN 'pro' THEN 'professional'
  ELSE "plan"
END;--> statement-breakpoint

UPDATE "agencies"
SET "billing_overrides" = jsonb_set(
  "billing_overrides",
  '{complimentaryPlan}',
  to_jsonb(
    CASE "billing_overrides"->>'complimentaryPlan'
      WHEN 'free' THEN 'starter'
      WHEN 'pro' THEN 'professional'
      ELSE "billing_overrides"->>'complimentaryPlan'
    END
  )
)
WHERE "billing_overrides" ? 'complimentaryPlan'
  AND "billing_overrides"->>'complimentaryPlan' IN ('free', 'pro');--> statement-breakpoint

CREATE TYPE "public"."agency_plan" AS ENUM('starter', 'professional', 'agency', 'enterprise');--> statement-breakpoint

ALTER TABLE "agencies"
  ALTER COLUMN "plan" TYPE "public"."agency_plan" USING "plan"::"public"."agency_plan";--> statement-breakpoint

ALTER TABLE "agencies" ALTER COLUMN "plan" SET DEFAULT 'starter'::"public"."agency_plan";--> statement-breakpoint

UPDATE "agencies"
SET
  "status" = CASE WHEN "status" = 'trialing' THEN 'active' ELSE "status" END,
  "trial_ends_at" = NULL,
  "updated_at" = now()
WHERE "deleted_at" IS NULL
  AND ("status" = 'trialing' OR "trial_ends_at" IS NOT NULL);
