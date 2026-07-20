---
status: Draft
version: 1.0.0
document: SYSTEM_CONTEXT
owner: Platform Architecture Team
last_updated: 2026-07-19
depends_on:
  - 00-PLATFORM_VISION.md
  - 03-CORE_CONCEPTS.md
  - 04-PLATFORM_ARCHITECTURE.md
approval_status: Pending
---

# System Context

> "A platform becomes easier to understand when everyone knows where its boundaries begin and end."

---

# Purpose

This document defines the external environment surrounding the Avonix AI platform.

It answers four fundamental questions:

- What does Avonix AI own?
- What does Avonix AI integrate with?
- What remains outside the platform?
- How does information move across system boundaries?

This document intentionally avoids implementation details such as APIs, SDKs, protocols, or programming languages.

---

# System Boundary

The Avonix AI Platform is the operational intelligence layer that sits between websites, users, artificial intelligence, and external business services.

```
                     External World
────────────────────────────────────────────────────

 Visitors
 Organization Staff
 AI Providers
 WordPress Websites
 Email Providers
 SMS Providers
 Voice Providers
 Payment Providers
 CRM Systems
 Calendar Providers
 Cloud Storage
 Search Engines
 Monitoring Services

────────────────────────────────────────────────────
        Avonix AI Platform Boundary
────────────────────────────────────────────────────

 Platform

 Organizations

 Websites

 Workspaces

 Business Modules

 Shared Services

 AI Layer

 Automation Engine

 Security

 Analytics

────────────────────────────────────────────────────
```

Only the components inside this boundary are owned by Avonix AI.

---

# Internal Domains

The platform owns:

- Identity
- Organizations
- Websites
- Workspaces
- AI Configuration
- Knowledge
- Conversations
- Forms
- Popups
- Leads
- Automation
- Analytics
- Security
- Notifications
- Website Health
- Reporting

These capabilities are developed, maintained, and governed by the platform.

---

# External Systems

The platform communicates with—but does not own—the following systems.

---

## Websites

Examples:

- WordPress
- Static Websites
- Headless Websites
- Custom Applications

Purpose:

Provide content, receive widgets, exchange operational data.

---

## AI Providers

Examples:

- OpenAI
- Anthropic
- Google
- Local Models

Purpose:

Generate intelligent responses, embeddings, reasoning, and language understanding.

The platform owns orchestration—not the models themselves.

---

## Email Providers

Purpose:

- Notifications
- Verification
- Marketing
- Transactional Messages

---

## SMS Providers

Purpose:

- OTP
- Alerts
- Customer Notifications

---

## Voice Providers

Purpose:

- AI Voice Calls
- Phone Routing
- Speech Recognition
- Speech Synthesis

---

## Calendar Providers

Purpose:

- Appointment Scheduling
- Availability
- Event Synchronization

---

## Payment Providers

Purpose:

- Subscription Billing
- License Payments
- Invoicing

The platform manages subscriptions but does not process payments directly.

---

## CRM Systems

Purpose:

Synchronize customer information when organizations choose external CRM platforms.

The platform may also provide its own CRM capabilities.

---

## Cloud Storage

Purpose:

Store:

- Files
- Images
- Documents
- Knowledge Assets
- Backups

Storage implementation remains replaceable.

---

## Monitoring Services

Purpose:

Provide infrastructure and operational telemetry.

Examples include uptime monitoring, error aggregation, and infrastructure observability.

---

# Actors

The platform interacts with several categories of actors.

## Platform Owner

Operates the Avonix AI ecosystem.

---

## Organization Administrator

Operates one Organization.

---

## Team Member

Performs daily operational work.

---

## Website Visitor

Consumes website content and interacts with AI.

---

## AI Agent

Acts within permissions and knowledge boundaries.

---

## External Systems

Provide services outside the platform boundary.

---

# Information Flow

High-level information movement:

```
Visitor

↓

Website

↓

Avonix AI

↓

Knowledge

↓

AI

↓

Conversation

↓

Automation

↓

Notification

↓

Analytics

↓

Reports
```

The platform orchestrates information rather than duplicating ownership.

---

# Integration Philosophy

External integrations should follow these principles:

- Optional
- Replaceable
- Loosely Coupled
- Secure
- Observable
- Auditable

Business logic should remain inside Avonix AI.

External systems provide capabilities—not ownership.

---

# Ownership Boundary

Avonix AI owns:

- Business workflows
- Knowledge orchestration
- AI orchestration
- Automation
- User experience
- Reporting
- Operational intelligence

External providers own:

- Infrastructure services
- AI model execution
- Email delivery
- SMS delivery
- Voice transport
- Payment processing

---

# Trust Boundaries

Every interaction crossing the platform boundary should be considered untrusted until verified.

Examples include:

- Incoming webhooks
- Visitor requests
- AI responses
- Third-party callbacks
- File uploads

Validation is required before processing.

---

# Architectural Rules

The platform should:

- Minimize vendor lock-in.
- Abstract external providers behind internal services.
- Preserve tenant isolation.
- Maintain auditability.
- Support provider replacement without changing business logic.

---

# Relationship to Other Documents

This document defines where Avonix AI ends and external systems begin.

Related documents:

- PLATFORM_ARCHITECTURE.md
- DOMAIN_MODEL.md
- PLATFORM_CAPABILITIES.md
- EVENT_PHILOSOPHY.md

---

Status: Draft

Approval Required: Yes

Next Document:

11-PLATFORM_CAPABILITIES.md