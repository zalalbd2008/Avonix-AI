-- ADR-013: org roles, permissions, invitations
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "custom_role_id" uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_custom_role_idx" ON "memberships" ("custom_role_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL REFERENCES "agencies"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "is_system" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_roles_agency_idx" ON "org_roles" ("agency_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_roles_agency_name_key" ON "org_roles" ("agency_id", "name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_role_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL REFERENCES "agencies"("id") ON DELETE CASCADE,
  "role_id" uuid NOT NULL REFERENCES "org_roles"("id") ON DELETE CASCADE,
  "permission" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_role_permissions_role_idx" ON "org_role_permissions" ("role_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_role_permissions_agency_idx" ON "org_role_permissions" ("agency_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_role_permissions_role_perm_key"
  ON "org_role_permissions" ("role_id", "permission");
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "invitation_status" AS ENUM ('pending', 'accepted', 'revoked', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL REFERENCES "agencies"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "member_role" text DEFAULT 'member' NOT NULL,
  "custom_role_id" uuid REFERENCES "org_roles"("id") ON DELETE SET NULL,
  "token_hash" text NOT NULL,
  "status" "invitation_status" DEFAULT 'pending' NOT NULL,
  "invited_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "accepted_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_invitations_agency_idx" ON "organization_invitations" ("agency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_invitations_email_idx" ON "organization_invitations" ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_invitations_token_key"
  ON "organization_invitations" ("token_hash");
--> statement-breakpoint
ALTER TABLE "memberships"
  DROP CONSTRAINT IF EXISTS "memberships_custom_role_id_fk";
--> statement-breakpoint
ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_custom_role_id_fk"
  FOREIGN KEY ("custom_role_id") REFERENCES "org_roles"("id") ON DELETE SET NULL;
