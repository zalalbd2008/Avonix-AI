# ADR-011 — Enterprise Conversational Experience Platform (CEP)

**Status:** Accepted · P1 complete · 2026-07-23  
**Product name (working):** Avonix Conversational Experience Platform  
**Depends on:** ADR-002 (tenancy), ADR-003 (MVP AI chat baseline), ADR-004 (stack), ADR-005 (RAG), ADR-006 (orgs), ADR-007 (forms), ADR-009 (CTA), ADR-010 (popup)  
**Supersedes:** Thin “Live Chat / AI Chat widget only” framing. V1 RAG bubble becomes **Module: AI Conversation** under this platform.

## Context

The product is **not** a generic live-chat gadget. It is an **Enterprise Conversational Experience Platform** where the following operate as one system:

**AI Chatbot + Human Live Agent + CRM + Lead Capture + Appointment + Automation + Analytics + Embeddable Widgets**

Competitive synthesis (best-of): GoHighLevel · Intercom · Crisp · Tidio · Zendesk · LiveChat · Drift — delivered as a **modular**, headless, API-first Avonix module set. Usable as **SaaS cloud** and **WordPress-connected** (thin connector; cloud owns logic).

Existing Avonix assets to reuse (not rebuild):

| Asset | Role in CEP |
|-------|-------------|
| Form Builder (ADR-007) | Lead forms, OTP, multi-step, appointment fields |
| Popup engine (ADR-010) | Trigger/audience/frequency patterns; conflict with chat |
| CTA (ADR-009) | `open_chat` / bubble actions |
| RAG + embeddings (ADR-005) | Knowledge for AI |
| Conversations / messages / inbox | Thread backbone |
| Connector | Inject bubble, wizard, shortcodes; proxy APIs |

## Decision

1. **One platform, many modules** — enable/disable per agency / website / plan.  
2. **Cloud-owned runtime** — WP/React/Vue/Webflow embeds are delivery surfaces only.  
3. **Typed Conversation Engine** — every UI unit is a renderable block (text → carousel → form → calendar…).  
4. **AI provider–agnostic** — **default = OpenRouter**; all other providers as plug-in adapters.  
5. **Human Live Agent workspace** is first-class (queue, departments, transfer, whisper, supervisor).  
6. **100% liquid responsive** for bubble, panel, and every embed mode (container queries + fluid type).  
7. **White-label ready** — branding, domain, theme, agent identity, email.  
8. **Phased shipping** — architecture accepts the full surface; releases unlock modules without redesign.

---

## Design principles

| Principle | Meaning |
|-----------|---------|
| Headless & API-first | REST (+ GraphQL later); webhooks; JWT/API keys |
| Module enable/disable | Feature flags + plan entitlements |
| Zero-code configuration | Studios + Chat Wizard Builder |
| DnD conversation builder | Decision / AI / Human branches |
| AI-agnostic | OpenRouter default; plug-in providers |
| Enterprise agent workspace | Queue, skills, supervisor, audit |
| Embed anywhere | WP, Elementor, Divi, Bricks, Webflow, React, Vue, Angular, HTML, Shadow DOM |
| Liquid responsive | Mobile / tablet / desktop / foldable / fullscreen / inline |
| Performance | Lazy load, code-split, streaming replies |
| White label | Full chrome & identity control |

---

## Architecture (all-in-one)

```
Visitor
   │
Chat Bubble / Embed Surface
   │
Trigger Engine
   │
Conversation Engine  ──►  Response Renderer
   │                              │
   ├─ AI Router (OpenRouter+)     ├─ Lead Form (ADR-007)
   └─ Human Queue / Agents        ├─ Appointment
                                  ├─ Product Carousel
                                  ├─ Buttons / Cards / Media
                                  ├─ Website Data Widget
                                  └─ Automation hooks
   │
CRM Storage ◄── Analytics / Reports ◄── Workflow Engine ◄── API / KB
```

**Transport:** visitor ↔ cloud via connector proxy; realtime = SSE first, WebSocket for agent console.  
**Security:** provider keys never in browser; signed visitor session; RLS on `agency_id`.

---

## Module catalog (§1–§25)

Each section below is a **module or sub-module**. Status: `Core` = required for CEP identity; `Standard` = GA target; `Advanced` = enterprise / later phase.

### §1 Chat Bubble (Launcher) — Core

Fully customizable launcher.

**Appearance:** shape (circle, rounded square, custom SVG, image, GIF, Lottie) · position (BR/BL + custom offset) · size (mobile / tablet / desktop) · floating animation (pulse, bounce, glow, rotate, ripple) · notification badge · online indicator · unread counter · tooltip · greeting bubble · close · hide on scroll · sticky · auto-hide · z-index.

### §2 Bubble Trigger — Core

Aligned with popup targeting (ADR-010) + chat-specific:

Time delay · exit intent · scroll % · scroll to section · click / CTA · URL match · landing only · returning / first / new visitor · mobile / tablet / desktop only · logged in/out · Woo cart / product / checkout / thank-you · blog / category / tag / search · geo / country / language · referrer · UTM · device · browser · cookie · session · working hours.

**Conflict:** respect popup/chat mutual suppress (ADR-010 conflicts).

### §3 Chat Window — Core

Drag-and-drop window composition:

**Sections:** Header · Conversation · Quick Actions · Cards · Footer · Typing Area.

Layout presets + free section order; theme tokens from §20.

### §4 Header — Core / Standard

Logo · bot avatar · agent avatar · company name · department · online / away / typing · current agent · switch agent · transfer · video call · voice call · minimize / maximize / close · theme switch · language switch.

*(Video/voice call = Advanced — WebRTC or third-party meeting link.)*

### §5 Conversation Engine — Core

Renderable block types (protocol `message.blocks[]`):

Plain text · Markdown (bold/italic/underline) · clickable URL / tel / mailto · buttons · button group · cards · carousel · accordion · table · pricing table · FAQ · gallery · image · GIF · video · audio · PDF · download · upload · location · map · rating · emoji · sticker · reaction · poll · survey · OTP · code block · countdown · calendar · timeline · webhook/API response · JSON renderer · HTML safe renderer · website data block · dynamic variables · personalized greeting.

**Rule:** URLs in plain text always become clickable links.

### §6 AI Engine — Core

**Default provider: OpenRouter.**

**Optional adapters:** OpenAI · Anthropic · Google Gemini · Mistral · DeepSeek · Qwen · Meta Llama · Cohere · xAI Grok · Perplexity · Together AI · Fireworks · Groq · Azure OpenAI · AWS Bedrock · Vertex AI · Ollama · LM Studio · Custom OpenAI-compatible · Local LLM endpoint.

**Capabilities:** multi-AI fallback · routing · cost optimization · model priority · conversation memory · knowledge base · RAG (ADR-005) · vector DB · function calling · vision · image/audio understanding · voice chat · streaming.

Function tools (minimum): `transfer_agent`, `show_form`, `show_carousel`, `book_appointment`, `fetch_page_context`, `search_kb`, `create_lead`.

### §7 Human Live Agent — Core

Departments · agent queue · round-robin · priority routing · skill-based routing · transfer chat / department · internal note · private comment · whisper · take over · join · leave · multiple agents · supervisor · status (online / busy / break / away / offline) · availability · capacity.

### §8 Lead Capture — Core

**Do not fork Form Builder.** Chat embeds ADR-007 forms (inline bubble / wizard).

Expose in-chat: unlimited fields · conditional logic · progress · multi-step · OTP · email/phone verify · GDPR consent · autosave / resume · duplicate detection · hidden fields · UTM / source / geo / device / browser tracking.

### §9 Appointment Booking — Standard

Calendars: Google · Outlook · CalDAV · custom.  
Slots · timezone detect · buffer · working hours · holidays · reschedule / cancel · confirmation · reminder (SMS / WhatsApp / email) · ICS · meeting links (Zoom / Meet / Teams).

Reuse form appointment engine where possible; sync layer Advanced.

### §10 Product Carousel — Standard

Unlimited products · WooCommerce · Shopify · custom API · card (price, discount, rating, stock, variants) · quick add · buy now · checkout · wishlist · compare.

### §11 Interactive Components — Standard

Buttons · chips · quick reply · carousel · slider · tabs · accordion · timeline · stepper · progress · form · survey · poll · quiz · calculator.

### §12 Website Data Widget — Standard

From inside chat: website scroll context · section preview · dynamic content · custom / safe HTML · whitelisted iframe · knowledge article · search / FAQ · document / blog preview · order / tracking / invoice · CRM record.

### §13 Media — Standard

Image · video · GIF · audio · voice note · document · PDF · DOCX · Excel · ZIP · SVG · Lottie. Size limits + virus scan (Advanced).

### §14 Sound — Standard

Message · typing · join · leave · transfer · notification · custom upload · mute · volume. Per-widget + agent console.

### §15 Reports — Standard

Conversation · lead · form · appointment · agent · AI · human · transfer · satisfaction · response / first / avg reply · resolution · missed / active · popular questions / pages / products · conversion · revenue · AI cost.

### §16 CRM Storage — Core

Conversation / lead / form / appointment history · tags · pipeline · deals · notes · custom fields · timeline · attachments. Unify with existing CRM inbox.

### §17 Automation — Standard

Workflow builder: conditions · triggers · actions · delay · webhook · API · email · SMS · WhatsApp · Slack · Discord · CRM update · tag · assign agent · ticket · appointment · notification.

### §18 Widget Embed — Core

Embed script · inline · floating · fullscreen · popup · sidebar · modal · button trigger · iframe · Shadow DOM · React / Vue / Angular / HTML · WP shortcode · Elementor · Gutenberg · Divi · Bricks · Webflow · custom.

**Chat Wizard** = named embed config (`widget_id`) with liquid layout.

### §19 Responsive Engine — Core (non-negotiable)

Fluid layout · container queries · responsive type / cards / buttons / carousel / forms / images · fluid height/width · touch / tablet / foldable · landscape / portrait · safe-area · **100% liquid responsive**.

### §20 Theme Builder — Core

Light / dark / auto · custom · unlimited colors · glass · gradient · radius · typography · spacing · animation · brand presets · white-label.

### §21 Security — Core

Captcha · reCAPTCHA · Turnstile · rate limit · spam · profanity · bot detection · IP / country block · session timeout · encryption · audit log.

### §22 Accessibility — Standard

Keyboard · ARIA · screen reader · focus · high contrast · font scale · reduced motion · RTL / LTR · multi-language · auto-translation (Advanced).

### §23 API & Integration — Standard

REST · GraphQL (later) · webhook + retry · OAuth · API keys · JWT · Zapier · Make · n8n · Pabbly · Woo · Shopify · HubSpot · Salesforce · Zoho · Sheets · GA · Meta Pixel · GTM.

### §24 Chat Wizard Builder — Core

Visual flow for non-technical users:

DnD conversation builder · decision tree · AI branch · human branch · condition builder · variables · memory · reusable blocks · templates · version control · draft/publish · live preview · A/B testing.

### §25 Enterprise packaging — Core

SaaS cloud + WP connector; module flags; multi-widget per website; org-level AI keys (ADR-006); plan entitlements.

---

## Data model (platform additions)

| Entity | Purpose |
|--------|---------|
| `cep_widgets` | Bubble / wizard / embed configs (theme, triggers, modules on) |
| `cep_playbooks` | Wizard graphs (versioned) |
| `cep_messages` | Typed `blocks[]` payload (extends `messages`) |
| `cep_events` | Transfer, resolve, carousel_click, sound, … |
| `cep_agent_presence` | Status, capacity, department |
| `cep_departments` | Routing skills |
| `cep_ai_bindings` | Provider + model + fallback chain (OpenRouter default) |
| Stores | Lead / form / appointment already exist — tag `channel: cep` |

---

## AI settings UI (fields)

Always show **OpenRouter** first (default on).

Then collapsible adapters for every provider in §6 — each: API key (or BYOK), base URL if needed, model, temperature, max tokens, timeout, fallback model, enable tools, enable vision/voice.

Platform key vs agency BYOK is plan-gated.

---

## Phased delivery

| Phase | Modules unlocked |
|-------|------------------|
| **P0 — Foundation** | Protocol `blocks[]`, widget entity, theme tokens, OpenRouter router + Anthropic fallback, liquid shell, trigger subset, security basics — **done** |
| **P1 — Dual brain** | Bubble + inline wizard embed; text/markdown/links/buttons/lead_form; streaming; agent console realtime; transfer; avatars; sounds — **in progress** |
| **P2 — Commerce & book** | Product carousel (Woo); appointment-in-chat; media upload; header chrome; departments/queue |
| **P3 — Builder & data** | Chat Wizard DnD (§24); website data widget; full trigger parity with popup; reports v1; automation hooks |
| **P4 — Enterprise** | Full AI adapter catalog; skill routing; supervisor/whisper; A/B; GraphQL; video/voice; white-label domains; advanced a11y/i18n |

Modules not in a phase remain **schema-ready / UI-hidden** behind feature flags — no dead-end redesigns.

---

## Delivery surfaces (must all share protocol)

| Surface | Notes |
|---------|--------|
| Floating bubble | §1–§2 |
| Inline Chat Wizard | Fluid width 100%; shortcode + JS |
| Fullscreen / sidebar / modal | §18 modes |
| Page builders | Elementor / Gutenberg / Divi / Bricks / Webflow |
| SPA SDKs | React / Vue / Angular packages |
| Shadow DOM | Style isolation |

---

## Consequences

- BACKLOG “Live Chat V2” is replaced by **CEP** under this ADR.  
- Form / appointment / popup systems stay sources of truth; CEP **composes** them.  
- Agent inbox evolves into **Live Agent Workspace**.  
- Marketing can claim “all-in-one conversational platform”; engineering ships **modular phases**.  
- WP plugin remains thin; CEP logic lives in cloud.

## Rejected

- Shipping a second Form Builder or Calendar product inside chat.  
- Browser-side LLM API keys.  
- Fixed-pixel-only embeds.  
- OpenRouter as the *only* provider (default yes; exclusive no).  
- Monolithic “build all 25 sections in one release.”

## Open questions

1. Realtime: SSE-through-WP vs dedicated `wss://chat.` subdomain for agents?  
2. Voice/video: native WebRTC vs Zoom/Meet link-only for P4?  
3. Shopify carousel: cloud sync vs storefront App Proxy?  
4. Local LLM (Ollama): agency self-host only, or managed private inference?

## Acceptance checklist (definition of done for “CEP v1” = end of P1)

- [x] Bubble + wizard share typed blocks  
- [x] OpenRouter default with at least one fallback  
- [x] Lead form from Form Builder inside chat  
- [x] Human transfer + agent reply realtime  
- [x] Liquid responsive verified mobile/tablet/desktop  
- [x] Module flags for unused § catalog items  
- [ ] ADR-010 conflict: chat open suppresses popup when configured  
