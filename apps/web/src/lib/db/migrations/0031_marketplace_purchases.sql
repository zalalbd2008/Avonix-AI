-- Paid marketplace purchases (buyer entitlements + seller ledger).

CREATE TABLE IF NOT EXISTS "marketplace_purchases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL,
  "listing_id" uuid NOT NULL,
  "seller_agency_id" uuid NOT NULL,
  "amount_cents" integer NOT NULL,
  "currency" text DEFAULT 'usd' NOT NULL,
  "platform_fee_cents" integer DEFAULT 0 NOT NULL,
  "seller_net_cents" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "stripe_checkout_session_id" text,
  "stripe_payment_intent_id" text,
  "purchased_by" text,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketplace_purchases_agency_idx" ON "marketplace_purchases" ("agency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketplace_purchases_listing_idx" ON "marketplace_purchases" ("listing_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketplace_purchases_seller_idx" ON "marketplace_purchases" ("seller_agency_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_purchases_session_uniq" ON "marketplace_purchases" ("stripe_checkout_session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_purchases_paid_uniq" ON "marketplace_purchases" ("agency_id","listing_id");
