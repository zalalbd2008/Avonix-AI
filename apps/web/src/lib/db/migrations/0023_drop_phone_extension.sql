-- Drop unused phone extension from account profile
ALTER TABLE "user" DROP COLUMN IF EXISTS "phone_extension";
