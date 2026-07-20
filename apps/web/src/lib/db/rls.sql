-- Row-level security — the enforcement of ADR-002.
--
-- Tenant isolation is a database guarantee here, not an application convention.
-- Forgetting a `WHERE agency_id = ...` in application code must not be able to
-- leak one agency's data to another.
--
-- Apply after every `drizzle-kit migrate`.

CREATE EXTENSION IF NOT EXISTS vector;

-- The request-scoped tenant. Set once per connection checkout, in db/index.ts.
CREATE OR REPLACE FUNCTION current_agency_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.agency_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'clients', 'websites', 'contacts', 'conversations', 'messages',
    'pipelines', 'pipeline_stages', 'pipeline_cards',
    'forms', 'form_submissions', 'knowledge_chunks', 'ai_usage_daily'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING (agency_id = current_agency_id())
        WITH CHECK (agency_id = current_agency_id())
    $f$, t);
  END LOOP;
END $$;

-- `agencies` is keyed by id rather than agency_id.
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON agencies;
CREATE POLICY tenant_isolation ON agencies
  USING (id = current_agency_id())
  WITH CHECK (id = current_agency_id());

-- Deliberately NOT tenant-scoped, and this is load-bearing:
--
--   user, session, account, verification  Better Auth's tables. Authentication
--     happens before any agency is known, so a tenant policy here would make
--     login impossible.
--   memberships  the join that *decides* the tenant. Reading it under a tenant
--     policy would be circular. It is filtered in application code, in
--     lib/auth/session.ts, and nowhere else.
