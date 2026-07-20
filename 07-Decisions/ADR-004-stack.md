# ADR-004 — Technology stack

**Status:** Accepted · 2026-07-20

## Context

The specifications are deliberately technology-neutral: across ~303,000 words,
React appears 8 times, PostgreSQL once, TypeScript once. Every layer defers the
choice to the next layer, and no layer makes it. Nothing can be built until it is
made.

Selection criteria, in order, for a solo founder writing code with AI assistance:

1. **Density of AI training data** — the model writes better code in popular
   stacks. This outweighs most technical preferences.
2. **Fewest moving parts** — every additional service is an outage and a bill.
3. **Buy rather than build** anything that is not the product.

## Decision

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js (App Router) + TypeScript** | One framework for UI and API; the densest AI training coverage of any web stack |
| Database | **PostgreSQL + pgvector** | Relational data and RAG embeddings in one database — no separate vector store |
| ORM | **Drizzle** | Schema in TypeScript, migrations are readable SQL |
| Isolation | **Postgres row-level security on `agency_id`** | ADR-002. Enforced by the database, not by remembering a `WHERE` clause |
| Auth | **Bought, not built** (Clerk / Supabase Auth / Better Auth) | See below |
| Billing | **Stripe** | Never build billing |
| Hosting | **Vercel + managed Postgres (Neon or Supabase)** | No servers to operate |
| Realtime | Postgres LISTEN/NOTIFY or the host's realtime channel | Avoid adding a third-party socket service in v1 |
| Connector | **Thin WordPress plugin (PHP)** | Registers the site, injects the widget, posts submissions. No business logic — per `00-Foundation/PRODUCT_RULES.md:28` |

### Auth is bought — this is the most important line in this ADR

`02-Platform/Authentication/` contains fifteen files specifying password policy,
MFA, session management, device management, and API authentication. Implementing
that specification is roughly three months of solo work, and it is work that
produces zero product differentiation while carrying the highest security risk in
the system. **Buy it.** The same logic retires most of `02-Platform/` from the
build list.

### AI models

| Use | Model | Notes |
|---|---|---|
| Visitor-facing chat | `claude-sonnet-5` | $3/$15 per MTok, currently $2/$10 introductory through 2026-08-31 |
| Heavier reasoning (summaries, lead scoring) | `claude-opus-4-8` | $5/$25 per MTok |
| Cheap classification | `claude-haiku-4-5` | $1/$5 per MTok |

**Prompt caching is mandatory, not an optimisation.** Each site's system prompt
and retrieved content is cached; cache reads bill at roughly 0.1× the base input
rate. On a per-visitor-message product this is the difference between a viable
free tier and an unpayable bill. Implement it in the first AI commit, not later.

**Open:** the embedding model for RAG is not yet chosen — Anthropic does not
publish one. This is ADR-005 and blocks the AI chat feature only, not the rest of
the MVP.

## Consequences

- Everything runs on managed services. The monthly floor before revenue is low
  but non-zero (hosting + database + auth + AI).
- Choosing Next.js couples UI and API. If a mobile app is ever built, the API
  must be extracted first — acceptable, since mobile is explicitly out of scope
  (ADR-003).
- pgvector is adequate to roughly a million chunks. Beyond that, revisit. That
  ceiling is far past product-market fit.
- Buying auth means an external dependency in the login path. Accepted.
