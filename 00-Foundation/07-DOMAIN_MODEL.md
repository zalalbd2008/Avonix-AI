---
status: Draft
version: 1.0.0
document: DOMAIN_MODEL
owner: Platform Architecture Team
last_updated: 2026-07-19
depends_on:
  - 00-PLATFORM_VISION.md
  - 03-CORE_CONCEPTS.md
  - 04-PLATFORM_ARCHITECTURE.md
  - 05-INFORMATION_ARCHITECTURE.md
  - 06-USER_JOURNEYS.md
approval_status: Pending
---

# Domain Model

> "The Domain Model defines what exists in the business—not how it is implemented."

---

# Purpose

This document defines the core business entities of the Avonix AI platform and the relationships between them.

It is the canonical business model used by:

- Product
- Engineering
- UX
- QA
- AI
- Documentation

This document intentionally avoids implementation details such as database tables, API endpoints, or programming languages.

---

# Domain Hierarchy

```
Platform
    │
    ├── Organizations
    │      ├── Users
    │      ├── Teams
    │      ├── Websites
    │      └── Settings
    │
    └── Shared Services
```

Every business entity belongs somewhere within this hierarchy.

---

# Primary Business Entities

## Platform

The Platform is the root domain.

It provides global services and governance.

Owns:

- Authentication
- Organizations
- Billing
- Licensing
- Global Settings
- AI Infrastructure
- Monitoring

---

## Organization

Represents an independent business.

Relationships:

```
Organization

├── Users
├── Teams
├── Websites
├── Roles
├── AI Configuration
├── Branding
└── Reports
```

Every Organization is isolated from every other Organization.

---

## Website

A Website is the primary operational asset.

Relationships:

```
Website

├── Workspace
├── Knowledge
├── AI Agents
├── Conversations
├── Visitors
├── Leads
├── Forms
├── Popups
├── Analytics
├── Security
└── Health
```

A Website belongs to exactly one Organization.

---

## Workspace

The Workspace is the operational context of one Website.

It does not own business data.

Instead, it provides a unified interface to Website capabilities.

---

## User

Represents a human identity.

Relationships:

```
Organization

↓

User

↓

Roles

↓

Permissions

↓

Actions
```

Users perform work.

They do not own platform infrastructure.

---

## Service Account

Represents a machine identity.

Examples:

- AI Agents
- Automation
- Integrations
- Scheduled Jobs

Service Accounts authenticate systems—not people.

---

## Visitor

Represents someone interacting with a Website.

Possible lifecycle:

```
Visitor

↓

Conversation

↓

Contact

↓

Lead

↓

Customer
```

Not every Visitor becomes a Lead.

---

## Contact

Represents an identified person known to the Organization.

Contacts may exist without commercial intent.

---

## Lead

Represents a Contact with business intent.

Possible lifecycle:

```
Lead

↓

Qualified

↓

Opportunity

↓

Customer
```

Lifecycle stages are managed by the CRM domain.

---

## Conversation

Represents communication between a Visitor (or Contact) and the platform.

Relationships:

```
Conversation

├── Visitor
├── AI Agent
├── Messages
├── Attachments
├── Knowledge References
└── Outcomes
```

A Conversation may generate:

- Lead
- Appointment
- Automation
- Human Handoff

---

## AI Agent

Represents an intelligent assistant operating within a defined scope.

Relationships:

```
AI Agent

├── Knowledge
├── Conversations
├── Automations
├── Tools
└── Policies
```

AI Agents never own business data.

They consume and act upon it.

---

## Knowledge

Knowledge represents verified information available to AI.

Sources include:

- Website Pages
- Files
- FAQs
- Policies
- SOPs
- Product Data
- Service Data

Knowledge continuously evolves.

---

## Form

Represents a structured data collection workflow.

Relationships:

```
Form

├── Fields
├── Rules
├── Submissions
├── Automations
└── Notifications
```

Forms may generate Leads or trigger workflows.

---

## Popup

Represents contextual engagement.

Relationships:

```
Popup

├── Rules
├── Triggers
├── Target Audiences
└── Analytics
```

Popups react to visitor behavior.

---

## Automation

Represents rule-driven execution.

Relationships:

```
Automation

├── Trigger
├── Conditions
├── Actions
└── History
```

Automations never initiate themselves.

They respond to events.

---

## Analytics

Represents measurement.

Analytics consume events generated throughout the platform.

Analytics never generate business events.

---

## Security

Represents operational protection.

Security consumes events from:

- Authentication
- Users
- Websites
- Files
- Infrastructure

Security may generate:

- Alerts
- Notifications
- Recommendations

---

## Website Health

Website Health represents the operational condition of a Website.

Inputs include:

- Performance
- Security
- SEO
- Accessibility
- Availability
- Updates
- Backups
- SSL

Health is an aggregate view rather than a standalone system.

---

# Entity Relationships

```
Platform
    │
    ▼
Organization
    │
    ├──────── Users
    ├──────── Teams
    ├──────── Website
    │              │
    │              ▼
    │        Workspace
    │              │
    │              ├── AI
    │              ├── Knowledge
    │              ├── Conversations
    │              ├── Forms
    │              ├── Popups
    │              ├── Leads
    │              ├── Analytics
    │              ├── Security
    │              └── Health
    │
    └──────── Reports
```

---

# Ownership Rules

Every business entity has exactly one canonical owner.

Examples:

| Entity | Canonical Owner |
|---------|-----------------|
| Organization | Organizations |
| Website | Websites |
| User | Users |
| Conversation | Conversations |
| Lead | CRM |
| Knowledge | Knowledge |
| Form | Forms |
| Popup | Popups |
| AI Agent | AI |
| Website Health | Health |
| Notification | Notifications |

Other modules may reference these entities but must not redefine ownership.

---

# Domain Rules

The platform follows these rules:

- Every Website belongs to one Organization.
- Every Workspace belongs to one Website.
- Every User belongs to at least one Organization.
- Every Service Account belongs to one Organization.
- Every Conversation belongs to one Website.
- Every Lead originates from one Website.
- Every AI Agent operates within one Website context unless explicitly defined as platform-wide.

---

# Evolution

The Domain Model is designed to evolve.

New entities may be introduced without changing existing ownership principles.

Extensions should:

- Preserve modularity.
- Respect ownership.
- Avoid duplication.
- Maintain tenant isolation.

---

# Relationship to Other Documents

This document defines **what exists** within the business domain.

The following documents define:

- Shared terminology
- Decision-making principles
- Engineering implementation
- Module specifications

---

Status: Draft

Approval Required: Yes

Next Document:

08-GLOSSARY.md