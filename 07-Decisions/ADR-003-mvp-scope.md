# ADR-003 — MVP scope

**Status:** Accepted · 2026-07-20

## Context

GoHighLevel ships: CRM, pipelines, funnel builder, website builder, forms,
surveys, calendars and booking, email marketing, SMS, call tracking, reputation
management, memberships and courses, workflow automation, reporting, payments,
white-label, a mobile app, and a template marketplace.

That is the output of a company with hundreds of engineers. **One person with AI
assistance will build perhaps five percent of it in the first year.** Any plan
that does not start from that sentence produces nothing shippable.

So the question is not "how do we clone GoHighLevel". It is: *what is the
smallest thing an agency will pay for, that grows into GoHighLevel?*

GoHighLevel's core loop is **capture → organise → work → convert**. Everything
else (funnels, courses, reputation) is surface area bolted around that loop. The
loop is the product.

## Decision

**The MVP is the loop, and nothing else:**

```
Agency signs up
  → creates a Client
    → installs the Avonix connector on that client's WordPress site
      → forms and an AI chat widget capture visitors
        → contacts land in that Client's inbox and pipeline
          → agency works them from one dashboard across all clients
```

### In scope for v1

| Area | What ships |
|---|---|
| Tenancy | Agency → Client → Website per ADR-002, with RLS isolation |
| Auth | Email/password + invite. Agency Owner role only — no RBAC matrix |
| WP connector | Plugin: registers site, injects form + chat widget, posts submissions |
| Contacts | Contact record per Client, with source attribution and dedupe |
| Inbox | One unified conversation view per Client; chat + form submissions |
| Pipeline | Drag-and-drop stages, one pipeline per Client, manual stage moves |
| AI chat | Widget answers from the site's own content (RAG), captures the lead |
| Agency dashboard | Every client's lead counts and unworked conversations |
| Billing | Stripe subscription for the agency |

### Explicitly NOT in v1

Funnel builder · website builder · email marketing · SMS/Twilio · calendars and
booking · courses and memberships · reputation management · call tracking ·
workflow automation builder · reporting builder · marketplace · mobile app ·
white-label · client logins · teams, roles and permissions · website monitoring,
uptime, SSL, backups (see ADR-001).

**White-label and client logins are v2, not v1** — but ADR-002 puts branding on
Agency specifically so that v2 is an additive change, not a migration.

### The three-level pricing model is retained

From the prototype, adapted to this category:

| Level | Tier | Gate |
|---|---|---|
| 1 | Free | 1 client, 1 website, capped AI messages |
| 2 | Pro | Unlimited clients and websites, full AI |
| 3 | Agency/SaaS | White-label, client logins, resale — **v2** |

Prices are deliberately not set here. Set them after ten paying customers, not
before. GoHighLevel's floor is $97; entering well below it is the wedge.

## Consequences

- **Automation is absent from v1 and that is a real gap** against GoHighLevel.
  Accepted: a lead sitting in a pipeline is still worth paying for; a workflow
  engine with nothing to trigger on is not.
- The agency-wide dashboard is the differentiator from a plain WordPress form
  plugin, so it must exist in v1 even though it is the least "featureful" screen.
- Skipping RBAC in v1 is a deliberate trap avoided: `02-Platform/Permissions/`
  specifies RBAC + ABAC + policies. Building that before there is a second user
  type is months of work protecting nothing.
- AI cost is metered per agency from day one, or the free tier becomes a bill.
