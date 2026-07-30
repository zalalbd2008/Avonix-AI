# ADR-008 — Platform Template Marketplace (narrow tenancy exception)

**Status:** Accepted · 2026-07-22  
**Amends:** ADR-006 (organizations), ADR-007 Step 7  
**Depends on:** ADR-002 (RLS), ADR-007 (org template library)

## Context

ADR-006 rejected “sharing anything between organizations” because live
cross-tenant reads of CRM data would break isolation. ADR-007 deferred the
Platform Marketplace until an explicit amendment.

The product still needs Level 3 of the template architecture: Official /
community templates that any organization can **browse and install**. Payments and a true seller **Connect** payout rail can wait; buyer Checkout
and entitlements ship now. The tenancy rule cannot.

## Decision

1. **Marketplace listings are immutable snapshots**, not live joins into another
   org’s `form_templates`. Publishing copies `fields` + `settings` (+ metadata)
   into `marketplace_listings` at that moment.
2. **`marketplace_listings` uses a deliberate RLS exception:**
   - `SELECT` allowed when `agency_id = current_agency_id()` **or**
     `status = 'published'`
   - `INSERT` / `UPDATE` / `DELETE` only when `agency_id = current_agency_id()`
3. **Install always writes into the buyer’s tenant** — a new `form_templates`
   (or component) row with the buyer’s `agency_id`. No foreign key into the
   seller’s live tables.
4. **`marketplace_installs` stays fully tenant-scoped** (buyer `agency_id` only)
   for usage analytics inside the installing org.
5. **Official Avonix packs** may ship as code (`BUILT_IN_FORM_TEMPLATES`) and/or
   DB rows with `is_official = true`; they still install by copy.
6. **Premium listings** use Stripe Checkout (`mode: payment`) with
   `price_data` from `price_cents`. Buyer entitlement is stored in
   `marketplace_purchases`. Funds settle on the platform Stripe account;
   `seller_net_cents` / `platform_fee_cents` are ledgered for future Connect
   payouts (`MARKETPLACE_PLATFORM_FEE_BPS`, default 20%).
7. **Install counters** on another org’s listing are updated only via
   `bump_marketplace_install_count()` (SECURITY DEFINER, published rows only) —
   buyers never gain UPDATE on seller rows.

## What this does *not* allow

- Reading another org’s clients, contacts, forms, submissions, or unpublished
  templates.
- A Super Admin page that bypasses RLS across tenants (still rejected by
  ADR-006).
- Live “linked” templates that update buyers when the seller edits.

## Consequences

- ADR-006’s blanket “no sharing between organizations” gains one named
  exception: **published marketplace listing snapshots**.
- ADR-007 Step 7 can ship without inventing a second database role.
- Future seller **Connect payouts** build on `marketplace_purchases` ledger
  columns; they do not need a second tenancy model.

## Rejected

**Live cross-tenant SELECT on `form_templates`.** That would make every template
query a potential leak surface. Snapshots only.

**Staff role that can publish as any agency.** Official packs are either code
or published by a real membership in a real org.
