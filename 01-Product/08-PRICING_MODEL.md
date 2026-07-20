---
status: Draft
version: 1.0.0
document: PRICING_MODEL
owner: Product Strategy Team
last_updated: 2026-07-19
depends_on:
  - 04-VALUE_PROPOSITIONS.md
  - 05-PRODUCT_CAPABILITY_MAP.md
  - 07-PERMISSION_MODEL.md
approval_status: Pending
---

# Pricing Model

> "Customers pay for outcomes, not features."

---

# Purpose

This document defines the commercial pricing architecture of Avonix AI.

It explains:

- How the platform creates commercial value
- What customers are charged for
- How plans are structured
- Which pricing dimensions exist
- How customers scale over time

This document intentionally does not define exact prices.

---

# Pricing Philosophy

Avonix AI follows a value-based pricing strategy.

Customers should pay in proportion to the business value they receive rather than the number of product screens they access.

The pricing model should be:

- Predictable
- Transparent
- Scalable
- Enterprise-ready
- Sustainable

---

# Pricing Objectives

The pricing model should:

- Encourage adoption
- Support long-term retention
- Scale with customer growth
- Reward operational efficiency
- Avoid unnecessary complexity

---

# Commercial Units

The platform may charge based on one or more commercial units.

Supported units include:

- Organization
- Workspace
- Website
- User Seat
- AI Consumption
- Automation Usage
- API Usage
- Storage
- Communication Volume

Each pricing dimension should be independently configurable.

---

# Billing Dimensions

## Organization

The primary commercial entity.

Examples:

- One company
- One agency
- One healthcare practice

---

## Website

Organizations may manage multiple websites.

Plans may define website limits.

---

## User Seats

Administrative users consuming platform access.

Examples:

- Admin
- Manager
- Team Member

External visitors are not counted as seats.

---

## AI Usage

AI consumption may include:

- AI Requests
- Tokens
- Model Usage
- AI Agents
- Knowledge Retrieval

Usage should remain measurable and transparent.

---

## Automation

Automation pricing may consider:

- Workflow executions
- Scheduled jobs
- Event processing
- AI-assisted automations

---

## Storage

Examples:

- Files
- Knowledge assets
- Reports
- Media
- Backups

---

## API Usage

Commercial measurements may include:

- API requests
- Webhooks
- Third-party integrations
- SDK usage

---

# Plan Hierarchy

The platform supports progressive commercial tiers.

```
Free

↓

Starter

↓

Professional

↓

Business

↓

Enterprise
```

Higher plans unlock additional capabilities rather than duplicating existing functionality.

---

# Packaging Principles

Capabilities should be packaged according to customer maturity.

Free

- Evaluation
- Learning
- Basic operations

Starter

- Small organizations
- Essential AI
- Core operations

Professional

- Growing teams
- CRM
- Automation
- Reporting

Business

- Multi-team collaboration
- Advanced analytics
- Operational governance

Enterprise

- Large organizations
- Compliance
- SSO
- Custom policies
- Dedicated support
- Enterprise integrations

---

# Value Expansion

Customers should naturally upgrade as they grow.

Growth signals include:

- More users
- More websites
- More AI usage
- Increased automation
- Larger knowledge bases
- Higher operational complexity

The pricing model should encourage expansion without forcing unnecessary upgrades.

---

# Usage Transparency

Customers should always understand:

- Current usage
- Remaining capacity
- Upcoming limits
- Historical usage
- Estimated billing impact

No hidden consumption should exist.

---

# Upgrade Principles

Customers may upgrade at any time.

An upgrade should:

- Preserve existing data
- Unlock additional capabilities immediately
- Avoid operational disruption

---

# Downgrade Principles

Customers may downgrade according to commercial policy.

Downgrades should:

- Never delete customer data immediately
- Preserve historical records
- Clearly identify inaccessible capabilities
- Allow recovery after re-upgrade where feasible

---

# Trial Strategy

Trials should maximize customer learning.

Trials may include:

- Time-based evaluation
- Usage-based evaluation
- Guided onboarding
- AI-assisted setup

At trial expiration, customers should retain access to their data according to retention policy.

---

# Enterprise Commercial Options

Enterprise agreements may include:

- Annual contracts
- Volume discounts
- Dedicated infrastructure
- Custom onboarding
- Priority support
- Professional services
- Custom SLAs

---

# Pricing Governance

Pricing changes should follow formal governance.

Major pricing updates should evaluate:

- Customer impact
- Competitive positioning
- Operational cost
- Product maturity
- Support implications

---

# Relationship to Other Documents

This document defines how the platform captures commercial value.

Related documents:

- VALUE_PROPOSITIONS.md
- LICENSING_MODEL.md
- PLAN_LIMITATIONS.md
- PRODUCT_METRICS.md

---

Status: Draft

Approval Required: Yes

Next Document:

09-LICENSING_MODEL.md