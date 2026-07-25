# ADR-010 — Enterprise Visual Popup Experience Builder

**Status:** Accepted · 2026-07-22 (amended)  
**Depends on:** ADR-002 (RLS), ADR-006 (organizations), ADR-007 (forms), ADR-009 (CTA → open_popup)

## Context

Product need is not a thin “modal with a headline.” It is a **Visual Popup
Experience Builder** (GoHighLevel-class and beyond): library of experiences,
tabbed editor, drag-ready component model, native Form Builder integration,
rule/trigger/frequency/priority engine, design system, analytics, automation,
and later AI smart rules.

## Decision

1. **Cloud-owned config** (`popups` + jsonb `payload`). WP connector remains a
   thin evaluator/injector. No business rules hard-coded in the plugin.
2. **Tenant = `agency_id`**, website-scoped.
3. **Two product surfaces**
   - **Popup Library** — searchable cards (name, slug, category, layout, status,
     priority, rule summary, schedule, device, analytics stubs, clone/export…).
   - **Popup Editor** — tabbed Visual Experience Builder:
     General · Content · Design · Components · Animation · Triggers ·
     Conditions · Behavior · Targeting · Frequency · Automation · Analytics ·
     Advanced.
4. **Native Form Integration (non-negotiable)**  
   Popups do **not** invent a second form builder. They **select / preview /
   replace / deep-link** forms from Form Builder. Multiple forms per popup
   (steps/conditions) allowed in payload. Submit outcomes (close, thank-you
   popup, redirect, automation) live in `payload.behavior.onSubmit`.
5. **Separation of concerns**
   - `type` / `category` = purpose taxonomy (welcome, exit, coupon…).
   - `design.layout` = chrome (modal, drawer, bottom bar, bubble…).
   - `triggers` + `audience` + `frequency` + `priority` + `conflicts` +
     `schedule` = when/who/how often.
   - `content` + `components[]` + `buttons[]` = canvas.
6. **One live popup at a time** (highest priority). Optional queue later.
7. **Phased delivery**

| Phase | Ship |
|------|------|
| **P1** | Schema, typed create, page rules, basic triggers, connector modal |
| **P2 (this amend)** | Library cards + tabbed editor + **existing form picker** + design/layout/behavior/frequency tabs + clone |
| **P3** | Component canvas (DnD), multi-form steps, A/B, schedule UI, analytics events |
| **P4** | Automation graph, AI smart rules, export/import, version history |

## Consequences

- Nav **Popup Studio** is `v1`.
- CTA `open_popup` binds to `popups.id`; forms remain embeddable inside popups.
- ADR-007 Form Builder stays the source of truth for fields/submissions.

## Rejected

**Building a separate form system inside Popup.** Forms are selected from the
existing Form Builder only.
