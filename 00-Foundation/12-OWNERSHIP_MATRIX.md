---
status: Draft
version: 1.0.0
document: OWNERSHIP_MATRIX
owner: Platform Architecture Team
last_updated: 2026-07-19
depends_on:
  - 04-PLATFORM_ARCHITECTURE.md
  - 07-DOMAIN_MODEL.md
  - 09-DECISION_PRINCIPLES.md
  - 11-PLATFORM_CAPABILITIES.md
approval_status: Pending
---

# Ownership Matrix

> "Every business entity has one canonical owner. Collaboration is encouraged; ownership is not shared."

---

# Purpose

This document defines ownership responsibilities for every major business entity within Avonix AI.

Its goals are to:

- Prevent duplicated business logic.
- Prevent conflicting data ownership.
- Define module responsibilities.
- Clarify API boundaries.
- Clarify event publishing responsibilities.
- Support long-term maintainability.

---

# Ownership Principles

Every business entity must have:

- One Primary Owner
- Zero or more Contributors
- Zero or more Consumers

Only the Primary Owner may define:

- Business rules
- Lifecycle
- Validation
- State transitions
- Canonical APIs
- Canonical events

---

# Responsibility Types

| Responsibility | Meaning |
|---------------|---------|
| Owner | Creates, validates, updates, deletes, and governs the entity. |
| Contributor | Enriches or associates additional information without changing ownership. |
| Consumer | Reads or references the entity without modifying business rules. |

---

# Ownership Matrix

| Business Entity | Primary Owner | Contributors | Consumers |
|-----------------|---------------|--------------|-----------|
| Organization | Organizations | Billing, Identity | All Modules |
| Website | Website Management | Health, Security | AI, Analytics, CRM |
| Workspace | Workspace | Navigation | All Workspace Modules |
| User | Identity | Organizations | Audit, Notifications |
| Team | Identity | Organizations | Permissions |
| Role | Identity | Security | Authorization |
| Permission | Identity | Security | All Modules |
| Service Account | Identity | Integrations | Automation, AI |
| Visitor | Conversations | Analytics | CRM |
| Contact | CRM | Forms | Conversations |
| Lead | CRM | Forms, AI, Conversations | Analytics |
| Conversation | Conversations | AI, Live Chat | CRM |
| Message | Conversations | AI | Analytics |
| AI Agent | AI Platform | Knowledge | Conversations |
| Knowledge Source | Knowledge | Website Management | AI |
| Knowledge Item | Knowledge | AI | Search |
| Form | Forms | Automation | CRM |
| Form Submission | Forms | Automation | CRM |
| Popup | Engagement | Analytics | Marketing |
| Automation Workflow | Automation | AI | Notifications |
| Automation Run | Automation | Scheduler | Analytics |
| Notification | Notifications | Automation | Users |
| Website Health | Health | Security | Dashboard |
| Security Finding | Security | Website Health | Notifications |
| Activity Event | Activity Feed | All Modules | Analytics |
| Audit Record | Audit | All Modules | Compliance |
| File Asset | Files | Knowledge | Forms |
| Report | Reporting | Analytics | Organization |
| Dashboard Widget | Dashboard | Analytics | Workspace |

---

# Ownership Rules

## Rule 1

Ownership is exclusive.

Every entity has exactly one Primary Owner.

---

## Rule 2

Consumers must never redefine business rules.

Consumers may:

- Read
- Display
- Filter
- Reference

They must not:

- Change lifecycle
- Override validation
- Redefine state

---

## Rule 3

Cross-module updates must occur through public interfaces.

Direct database ownership violations are prohibited.

---

## Rule 4

Contributors enrich data.

They never become the canonical source of truth.

Example:

Conversation

Owner:
Conversations

Contributor:
AI

Consumer:
CRM

CRM may associate a Lead with a Conversation, but it does not own the Conversation itself.

---

## Rule 5

Ownership transfers are exceptional.

If ownership changes:

- Architecture review is required.
- Documentation must be updated.
- Events must be reviewed.
- APIs must be reviewed.
- Migration strategy must be documented.

---

# Ownership Decision Test

Before introducing a new entity, answer:

1. Who owns the lifecycle?
2. Who validates it?
3. Who publishes its events?
4. Who defines its business rules?
5. Who is responsible for long-term evolution?

If multiple answers identify different owners, the entity boundary should be reconsidered.

---

# API Ownership

The Primary Owner publishes the canonical API.

Other modules should consume the API rather than bypass it.

Example:

```
CRM

↓

Lead API

↓

Conversations

↓

Forms

↓

Automation
```

---

# Event Ownership

Only the Primary Owner may publish canonical lifecycle events.

Example:

```
Lead Created
Lead Qualified
Lead Closed
```

These events originate from the CRM domain.

Other modules react to them but do not publish equivalent events.

---

# Permission Ownership

Permissions should align with entity ownership.

Examples:

- CRM manages Lead permissions.
- Conversations manages Conversation permissions.
- Knowledge manages Knowledge permissions.

Global identity remains the responsibility of the Identity domain.

---

# Benefits

Following this model provides:

- Clear responsibilities
- Consistent APIs
- Stable module boundaries
- Easier testing
- Predictable maintenance
- Reduced duplication
- Better scalability

---

# Relationship to Other Documents

This document defines who owns each business entity.

Related documents:

- DOMAIN_MODEL.md
- ENTITY_LIFECYCLES.md
- EVENT_PHILOSOPHY.md
- PLATFORM_ARCHITECTURE.md
- DECISION_PRINCIPLES.md

---

Status: Draft

Approval Required: Yes

Next Document:

13-ENTITY_LIFECYCLES.md