---
status: Draft
version: 1.0.0
document: CORE_CONCEPTS
owner: Product & Platform Strategy
last_updated: 2026-07-19
depends_on:
  - 00-PLATFORM_VISION.md
  - 01-PRODUCT_PHILOSOPHY.md
  - 02-DESIGN_PRINCIPLES.md
approval_status: Pending
---

# Core Concepts

> "Shared language creates shared understanding."

---

# Purpose

This document defines the canonical business concepts used throughout the Avonix AI platform.

Every feature, module, API, database model, workflow, design, documentation page, and AI prompt should use these definitions consistently.

If a concept is defined here, no other document should redefine it with a different meaning.

---

# Concept Hierarchy

```
Platform
    ↓
Organization
    ↓
Website
    ↓
Workspace
    ↓
Modules
    ↓
Features
    ↓
Users & AI
    ↓
Visitors
    ↓
Conversations
    ↓
Knowledge
    ↓
Automation
```

---

# Platform

The Platform is the highest-level container.

It provides the infrastructure, services, governance, and operational environment for every organization.

The Platform owns:

- Authentication
- Organizations
- Billing
- Platform Settings
- Global Security
- Global AI Infrastructure
- Monitoring
- Licensing

The Platform never owns website-specific business data.

---

# Organization

An Organization represents an independent company, client, or business.

Every Organization has its own:

- Users
- Teams
- Roles
- Websites
- Branding
- AI Configuration
- Reports
- Settings
- Security Policies

Organizations are completely isolated from one another.

---

# Website

A Website represents a connected digital property managed by the platform.

A Website is the primary operational unit.

It may represent:

- Company Website
- E-commerce Store
- Medical Practice
- Law Firm
- SaaS Product
- Landing Page
- Knowledge Portal

Every Website belongs to exactly one Organization.

---

# Workspace

A Workspace is the operational environment for a single Website.

Inside a Workspace, users interact with:

- Dashboard
- AI
- Knowledge
- Conversations
- Leads
- Forms
- Analytics
- Security
- Automation
- Reports

A Workspace is where daily work happens.

---

# Module

A Module is a self-contained capability with a clearly defined responsibility.

Examples:

- AI Chat
- Forms
- Popups
- Security
- Analytics
- CRM
- Voice AI

Modules cooperate but do not overlap in ownership.

---

# User

A User is a human identity that can access the platform.

Users belong to Organizations.

Users receive permissions through Roles and Policies.

Users make decisions.

---

# Service Account

A Service Account is a non-human identity.

It represents:

- AI Agents
- Automation
- Backend Services
- Integrations
- Scheduled Jobs

Service Accounts never represent people.

---

# AI Agent

An AI Agent is an intelligent software worker operating within a defined scope.

An AI Agent may:

- Answer questions
- Search knowledge
- Guide visitors
- Create leads
- Trigger automation
- Escalate conversations
- Recommend actions

AI Agents operate according to configured permissions and knowledge sources.

---

# Visitor

A Visitor is an anonymous or identified person interacting with a Website.

Visitors may:

- Browse pages
- Chat with AI
- Submit forms
- Book appointments
- Call Voice AI
- Download resources

Visitors become Contacts or Leads only after identification.

---

# Contact

A Contact is an identified individual known to an Organization.

A Contact may exist without becoming a Lead.

Examples:

- Newsletter subscriber
- Existing customer
- Vendor
- Partner

---

# Lead

A Lead is a Contact with demonstrated business intent.

Examples:

- Requested a quote
- Scheduled a consultation
- Asked for pricing
- Requested a callback

Leads participate in sales and follow-up workflows.

---

# Conversation

A Conversation is an interaction between a Visitor (or Contact) and the platform.

It may occur through:

- AI Chat
- Live Chat
- Voice AI
- Messaging Channels

Conversations may produce:

- Answers
- Leads
- Appointments
- Automation
- Human handoffs

---

# Knowledge

Knowledge is the verified information available to AI.

Sources may include:

- Website Pages
- Documents
- PDFs
- FAQs
- Policies
- SOPs
- Product Information
- Service Information

Knowledge is continuously updated and versioned.

---

# Automation

Automation is a rule-driven process that executes predefined actions based on events or conditions.

Examples:

- Send notifications
- Assign leads
- Update records
- Trigger AI workflows
- Schedule follow-up tasks

Automation always remains observable and auditable.

---

# Website Health

Website Health is a composite operational score.

It reflects multiple dimensions, including:

- Performance
- Security
- SEO
- Accessibility
- Updates
- Backups
- SSL Status
- Availability

The Health Score provides a quick assessment of overall website condition.

---

# Event

An Event is a recorded occurrence within the platform.

Examples:

- User logged in
- Lead created
- AI responded
- Form submitted
- Plugin updated
- Malware detected

Events drive automation, analytics, monitoring, and auditing.

---

# Insight

An Insight is a meaningful interpretation of collected data.

Unlike raw metrics, an Insight explains significance and recommends action.

Example:

Instead of:

"Bounce Rate: 62%"

An Insight may state:

"Bounce rate increased 18% after the latest homepage redesign."

---

# Notification

A Notification informs users about important platform events.

Notifications may be:

- Informational
- Warning
- Critical
- Action Required

Notifications should guide users toward meaningful action.

---

# Relationship to Other Documents

This document defines **what the platform talks about**.

The following documents explain:

- How these concepts connect
- How users interact with them
- How information is organized
- How modules implement them

---

Status: Draft

Approval Required: Yes

Next Document:

04-PLATFORM_ARCHITECTURE.md