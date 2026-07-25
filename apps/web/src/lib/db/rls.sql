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
    'forms', 'form_submissions', 'form_analytics_events', 'form_templates', 'form_template_versions', 'form_template_favorites', 'form_template_collections', 'form_template_collection_items', 'form_template_shares', 'form_components', 'form_sections', 'form_assets', 'marketplace_installs', 'cta_button_groups', 'cta_buttons', 'cta_button_templates', 'popups', 'popup_templates', 'cep_widgets', 'knowledge_chunks', 'ai_usage_daily',
    'tracked_events',
    'org_roles', 'org_role_permissions'
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

-- Marketplace listings (ADR-008): published snapshots are readable by any
-- authenticated tenant; writes remain publisher-tenant only.
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketplace_listings_select ON marketplace_listings;
DROP POLICY IF EXISTS marketplace_listings_write ON marketplace_listings;
CREATE POLICY marketplace_listings_select ON marketplace_listings
  FOR SELECT
  USING (
    agency_id = current_agency_id()
    OR (status = 'published' AND deleted_at IS NULL)
  );
CREATE POLICY marketplace_listings_write ON marketplace_listings
  FOR ALL
  USING (agency_id = current_agency_id())
  WITH CHECK (agency_id = current_agency_id());

-- Narrow privilege: any authenticated tenant may bump install_count on a
-- published listing after copying it into their own library (ADR-008).
CREATE OR REPLACE FUNCTION bump_marketplace_install_count(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE marketplace_listings
  SET install_count = install_count + 1,
      updated_at = now()
  WHERE id = p_listing_id
    AND status = 'published'
    AND deleted_at IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION bump_marketplace_install_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bump_marketplace_install_count(uuid) TO avonix_app;

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
--   memberships  the join that *decides* the tenant for a signed-in user.
--     Reading it under a tenant policy would be circular. Filtered in
--     lib/auth/session.ts and nowhere else.
--   connector_keys  the same thing for a plugin: it decides the tenant from a
--     key alone. Filtered in lib/connector/auth.ts and nowhere else.
--   reply_tokens  the same thing for an inbound email. Filtered in
--     lib/crm/inbound.ts and nowhere else.
--   billing_customers  the same thing for a Stripe webhook, which knows only a
--     customer id. Filtered in lib/billing/sync.ts and nowhere else.
--   billing_events  the idempotency log; deduping happens before the customer
--     is resolved.
--   report_shares  the same thing for a public report link: a visitor arrives
--     at /r/{slug} with no session, so the slug alone has to name the tenant.
--     Filtered in lib/reports/share.ts and nowhere else.
--   platform_accounts / platform_recovery_codes / platform_security_events
--     ADR-012 Platform Owner. Privilege is decided before any agency is chosen,
--     so tenant RLS would be circular. Filtered in lib/platform/owner.ts and
--     requirePlatformOwner().
--   organization_invitations  token lookup before tenant is known (accept
--     flow). Filtered in lib/team/service.ts by token_hash / agency_id.
--
-- That is now five tables of the same shape, and the shape is worth naming:
-- something the caller presents (a key, a token, a customer id, a slug) is
-- exchanged for a tenant. Putting such a lookup on a tenant-scoped table is the
-- single most repeated bug in this codebase's history — it never errors, it
-- just returns zero rows, and the feature silently does nothing.
--   rate_limits  throttles callers *before* we know or trust which tenant they
--     claim to be.
