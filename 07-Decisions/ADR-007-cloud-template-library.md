# ADR-007 — Cloud Form Template Library (Organization Asset Management)

**Status:** Accepted · 2026-07-21  
**Depends on:** ADR-002 (tenancy), ADR-006 (organizations = agencies)

## Context

The product needs a Cloud Template Library so agencies can save forms as reusable
templates, share them inside one organization, version them, and later grow into
components, assets, and a marketplace. Today “Save as template” writes only to
browser `localStorage`, and `/templates` is a NotBuilt stub.

The full PRD (destinations, RBAC matrix, approval workflow, sync, marketplace)
is too large for one release. This ADR locks the **tenant-safe foundation** and
a phased roadmap.

## Decision

1. **Templates live in `form_templates`, scoped by `agency_id`.** Organization
   Cloud Library = that agency’s rows. No cross-org reads (ADR-006).
2. **Payload shape matches live forms** (`fields` + `settings` jsonb) so the
   builder can apply a template without a second serializer.
3. **Save destinations** map to `scope` + `status` + optional `website_id` /
   `client_id`, not separate tables:
   - This Website → `scope=website`
   - Organization Library → `scope=organization`
   - Personal → `scope=personal` (creator-only list filter)
   - Global (org official) → `scope=global` (owner/admin; still same `agency_id`)
   - Team → `scope=team` (`team_id` reserved)
   - Draft → `status=draft`
4. **Platform Marketplace** is Level 3. Live cross-tenant reads of
   `form_templates` stay forbidden. Published **listing snapshots** are the
   narrow exception — see **ADR-008**.
5. **Fine-grained custom roles** stay soft until membership RBAC ships; v1 gates
   use `memberships.role` (`owner` | `admin` | `member`).

## Phased roadmap

| Step | Ship |
|------|------|
| **1** | Schema + RLS, save destinations dialog, org library UI, use/duplicate |
| **2** | Version history UI — compare / restore / duplicate version / publish |
| **3** | Categories/tags search, favorites, collections, responsive preview |
| **4** | Share to team/user, lock/approval workflow |
| **5** | Components/sections/assets tables |
| **6** | Import/export ZIP, sync helpers |
| **7 (this)** | Marketplace listings + install (ADR-008) |

## Consequences

- `/templates` becomes a real org library (nav → v1).
- localStorage templates remain as a fallback “browser-only” list until migrated
  once; new saves go to the cloud table.
- `client_id` on live `forms` stays required; templates do **not** reuse the
  forms table with a null client.
- `/marketplace` browses published snapshots; install copies into the active
  organization (ADR-008).
