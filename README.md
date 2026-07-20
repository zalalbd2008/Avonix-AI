# Nexus — Website Operations Platform

> Run every website from one platform.

A cloud SaaS for agencies, WordPress developers, and website owners who manage
more than one site. A lightweight WordPress connector plugin reports in; all
health checks, monitoring, leads, automation, and AI run in the cloud.

**Not** a website builder, a host, a registrar, or a WordPress replacement.

---

## Naming — unresolved

This repository was written as **"Avonix AI"**. The UI prototype says **"Nexus"**.
Pick one before writing code — it lands in the package name, the plugin slug, the
domain, and every table prefix. Tracked as `07-Decisions/ADR-000`.

---

## What is actually here

| Path | What it is | Trust it? |
|---|---|---|
| `prototype/` | Clickable UI prototype (`Nexus Platform.dc.html`) | **Yes — the most decision-dense artifact in the repo.** It names screens, tiers, prices, and the integration-level model. |
| `00-Foundation/` | Domain model, entity lifecycles, event philosophy, ownership matrix | Mostly — see caveats below |
| `01-Product/` | Personas, roles, permission model, module catalog, pricing shape | Permission model yes; pricing/limits are empty |
| `02-Platform/` | 15 module specs (auth, orgs, teams, files, …) with real events + error codes | As a *template*, yes. As a build list, no — it is far more than one person can build. |
| `03-Engineering/` `04-Design/` `05-Business/` `06-AI/` | Generated 2026-07-19; ~20% substantive | Skim only |
| `07-Decisions/` | ADRs — currently empty placeholders | To be written |
| `archive/` | 139 files of generic enterprise-architecture boilerplate that never name the product | No. Kept for reference only. |

---

## The product model (from the prototype)

Three integration levels, which double as the pricing tiers:

| Level | Tier | Requires | Examples |
|---|---|---|---|
| **1 — Zero Dependency** | Free | Nothing external | Health score, SSL monitor, uptime, update centre, backup monitor, audit log, error log, broken links, DB cleaner, cron monitor, SMTP test |
| **2 — Optional Integrations** | Pro $19/mo | Your own API key | Telegram, Slack, Discord, Teams, Google Drive, Dropbox, OneDrive, S3 |
| **3 — Enterprise Cloud** | Custom | Nexus cloud + AI | AI chat & analysis, WhatsApp Business, Search Console, PageSpeed, multi-site dashboard, malware intelligence |

Level 1 costs nothing to run per customer, which is what makes a free tier and
WordPress.org distribution possible. **Build Level 1 first.**

---

## Known contradictions — resolve before coding

1. **Product name** — Avonix AI vs Nexus (above).
2. **Hierarchy** — the prototype's navigation says `Organization → Client → Website`;
   its onboarding wizard says `Organization → Workspace → Website`. "Client" and
   "Workspace" appear to be the same entity under two names. The written specs add a
   third, incompatible reading. Pick one shape and delete the other words.
3. **Tenant boundary** — `02-Platform/01-TENANT_MODEL.md` puts Tenant above
   Organization; four module docs say Organization *is* the tenant. Getting this
   wrong scopes data isolation one level too low, which is a security bug.

---

## Status

Zero lines of application code. The specifications describe the *shape* of
decisions without making them: across ~303,000 words there are no API endpoints,
no schemas, no thresholds, and no technology choices. Treat the prototype and the
six documents listed in `07-Decisions/` as the real starting point.
