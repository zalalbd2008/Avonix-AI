-- The application's database role.
--
-- WHY THIS FILE EXISTS: PostgreSQL superusers bypass row-level security
-- entirely, and table owners bypass it unless FORCE ROW LEVEL SECURITY is set.
-- If the application connects as the superuser that ran the migrations, every
-- policy in rls.sql is dead code and tenant isolation silently does not exist.
--
-- `avonix_app` is deliberately NOT a superuser and does NOT own any table.
-- Run migrations as the owner; run the application as this role.
--
-- Usage:
--   psql "$ADMIN_URL" -v app_password="'...'" -f roles.sql
-- then point DATABASE_URL at avonix_app.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'avonix_app') THEN
    CREATE ROLE avonix_app LOGIN;
  END IF;
END $$;

\if :{?app_password}
  ALTER ROLE avonix_app PASSWORD :app_password;
\endif

-- No CREATE: the application must not be able to add tables, and therefore
-- cannot create a table that is missing a tenant policy.
GRANT CONNECT ON DATABASE avonix_dev TO avonix_app;
GRANT USAGE ON SCHEMA public TO avonix_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO avonix_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO avonix_app;

-- Tables added by future migrations inherit the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO avonix_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO avonix_app;

-- The migrations table is drizzle's bookkeeping; the app never touches it.
REVOKE ALL ON TABLE drizzle.__drizzle_migrations FROM avonix_app;
