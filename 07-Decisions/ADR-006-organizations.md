# ADR-006 — One user, many organizations

**Status:** Accepted · 2026-07-21
**Amends:** ADR-002 (Agency → Client → Website)

## Context

ADR-002 made the agency the tenant and said one account owns exactly one. The
prototype's Organizations screen shows three, each with its own clients,
websites and plan, and the product owner confirmed that is the intent: an
organization has multiple websites under it, and a person can hold more than one
organization.

The reason ADR-002 gave for a single organization was that a second level costs
a new tenant key and a rewrite of every row-level-security policy. That reason
turned out to be wrong, and it is worth being precise about why: it assumed
organizations would sit *above* agencies as a new level. They do not. An
organization **is** the agency — the same row, the same `agency_id`, the same
thirteen policies. What was missing was never a table. It was the ability to
hold more than one membership and to choose between them.

`memberships` has always been a join table of (user, agency, role). Nothing in
the schema ever said a user had one row in it. `getActiveContext` simply took
the first with `.limit(1)`.

## Decision

**A user may belong to any number of organizations. Exactly one is active per
request, chosen by a cookie, and the cookie is validated against `memberships`
on every read.**

Three parts, and the third is the only one that carries risk:

1. `getActiveContext` reads *all* memberships instead of one.
2. `avonix_org` names the preferred organization. `/organizations` lists what
   you belong to and switching sets it.
3. **The cookie is a preference, never an authorisation.** The chosen id must
   appear in the caller's own membership list or it is discarded and the first
   membership is used instead.

## Consequences

- No migration. No new table, no new column, no policy change. Isolation between
  organizations is the isolation that already existed between agencies, proven
  by `scripts/test-isolation.sh`.
- Counting across organizations means one `withAgency` call each. A query
  spanning several would need the policy relaxed, which is exactly the trade
  not worth making — see `listOrganizations`.
- Billing is per organization, because `agencies.plan` always was. A person with
  three organizations has three subscriptions. That is the honest model, and it
  is also the one Stripe already implements here.
- The word "agency" survives in the schema and the code; "organization" is the
  word on screen. Renaming thirteen tables to match a label would be a large
  diff with no behavioural change, and every RLS policy references `agency_id`.

## The failure mode this exists to prevent

Row-level security enforces the tenant it is **given**. It has no way to know
whether the caller was entitled to give it that one. So a trusted cookie would
be a complete tenant break with RLS working perfectly — the policies would do
their job on data the caller should never have been scoped to.

This is the same shape as the five bugs recorded in the connector, inbound and
billing work: a tenant decided from something the caller controls, without
checking it against the table that owns that decision.

`scripts/test-organizations.ts` asserts it directly. With a valid session and a
cookie naming an organization the user was never a member of:

- the page does not switch to it,
- none of its data renders,
- the user's own organization is shown instead.

Seventeen checks; the four above are the ones that matter.

## Rejected

**A staff console that can read every tenant.** The prototype's Super Admin
screen described itself as bypassing all workspace permissions. It stays out:
the app connects to Postgres as a non-superuser precisely so that no page can
reach another tenant, and a bypass would make the ten isolation checks
meaningless. Cross-tenant support tooling, if it is ever needed, is a separate
application with its own login and its own database role.

**Sharing anything between organizations.** Clients, contacts, connector keys
and billing are per organization with no exceptions. A "shared template across
your organizations" feature is the kind of thing that quietly reintroduces
cross-tenant reads, and there is no demand for it yet.

**Exception (ADR-008):** published **marketplace listing snapshots** may be
read by any authenticated organization. Live tenant tables stay isolated;
install copies into the buyer’s own `agency_id`.
