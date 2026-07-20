# Backlog — the master checklist, triaged

The founder's Master Product Checklist contains ~190 items. This file triages
every one against [the ADRs](07-Decisions/). It is the build order.

| Mark | Meaning |
|---|---|
| **V1** | In the MVP. ~32 items. |
| **V2** | Real, deferred. Will happen after paying customers exist. |
| **DEAD** | Removed by an ADR. Do not build. |
| **TRAP** | Looks like one checkbox. Is one to three months of solo work. Deferred with a guard on it. |
| **BUY** | Solved by a paid service. Writing this yourself is the mistake. |

A checkbox is not a unit of work. "Workflow Builder" and "Brand Colors" are both
one line here and differ by a factor of about two hundred in effort.

---

## 1. Product Vision — mostly already decided

| Item | | Note |
|---|---|---|
| Product Name | **DONE** | Avonix AI — ADR-001 |
| Target Users | **DONE** | WordPress-building agencies — ADR-001 |
| USP | **DONE** | WordPress-native · affordable at the small end · AI-first — ADR-001 |
| Out of Scope | **DONE** | ADR-001, ADR-003 |
| Vision / Mission / Long-term Goal | V1 | Already written in `00-Foundation/`. Needs a one-hour edit for the GoHighLevel direction, not a rewrite. |
| Competitor Analysis | V1 | One page, five competitors, honest. Not a report. |
| Product Philosophy / Product Rules | **DONE** | `00-Foundation/PRODUCT_RULES.md` is still valid |

---

## 2. Platform Architecture

| Item | | Note |
|---|---|---|
| Multi-Tenant Architecture | **V1** | `agency_id` + Postgres RLS — ADR-002 |
| Organization System | **V1** | Renamed **Agency** — ADR-002 |
| **Workspace System** | **DEAD** | ADR-002 deleted it. It was Client under a second name and caused three of the four hierarchy contradictions. |
| Website System | **V1** | A lead source belonging to a Client |
| Team Management | V2 | No second user type exists in v1 |
| User Roles | V2 | Agency Owner only in v1 |
| **Permissions** | **TRAP** | `02-Platform/Permissions/` specifies RBAC + ABAC + policies. Months of work protecting a single-user product. |
| Activity Logs | V2 | |
| Audit System | V2 | |
| Notifications | V1 (thin) | Email on new lead. Nothing else. |
| Global Search | V2 | |
| Feature Flags | V2 | A boolean column until there is a reason for more |

---

## 3. Dashboard

| Item | | Note |
|---|---|---|
| Overview Dashboard | **V1** | Every client's lead counts and unworked conversations. This is the differentiator from a plain form plugin — it must exist in v1. |
| **Website Health** | **DEAD** | ADR-001 — different product |
| Recent Activity | V1 (thin) | A list, not a system |
| Quick Actions · AI Insights · Analytics Snapshot · Tasks · Recommendations | V2 | |

---

## 4. Modules — the section that decides whether this ships

### Forms
| Item | | Note |
|---|---|---|
| Form Builder | **V1 — narrow** | Field list + labels. **Not** a drag-and-drop canvas. That is a TRAP disguised as a checkbox. |
| Spam Protection | **V1** | Honeypot + rate limit. Required, not optional. |
| Multi-Step · Conditional Logic · File Upload · Analytics · AI Suggestions | V2 | |

### Popups · Buttons
| Item | | Note |
|---|---|---|
| All 9 items | V2 | The prototype has screens for these. Screens are not the product. |
| A/B Testing | **TRAP** | Needs statistics, traffic splitting, and significance. Not before real traffic exists. |

### Accessibility
| Item | | Note |
|---|---|---|
| All 9 items | **DEAD** | This is the accessiBe / UserWay category — a separate company, separate buyer, separate compliance liability. It has no relationship to an agency CRM. Ship the CRM first; revisit only as a deliberate second product. |

### AI
| Item | | Note |
|---|---|---|
| AI Chat | **V1** | RAG over the client site's content, captures the lead |
| AI Assistant · AI Content · AI Automation · AI Insights · AI Recommendations | V2 | |

### Automation
| Item | | Note |
|---|---|---|
| Workflow Builder · Triggers · Conditions · Actions · Delays · Logs | **TRAP — V2** | ADR-003 defers this deliberately. A visual workflow engine is the single largest item on the whole checklist, and in v1 there is nothing to trigger on. This is the biggest gap against GoHighLevel and it is an accepted one. |

### Email
| Item | | Note |
|---|---|---|
| SMTP · Notifications | **V1** | Transactional only — "you have a new lead" |
| Templates | V2 | |
| **Campaigns** | **TRAP — V2** | This is email marketing: sending infrastructure, deliverability, bounce handling, unsubscribes, CAN-SPAM. A product in itself. |

### Analytics · Languages
| Item | | Note |
|---|---|---|
| All 8 items | V2 | RTL and auto-translation are each multi-week; neither sells the first subscription |

---

## 5. AI System

| Item | | Note |
|---|---|---|
| AI Providers | **V1 — one** | Anthropic only (ADR-004). Multi-provider abstraction before a second provider is speculative work. |
| AI Context · AI Knowledge Base | **V1** | This is the RAG pipeline |
| **AI Usage Tracking** | **V1 — mandatory** | Per-agency metering. Without it the free tier becomes an unpayable bill. |
| Prompt Library · AI Memory · AI Rules · AI Safety Rules | V2 | |

---

## 6. Design System

| Item | | Note |
|---|---|---|
| All 12 items | **V1 — BUY** | Use **shadcn/ui + Tailwind** and adopt its tokens. Building a component library, a modal, a drawer, and a table from scratch is roughly six weeks that produces zero customer value. Pick brand colours and a typeface; take the rest. |

---

## 7. UX

| Item | | Note |
|---|---|---|
| Navigation · Sidebar · Header · Breadcrumb | **V1** | The prototype already specifies these — use it as the spec |
| Empty · Loading · Error · Success states | **V1** | Cheap with a component library, and they are most of perceived quality |
| Onboarding | **V1** | The prototype's 6-step flow, minus the Workspace step (ADR-002) |
| Tooltips | V2 | |

---

## 8. Database

| Item | | Note |
|---|---|---|
| Design · Tables · Relationships · Indexing | **V1** | Next concrete deliverable |
| Backups · Data Retention | **V1 — BUY** | Managed Postgres does this |

---

## 9. API

| Item | | Note |
|---|---|---|
| Rate Limits | **V1** | The public widget endpoint is internet-facing and AI-backed. Unmetered, it is a bill waiting to happen. |
| Authentication | **BUY** | ADR-004 |
| REST API · API Keys · Webhooks · Documentation | V2 | The connector talks to internal routes in v1; a public API is a v2 commitment |

---

## 10. Security

| Item | | Note |
|---|---|---|
| Login Security · 2FA · Session Management | **BUY** | ADR-004. `02-Platform/Authentication/` is 15 files specifying roughly three months of the highest-risk, lowest-differentiation work in the system. |
| Encryption · Secrets Management | **V1** | TLS + managed Postgres encryption + host env vars. Not a project. |
| Audit Logs | V2 | |

---

## 11. Developer

| Item | | Note |
|---|---|---|
| Folder Structure · Naming Rules | **V1 — one page** | |
| Testing Strategy | **V1 — narrow** | Tests on tenancy isolation and billing. Nothing else in v1. |
| CI/CD · Deployment Guide | **V1 — BUY** | Vercel git-push deploy is the CI/CD |
| Coding Standards | V1 (thin) | ESLint + Prettier defaults |

---

## 12. Business

| Item | | Note |
|---|---|---|
| Subscription · Billing · Invoices · Coupons | **V1 — BUY** | Stripe. All four are one integration. |
| Trial System | **V1** | |
| Pricing Plans | **V1 — but set late** | ADR-003: decide after ten paying customers. GoHighLevel's floor is $97; entering well below it is the wedge. |
| Affiliate System | V2 | |

---

## 13–14. Marketing & Support

| Item | | Note |
|---|---|---|
| Landing Page | **V1** | |
| Documentation · Blog · SEO · Videos · Demo | V2 | |
| Help Center · Knowledge Base · Ticket System · Live Chat · Community | V2 | Answer support email personally until it hurts. That is a feature, not a shortcut — early support email is the best product research available. |

---

## 15. Future — correctly labelled

Marketplace · Extension System · SDK · Public API · Mobile App · Desktop App —
all V2+. Nothing here before revenue.

---

## 16. Technology Stack — settled, with corrections

ADR-004 decides this. Three items in the checklist now conflict with it:

| Checklist says | Decision | Why |
|---|---|---|
| Laravel **/** Node.js | **Next.js + TypeScript** | One framework for UI and API; densest AI training coverage |
| PostgreSQL **/** MySQL | **PostgreSQL** | pgvector puts RAG in the same database — no separate vector store |
| Docker · VPS · CDN · Monitoring · Backup | **Managed hosting** | A solo founder operating servers is a solo founder not writing product |
| Redis Cache | V2 | Postgres is sufficient at v1 scale |
| OpenAI · Google · Local LLM | **Anthropic only** | One provider until there is a measured reason for a second |

Frontend (React, Next.js, TypeScript, Tailwind, component library) — all **V1**,
all settled.

---

## 17. Documentation

**V2, and deliberately so.** Seventeen documentation deliverables written before
the code is precisely how this repository reached 393 files, ~303,000 words, and
zero lines of application code.

**The rule from here: no new document unless there is code beside it.**
Document a module when it is built, using the `02-Platform/<Module>/` template —
which is genuinely good and is the one thing worth keeping from the original set.

---

## Summary

| | Items |
|---|---|
| Already decided by an ADR | ~12 |
| **V1** | **~32** |
| BUY rather than build | ~14 |
| V2 | ~110 |
| DEAD | ~19 |
| TRAP (deferred with a guard) | ~5 |

**About 17% of the checklist is in v1.** That is not pessimism — it is what
makes v1 reachable. GoHighLevel's full surface is the output of hundreds of
engineers; the checklist above is roughly that surface. The way to build it is
one loop at a time, with customers paying between the loops.
