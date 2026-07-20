# ADR-001 — Product identity and positioning

**Status:** Accepted · 2026-07-20

## Context

The repository carried three identities: "Avonix AI" (docs), "Nexus" (prototype),
and an unnamed generic enterprise-architecture repo (archived). Separately, the
written specs describe an AI website-operations platform, while the prototype's
free tier describes website *monitoring* (SSL, uptime, backups, DB cleaner) —
which is the ManageWP/MainWP category, not the category the founder is targeting.

The founder has stated the target: **a GoHighLevel-similar SaaS.**

GoHighLevel is an agency platform: an agency signs up, creates a sub-account per
client business, captures leads, works them in a CRM pipeline, nurtures them with
automation, and — on the top tier — resells the whole thing white-labeled as its
own software. Pricing is $97 (3 sub-accounts, no white-label), $297 (unlimited
sub-accounts, white-label desktop), $497 (SaaS mode: resell, rebill usage with
markup, branded mobile app).

## Decision

**Name: Avonix AI.** "Nexus" is retired. All prototype references are to be
renamed.

**Category: an agency CRM and lead-operations platform — a GoHighLevel
alternative built for agencies that work in WordPress.**

**Positioning wedge — three things GoHighLevel does not do well:**

1. **WordPress-native.** GoHighLevel wants agencies off WordPress; its funnel
   builder replaces the site. Agencies whose business *is* building WordPress
   sites do not want to abandon them. Avonix adds the CRM and lead layer *on top
   of* the sites they already build, via a connector plugin.
2. **Affordable at the small end.** GoHighLevel's entry tier caps at 3
   sub-accounts and carries their branding. Small and solo agencies are
   under-served.
3. **AI-first, not AI-bolted-on.** The name commits us to this.

**Website monitoring (the prototype's Level 1) is out of scope.** It is a
different product for a different buyer and does not compound toward this
category. The prototype's *three-level pricing architecture* is kept (see
ADR-003); its monitoring feature list is not.

## Consequences

- The `02-Platform/` monitoring, health, uptime, backup, and update-centre specs
  are deferred indefinitely. So are the prototype screens Health, Uptime,
  Backups, Update Center, Error Log, Server Health.
- We compete on category, not feature count. We will never out-feature
  GoHighLevel; a solo founder cannot. We win a niche or we do not win.
- The WordPress connector is repositioned: it is a **lead-capture and
  engagement channel**, not a monitoring agent.
- "AI" in the name is a promise. If AI is not in the first release it must be in
  the second.

## Rejected alternatives

- **Website operations / monitoring platform** (the prototype's free tier) —
  coherent, cheap to run, but a different category from the stated target and a
  crowded one (ManageWP, MainWP, MalCare).
- **Full GoHighLevel clone** — funnels, email, SMS, calendars, courses,
  reputation, call tracking, payments, marketplace. This is a hundred-person
  product. Attempting it solo produces nothing shippable.
