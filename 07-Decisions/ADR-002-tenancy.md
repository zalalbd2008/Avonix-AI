# ADR-002 — Tenancy model and hierarchy

**Status:** Accepted · 2026-07-20 · Supersedes all prior hierarchy language

## Context

Four incompatible hierarchies existed across the repository:

| Source | Shape |
|---|---|
| `00-Foundation/GLOSSARY.md:43` | Workspace groups Websites (Workspace above Website) |
| `00-Foundation/03-CORE_CONCEPTS.md:121` | Workspace is the environment for one Website (below, 1:1) |
| `02-Platform/01-TENANT_MODEL.md` | Platform → Tenant → Organization → Workspace |
| `02-Platform/Organizations/*`, `Teams/FAQ`, `Permissions/FAQ` | Organization **is** the tenant |
| `prototype/` navigation | Organization → Client → Website |
| `prototype/` onboarding step 3 | Organization → Workspace → Website |

GoHighLevel resolves this cleanly: **Agency** at the top, one **Sub-Account**
(also called a Location) per client business. There is no third container.

## Decision

```
Agency          ← the tenant. One paying customer. Owns billing and branding.
  └── Client    ← one client business. GoHighLevel's "sub-account".
        └── Website   ← a WordPress site belonging to that client. A lead source.
```

**Rules:**

1. **Agency is the tenant boundary.** Every table carries `agency_id`. Isolation
   is enforced by Postgres row-level security, not by application code.
2. **`Tenant` as a separate entity is deleted.** `02-Platform/01-TENANT_MODEL.md`
   is wrong. Agency = tenant.
3. **`Workspace` is deleted as an entity.** It was the same thing as Client under
   a second name, and it is the direct cause of three of the four contradictions
   above. The word may survive as UI copy ("Client Workspace") but never as a
   table, an id, or an API path.
4. **Contacts, leads, conversations and pipelines belong to the Client, not the
   Website.** A client with three sites has one CRM. Website is recorded as the
   *source* of a contact, nothing more.
5. **A Website belongs to exactly one Client. A Client belongs to exactly one
   Agency.** No sharing, no cross-links, in v1.

## Consequences

- Data isolation is one enforced rule (`agency_id` + RLS) rather than a
  four-level nesting problem. This is the single most important decision for
  security and it is now simple.
- White-label (ADR-003) attaches to Agency: custom domain, logo, colours, sender
  identity. This is why Agency must be the tenant.
- ~50 files across `00-Foundation/`, `01-Product/` and `02-Platform/` contain
  stale Workspace/Tenant language. They are now **superseded by this ADR**; they
  are not authoritative and will be corrected lazily, when touched.
- Point 4 is a real constraint: reporting "leads per website" requires the source
  field, and merging duplicate contacts across a client's sites is expected
  behaviour, not a bug.
