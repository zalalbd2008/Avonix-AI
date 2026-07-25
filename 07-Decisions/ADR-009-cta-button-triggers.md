# ADR-009 — Context-Aware CTA Button Trigger Engine

**Status:** Accepted · 2026-07-22  
**Depends on:** ADR-002 (RLS), ADR-006 (organizations)

## Context

Website nav had a `Buttons` stub and the connector already records class-based
`button` events. Product need is not a handful of Call/WhatsApp FABs — it is a
**rule-based, context-aware CTA engine**: presets + custom buttons, page
targeting, display conditions, mobile/tablet fixed footer, desktop float, and
analytics.

## Decision

1. **Config lives in the cloud** (`cta_button_groups`, `cta_buttons`). The WP
   connector is a thin injector: fetch published config, render, report clicks.
2. **Preset Library + Custom Button Builder** — no fixed “button set”. Presets
   are code (and later DB templates); custom buttons are free-form.
3. **Tenant = `agency_id`**. Rows are website-scoped via `website_id` (and
   `client_id`). No cross-org reads.
4. **Rules are jsonb** on groups (page include/exclude, placement, priority,
   frequency) and buttons (action, style, device/conditions, schedule) so the
   engine can grow without a migration per rule type.
5. **Clicks reuse** `/api/v1/connector/events` (`type: button`) with button id /
   label in the payload.
6. **Popup module stays separate** (v2 stub). Opening a popup/form/chat is an
   *action* a CTA can fire, not the same product surface.

## Consequences

- `/websites/[id]/buttons` becomes a real product surface (nav `v1`).
- Connector gains `Avonix_Cta` + `GET /api/v1/connector/cta`.
- Advanced personalization, A/B, icon-pack CDN, and AI-recommended CTAs can
  layer on the same tables later.

## Rejected

**Hard-coding three footer buttons in the plugin.** Business rules must stay
server-side (PRODUCT_RULES).
