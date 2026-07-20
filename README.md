# Avonix AI — Agency CRM & Lead Operations

> One dashboard for every client's leads.

A GoHighLevel alternative built for agencies that work in WordPress. An agency
creates a client, installs the Avonix connector on that client's site, and every
form submission and AI chat conversation lands in one CRM pipeline — across every
client, from one dashboard.

**Not** a website builder, a host, a registrar, a WordPress replacement, or a
site-monitoring tool.

---

## What is actually here

| Path | What it is | Trust it? |
|---|---|---|
| `07-Decisions/` | The four ADRs above | **Yes — authoritative.** |
| `prototype/` | Clickable UI prototype | Screens and layout yes. Its name ("Nexus") and its monitoring features are superseded. |
| `00-Foundation/` | Domain model, entity lifecycles, event philosophy, ownership matrix | Mostly — see caveats below |
| `01-Product/` | Personas, roles, permission model, module catalog, pricing shape | Permission model yes; pricing/limits are empty |
| `02-Platform/` | 15 module specs (auth, orgs, teams, files, …) with real events + error codes | As a *template*, yes. As a build list, no — it is far more than one person can build. |
| `03-Engineering/` `04-Design/` `05-Business/` `06-AI/` | Generated 2026-07-19; ~20% substantive | Skim only |
| `archive/` | 139 files of generic enterprise-architecture boilerplate that never name the product | No. Kept for reference only. |

---

## The core loop

```
Agency signs up
  → creates a Client
    → installs the Avonix connector on that client's WordPress site
      → forms and an AI chat widget capture visitors
        → contacts land in that Client's inbox and pipeline
          → agency works them from one dashboard across all clients
```

Everything GoHighLevel sells is bolted around this loop. The loop is the product;
see [ADR-003](07-Decisions/ADR-003-mvp-scope.md) for what is deliberately absent.

---

## Decisions made — read these first

| ADR | Decision |
|---|---|
| [001](07-Decisions/ADR-001-positioning.md) | Name is **Avonix AI**. Category is a **GoHighLevel alternative for WordPress agencies**. Site monitoring is out of scope. |
| [002](07-Decisions/ADR-002-tenancy.md) | `Agency → Client → Website`. Agency is the tenant. **`Workspace` and `Tenant` are deleted as entities.** |
| [003](07-Decisions/ADR-003-mvp-scope.md) | MVP is the loop: capture → inbox → pipeline. No funnels, email, SMS, calendars, automation, or RBAC in v1. |
| [004](07-Decisions/ADR-004-stack.md) | Next.js + TypeScript + Postgres/pgvector + Drizzle. **Auth and billing are bought, not built.** |
| [005](07-Decisions/ADR-005-embeddings.md) | **voyage-4-lite** at 1024 dimensions for retrieval; without a key it degrades to Postgres full-text rather than failing. |

These ADRs supersede any conflicting statement in the specification folders. Where
a spec file disagrees, the ADR wins.

---

## Status

The MVP in [ADR-003](07-Decisions/ADR-003-mvp-scope.md) is built. `apps/web` is a
Next.js app; `apps/wp-connector` is the WordPress plugin.

    npm run db:setup     # migrate, apply RLS, verify isolation, seed
    npm run dev
    npm run test:all     # 151 checks across eight suites

**Working end to end:** agency sign-up and onboarding · client and website
management · WordPress connector with hashed keys · form capture with contact
dedupe · unified inbox, two-way by email · pipeline · Stripe subscriptions ·
AI chat answering from the site's own content.

**Not built, and not pretended otherwise:** teams and roles (one Owner per
agency), white-label, funnels, SMS, calendars, and the automation builder — all
deferred by ADR-003. `BACKLOG.md` triages the rest.

Third-party keys are optional in development and every one of them degrades
honestly rather than silently: no email sender writes to `.mail/`, no embedding
key falls back to full-text search, no Stripe key disables upgrading and says so
on the billing page, no model key returns a clean 503 instead of a fake answer.
