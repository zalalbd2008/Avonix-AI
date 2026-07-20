---
status: Draft
version: 1.0.0
document: PERSONAS
owner: Product Experience Team
last_updated: 2026-07-19
depends_on:
  - 01-PRODUCT_OVERVIEW.md
  - ../00-Foundation/06-USER_JOURNEYS.md
approval_status: Pending
---

# Personas

> "We do not build for everyone. We build for clearly understood users with clearly understood goals."

---

# Purpose

This document defines the canonical personas for the Avonix AI platform.

Personas help guide:

- Product Strategy
- UX Design
- AI Behavior
- Feature Prioritization
- Permission Design
- Onboarding
- Documentation
- Customer Success

These personas represent roles, goals, and behaviors rather than individual customers.

---

# Persona Categories

The platform recognizes four persona groups:

```
Business Personas

↓

Operational Personas

↓

AI Personas

↓

External Personas
```

Each group has different goals and responsibilities.

---

# Business Personas

Business Personas represent decision-makers responsible for purchasing, evaluating, and measuring platform value.

---

## Agency Owner

### Primary Goal

Manage multiple client websites efficiently while reducing operational costs.

### Success Looks Like

- Centralized management
- AI-assisted support
- Faster delivery
- Lower operational overhead
- Higher client satisfaction

### Key Concerns

- Scalability
- Team productivity
- Client reporting
- Automation

---

## Small Business Owner

### Primary Goal

Operate a business website without needing a large technical team.

### Success Looks Like

- AI answers customer questions
- More leads
- Better website health
- Less manual work

---

## Marketing Manager

### Primary Goal

Increase engagement and conversions.

### Success Looks Like

- Better visitor experiences
- Higher conversion rates
- Actionable analytics
- Campaign visibility

---

## Operations Manager

### Primary Goal

Ensure websites remain healthy, secure, and reliable.

### Success Looks Like

- Fewer incidents
- Faster issue resolution
- Clear operational dashboards
- Predictable workflows

---

# Operational Personas

Operational Personas represent users who perform day-to-day work inside Avonix AI.

---

## Platform Administrator

Scope:

Entire platform.

Responsibilities:

- Platform configuration
- Licensing
- AI providers
- Global monitoring
- Security oversight

Needs:

- Complete visibility
- Administrative controls
- Platform analytics

---

## Organization Administrator

Scope:

One organization.

Responsibilities:

- Manage users
- Configure websites
- Assign permissions
- Review reports
- Configure AI

Needs:

- Administrative simplicity
- Organization-wide visibility

---

## Team Member

Responsibilities:

- Respond to conversations
- Review leads
- Update knowledge
- Configure forms
- Resolve operational tasks

Needs:

- Fast workflows
- Clear priorities
- Minimal complexity

---

## Analyst

Responsibilities:

- Review dashboards
- Analyze trends
- Generate reports
- Recommend improvements

Needs:

- Reliable data
- Flexible reporting
- Historical insights

---

## Support Agent

Responsibilities:

- Resolve customer issues
- Continue AI conversations
- Escalate when required

Needs:

- Complete conversation history
- AI context
- Knowledge access

---

# AI Personas

AI is treated as an operational participant rather than a passive feature.

---

## AI Assistant

Purpose:

Assist users during everyday work.

Examples:

- Recommendations
- Summaries
- Suggestions
- Content assistance

---

## AI Knowledge Curator

Purpose:

Maintain and improve organizational knowledge.

Responsibilities:

- Detect outdated knowledge
- Recommend updates
- Improve indexing
- Identify gaps

---

## AI Automation Agent

Purpose:

Execute approved workflows.

Responsibilities:

- Trigger automations
- Evaluate conditions
- Route tasks
- Generate notifications

AI Agents never become decision-makers.

Human approval remains authoritative where required.

---

# External Personas

These personas interact with websites rather than the administration platform.

---

## Visitor

Characteristics:

- Anonymous
- Exploring
- Information seeking

Goals:

- Get answers quickly
- Find services
- Complete tasks

---

## Prospect

Characteristics:

- Demonstrates commercial intent.

Goals:

- Evaluate offerings
- Contact the organization
- Schedule appointments

---

## Customer

Characteristics:

- Existing relationship with the organization.

Goals:

- Receive support
- Access information
- Continue conversations

---

## Integration Partner

Represents external software communicating with Avonix AI.

Examples:

- CRM
- Calendar
- Email
- Payment
- Voice systems

Goals:

- Reliable synchronization
- Secure communication
- Predictable interfaces

---

# Shared User Expectations

Regardless of persona, users expect:

- Speed
- Reliability
- Simplicity
- Transparency
- Security
- Explainable AI
- Consistent terminology

---

# Persona Relationships

```
Business Personas
        │
        ▼
Operational Personas
        │
        ▼
AI Personas
        │
        ▼
External Personas
```

Each persona contributes to a different part of the overall platform experience.

---

# Design Implications

Personas influence:

- Navigation
- Permissions
- Dashboards
- Notifications
- AI Recommendations
- Reports
- Automation
- Onboarding

No feature should be designed without identifying its primary persona.

---

# Relationship to Other Documents

This document defines who uses the product.

Related documents:

- PRODUCT_OVERVIEW.md
- JOBS_TO_BE_DONE.md
- USER_ROLES.md
- PERMISSION_MODEL.md
- ONBOARDING_EXPERIENCE.md

---

Status: Draft

Approval Required: Yes

Next Document:

03-JOBS_TO_BE_DONE.md