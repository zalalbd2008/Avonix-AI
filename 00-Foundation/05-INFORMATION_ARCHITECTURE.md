---
status: Draft
version: 1.0.0
document: INFORMATION_ARCHITECTURE
owner: Product Design & Information Architecture Team
last_updated: 2026-07-19
depends_on:
  - 00-PLATFORM_VISION.md
  - 01-PRODUCT_PHILOSOPHY.md
  - 02-DESIGN_PRINCIPLES.md
  - 03-CORE_CONCEPTS.md
  - 04-PLATFORM_ARCHITECTURE.md
approval_status: Pending
---

# Information Architecture

> "Users should never wonder where something belongs."

---

# Purpose

This document defines how information is organized throughout the Avonix AI platform.

It establishes a predictable structure for navigation, dashboards, modules, settings, and workflows so users can build a consistent mental model of the product.

Information Architecture answers:

- Where does this feature belong?
- Where should this information appear?
- How does a user navigate to it?
- Who should see it?
- What is global?
- What is local?

---

# Information Hierarchy

The platform is organized into five primary levels.

```
Platform

↓

Organization

↓

Website

↓

Workspace

↓

Module
```

Every screen belongs to exactly one level.

---

# Navigation Principles

Navigation should be:

- Predictable
- Consistent
- Context-aware
- Scalable
- Searchable

Users should never need to memorize where features are located.

---

# Level 1 — Platform

The Platform contains global capabilities.

Examples:

- Organizations
- Licensing
- Billing
- Global Users
- Platform Monitoring
- Platform Analytics
- AI Providers
- System Settings

Platform information affects every organization.

---

# Level 2 — Organization

The Organization contains company-wide management.

Examples:

- Users
- Teams
- Roles
- Websites
- Branding
- Organization Settings
- Reports
- AI Configuration
- Notification Rules

Nothing inside an Organization should expose another Organization's data.

---

# Level 3 — Website

Selecting a Website changes the working context.

Everything after this point belongs only to the selected Website.

Users should always know which Website they are currently managing.

---

# Level 4 — Workspace

A Workspace is the operational dashboard for one Website.

The Workspace should answer one question:

> "How is this Website performing right now?"

Core sections include:

- Dashboard
- AI
- Conversations
- Voice
- Knowledge
- Forms
- Popups
- Leads
- Analytics
- Security
- Health
- Settings

The Workspace is the primary destination for daily work.

---

# Level 5 — Modules

Modules provide focused functionality.

Each module owns:

- Dashboard
- List Views
- Detail Views
- Settings
- Reports
- Activity
- Automation
- Permissions (when applicable)

Modules should not duplicate each other's responsibilities.

---

# Navigation Model

```
Platform
    │
    ▼
Organization
    │
    ▼
Website
    │
    ▼
Workspace
    │
    ▼
Module
    │
    ▼
Feature
```

Navigation always moves from broader context to narrower context.

---

# Global Navigation

Global navigation remains available regardless of the active module.

It may include:

- Organization Switcher
- Website Switcher
- Global Search
- Notifications
- User Menu
- Help
- AI Assistant

Global navigation changes context.

It should never perform module-specific actions.

---

# Workspace Navigation

Workspace navigation provides access to operational capabilities.

Recommended structure:

- Overview
- AI
- Visitors
- Conversations
- Leads
- Forms
- Popups
- Voice AI
- Knowledge
- Analytics
- Security
- Website Health
- Settings

Ordering should reflect user frequency rather than implementation order.

---

# Module Navigation

Every module should follow a consistent internal structure.

Recommended pattern:

```
Overview

↓

Primary Data

↓

Automation

↓

Reports

↓

Activity

↓

Settings
```

Users should recognize this pattern regardless of module.

---

# Settings Hierarchy

Settings should follow ownership boundaries.

Platform Settings

↓

Organization Settings

↓

Website Settings

↓

Module Settings

Global settings should never appear inside a module.

Module settings should never contain organization-wide configuration.

---

# Search

Search should operate at multiple scopes.

Platform Search

- Organizations
- Websites
- Users

Organization Search

- Teams
- Websites
- Members

Workspace Search

- Leads
- Conversations
- Knowledge
- Forms
- Files

Users should always know which search scope is active.

---

# Dashboards

Every dashboard should answer a specific question.

Platform Dashboard

"What is happening across the platform?"

Organization Dashboard

"How is this organization performing?"

Workspace Dashboard

"What needs attention on this website?"

Module Dashboard

"What is happening inside this capability?"

Dashboards should prioritize actions over raw statistics.

---

# Breadcrumbs

Breadcrumbs communicate context.

Example:

```
Platform

>

Organization

>

Website

>

Workspace

>

Knowledge

>

Document
```

Users should never lose awareness of where they are.

---

# Cross-Module Navigation

Modules should link to related information without duplicating it.

Example:

Lead

↓

Conversation

↓

Visitor

↓

Knowledge Source

↓

Automation History

↓

Audit Record

Users should move naturally between related information.

---

# Information Ownership

Every piece of information must have one owner.

Examples:

- AI owns conversations.
- CRM owns leads.
- Forms own submissions.
- Knowledge owns documents.
- Security owns alerts.

Other modules may reference information but should not redefine or duplicate it.

---

# Scalability

The Information Architecture should support:

- New modules
- New AI capabilities
- New integrations
- Enterprise features
- Future products

Adding new capabilities should not require reorganizing the entire navigation.

---

# Relationship to Other Documents

This document defines where information belongs.

The following documents explain:

- How users interact with the platform
- How business entities relate
- How implementation supports this structure

---

Status: Draft

Approval Required: Yes

Next Document:

06-USER_JOURNEYS.md