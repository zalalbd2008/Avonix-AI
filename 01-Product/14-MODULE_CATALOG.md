---
status: Draft
version: 1.0.0
document: MODULE_CATALOG
owner: Product Architecture Team
last_updated: 2026-07-19
depends_on:
  - 05-PRODUCT_CAPABILITY_MAP.md
  - 06-USER_ROLES.md
  - 07-PERMISSION_MODEL.md
  - 13-PRODUCT_ROADMAP_PRINCIPLES.md
approval_status: Pending
---

# Module Catalog

> "Modules are the operational building blocks of the product. Capabilities describe what the platform can do; modules describe where those capabilities live."

---

# Purpose

This document defines the canonical registry of all product modules within Avonix AI.

It establishes:

- Official module names
- Module purpose
- Business capability alignment
- Primary personas
- Core responsibilities
- Dependencies
- Integration boundaries
- Ownership expectations

This document intentionally does not describe implementation details.

---

# Module Design Principles

Every module should:

- Have a single primary responsibility
- Own a clearly defined business domain
- Expose stable interfaces
- Publish meaningful events
- Consume only necessary dependencies
- Remain independently evolvable

Modules should collaborate, not duplicate functionality.

---

# Module Registry

The Avonix AI product consists of the following canonical modules.

```
Core Platform
─────────────
• Dashboard
• Organizations
• Websites
• Workspace
• Users & Teams

Artificial Intelligence
───────────────────────
• AI Gateway
• AI Assistant
• AI Agents
• Knowledge

Customer Engagement
───────────────────
• Conversations
• Live Chat
• Appointments
• Notifications

Customer Management
───────────────────
• CRM
• Contacts
• Leads
• Pipelines

Automation
──────────
• Workflow Builder
• Scheduler
• Event Center

Operations
──────────
• Website Health
• Security Center
• Audit Center

Analytics
─────────
• Reports
• Insights
• Dashboards

Administration
──────────────
• Billing
• Licensing
• Integrations
• Settings
```

---

# Canonical Module Specification

Every module should follow the same specification.

---

## Module Name

Official product name.

---

## Purpose

Why the module exists.

---

## Business Capability

Primary capability delivered.

---

## Primary Personas

Main user groups.

---

## Supported JTBD

Jobs-to-Be-Done enabled by the module.

---

## Core Responsibilities

Business responsibilities owned by the module.

---

## Primary Entities

Business entities managed.

---

## Primary Workflows

Key customer workflows.

---

## Dependencies

Modules required for operation.

---

## Published Events

Business events emitted.

Examples:

- Lead Created
- Workflow Completed
- Website Connected

---

## Consumed Events

Business events observed.

Examples:

- Organization Created
- User Invited
- AI Response Generated

---

## External Integrations

Relevant APIs and external services.

---

## Configuration Requirements

Required administrative configuration.

---

## Licensing Requirements

Commercial requirements.

---

## Security Considerations

Authorization and protection expectations.

---

## Observability

Recommended operational metrics.

Examples:

- Usage
- Errors
- Performance
- Availability

---

## Future Evolution

Expected long-term expansion areas.

---

# Example Module

## Conversations

### Purpose

Provide a unified communication workspace between organizations, AI, and visitors.

### Business Capability

Customer Engagement.

### Primary Personas

- Support Agent
- Team Member
- Visitor

### Supported JTBD

- Respond to Visitors Faster

### Core Responsibilities

- Manage conversations
- Route messages
- Support AI handoff
- Maintain conversation history

### Primary Entities

- Conversation
- Message
- Attachment

### Primary Workflows

- Visitor starts conversation
- AI responds
- Human takeover
- Conversation closed

### Dependencies

- AI Assistant
- Knowledge
- CRM
- Notifications

### Published Events

- Conversation Started
- Conversation Assigned
- Conversation Closed

### Consumed Events

- Lead Created
- AI Response Generated

### External Integrations

- Email
- SMS
- Messaging Providers

### Configuration

- Inbox assignment
- Routing rules
- SLA policies

### Licensing

Professional and above.

### Security

Conversation access controlled by organization scope.

### Observability

- Response Time
- Conversation Volume
- Resolution Rate

### Future Evolution

- Omnichannel messaging
- Voice conversations
- AI copilots

---

# Module Ownership Principles

Every module should have:

- Product Owner
- Engineering Owner
- UX Owner
- QA Owner
- Documentation Owner

Ownership should remain explicit throughout the product lifecycle.

---

# Naming Standards

Module names should:

- Use consistent terminology
- Avoid abbreviations where possible
- Reflect business intent
- Remain stable across releases

Changes to canonical names require governance approval.

---

# Relationship to Other Documents

This document defines the official product module registry.

Related documents:

- PRODUCT_CAPABILITY_MAP.md
- USER_ROLES.md
- PERMISSION_MODEL.md
- MODULE_DEPENDENCIES.md

---

Status: Draft

Approval Required: Yes

Next Document:

15-MODULE_DEPENDENCIES.md