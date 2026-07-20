---
status: Draft
version: 1.0.0
document: USER_ROLES
owner: Product Experience Team
last_updated: 2026-07-19
depends_on:
  - 02-PERSONAS.md
  - 05-PRODUCT_CAPABILITY_MAP.md
approval_status: Pending
---

# User Roles

> "Personas explain why users use the product. Roles define what users are allowed to do."

---

# Purpose

This document defines the canonical system roles used throughout Avonix AI.

Roles determine:

- Access boundaries
- Administrative responsibilities
- Operational authority
- Navigation visibility
- Dashboard personalization
- AI interaction permissions

This document intentionally does **not** define individual permissions. Those are specified in `07-PERMISSION_MODEL.md`.

---

# Role Design Principles

Every role should be:

- Clearly scoped
- Least-privileged by default
- Predictable
- Composable
- Auditable
- Tenant-aware

Users should receive only the permissions required to perform their responsibilities.

---

# Role Hierarchy

```
Platform Level
    │
    ▼
Platform Administrator
    │
──────────────────────────────
Tenant Level
    │
    ▼
Organization Administrator
    │
──────────────────────────────
Operational Level
    │
    ├── Manager
    ├── Analyst
    ├── Support Agent
    ├── Knowledge Editor
    ├── Automation Manager
    └── Team Member
──────────────────────────────
External Level
    │
    ├── Customer
    ├── Visitor
    └── Integration
```

Roles define responsibility, not organizational job titles.

---

# Role Categories

The platform contains four role categories:

- Platform Roles
- Organization Roles
- Operational Roles
- External Roles

---

# Platform Roles

Platform roles exist across the entire Avonix AI platform.

---

## Platform Administrator

### Scope

Entire platform.

### Responsibilities

- Platform configuration
- Global settings
- Licensing
- AI provider management
- Security policies
- Monitoring
- Tenant lifecycle
- Platform integrations

### Typical Users

- SaaS Operations
- Internal Platform Team

### Restrictions

Cannot bypass audit logging.

---

# Organization Roles

Organization roles apply within a single tenant.

---

## Organization Administrator

### Scope

One organization.

### Responsibilities

- Invite users
- Configure websites
- Manage subscriptions
- Configure AI
- Assign roles
- Review reports
- Configure integrations

### Typical Users

- Business Owner
- Agency Owner
- Office Administrator

---

## Organization Manager

### Scope

Department or operational area.

### Responsibilities

- Coordinate daily work
- Review dashboards
- Assign operational tasks
- Monitor team activity

### Typical Users

- Department Manager
- Operations Lead

---

# Operational Roles

Operational roles perform daily platform activities.

---

## Support Agent

Responsibilities:

- Continue AI conversations
- Respond to customers
- Escalate issues
- Review conversation history

Primary Modules:

- Conversations
- Inbox
- Knowledge

---

## Knowledge Editor

Responsibilities:

- Create knowledge articles
- Maintain documentation
- Review AI knowledge quality
- Archive outdated information

Primary Modules:

- Knowledge Base
- Media
- Search

---

## Automation Manager

Responsibilities:

- Create workflows
- Review automation performance
- Configure triggers
- Monitor execution history

Primary Modules:

- Automation
- Scheduler
- Events

---

## Analyst

Responsibilities:

- Analyze reports
- Build dashboards
- Monitor KPIs
- Recommend improvements

Primary Modules:

- Reports
- Analytics
- Insights

---

## Team Member

Responsibilities:

- Perform assigned work
- Update records
- Use AI assistance
- Collaborate with teammates

Primary Modules:

- Workspace
- Tasks
- CRM
- Conversations

---

# External Roles

External roles interact with the platform but are not administrative users.

---

## Customer

Purpose

Continue business relationships.

Typical Access

- Customer Portal
- Conversations
- Files
- Appointments

---

## Visitor

Purpose

Public interaction.

Typical Access

- Website
- AI Chat
- Forms
- Booking

Anonymous by default.

---

## Integration

Purpose

Machine-to-machine communication.

Examples

- CRM
- Calendar
- Email
- Payment
- API Clients

Authentication is API-based rather than user-based.

---

# AI System Roles

AI operates using service roles rather than human roles.

---

## AI Assistant

Purpose

Provide recommendations and assistance.

Authority

Read-only unless explicitly authorized by automation policies.

---

## AI Automation Agent

Purpose

Execute approved workflows.

Authority

Limited to workflow execution.

Cannot modify platform security policies.

---

## AI Knowledge Curator

Purpose

Maintain organizational knowledge.

Authority

Recommend changes.

Human approval is required before publishing.

---

# Role Assignment Principles

Roles should be assigned based on responsibility, not seniority.

Users may hold multiple roles simultaneously.

Examples:

- Organization Administrator + Knowledge Editor
- Manager + Analyst
- Support Agent + Team Member

Role assignment should always follow the principle of least privilege.

---

# Navigation Implications

The interface should adapt based on assigned roles.

Examples:

Platform Administrator

- Platform Dashboard
- Tenant Management
- Licensing
- Security Center

Organization Administrator

- Organization Dashboard
- Websites
- Users
- AI
- Billing

Support Agent

- Inbox
- Conversations
- Knowledge

Analyst

- Reports
- Dashboards
- Insights

Knowledge Editor

- Knowledge
- Media
- AI Review

---

# Relationship to Personas

A Persona describes user intent.

A Role defines system authority.

Example:

Persona:

Agency Owner

Possible Roles:

- Organization Administrator
- Analyst

Persona:

Marketing Manager

Possible Roles:

- Manager
- Team Member

Persona and Role should never be treated as interchangeable concepts.

---

# Relationship to Other Documents

This document defines roles only.

Related documents:

- PERSONAS.md
- PERMISSION_MODEL.md
- ONBOARDING_EXPERIENCE.md

---

Status: Draft

Approval Required: Yes

Next Document:

07-PERMISSION_MODEL.md