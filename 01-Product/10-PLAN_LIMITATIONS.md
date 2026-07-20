---
status: Draft
version: 1.0.0
document: PLAN_LIMITATIONS
owner: Commercial Platform Team
last_updated: 2026-07-19
depends_on:
  - 08-PRICING_MODEL.md
  - 09-LICENSING_MODEL.md
  - 07-PERMISSION_MODEL.md
approval_status: Pending
---

# Plan Limitations

> "Plans define commercial boundaries. Enforcement ensures those boundaries remain consistent."

---

# Purpose

This document defines how Avonix AI commercial plans are enforced.

It specifies:

- Capability availability
- Quantitative limits
- Operational limits
- Governance limits
- Upgrade behavior
- Enforcement rules

This document intentionally avoids pricing information.

---

# Enforcement Philosophy

Plans should encourage customer growth without creating unnecessary friction.

Limitations should be:

- Transparent
- Predictable
- Consistent
- Measurable
- Fair

Whenever possible, customers should receive warnings before restrictions are applied.

---

# Plan Hierarchy

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

Each higher plan extends capabilities rather than replacing previous ones.

---

# Limitation Categories

Plan limitations fall into six categories.

- Capability Availability
- Resource Limits
- Operational Limits
- Governance Limits
- AI Limits
- Support Limits

---

# Capability Availability

Capabilities may be:

- Not Available
- Limited
- Standard
- Advanced
- Unlimited

Examples:

Free

- Basic Website Management
- Basic AI
- Basic Reports

Professional

- Automation
- CRM
- AI Knowledge
- Advanced Reporting

Enterprise

- Custom Roles
- SCIM
- SSO
- Dedicated AI
- Compliance Features

---

# Resource Limits

Examples include:

- Organizations
- Websites
- User Seats
- Storage
- Knowledge Articles
- API Clients
- Integrations

Each resource limit should define:

- Default allocation
- Maximum allocation
- Expansion eligibility

---

# Operational Limits

Operational limits control platform workload.

Examples:

- Workflow executions
- Scheduled jobs
- AI requests
- Concurrent automations
- Report generation
- Data exports
- Bulk imports

Operational limits should protect overall platform stability.

---

# AI Limits

AI resources may include:

- Model access
- AI Agents
- Token usage
- Context window
- AI memory
- AI automation
- Voice AI
- Image generation

Different plans may expose different AI capabilities.

---

# Governance Limits

Enterprise governance capabilities include:

- Custom roles
- Approval workflows
- Audit retention
- Security policies
- Compliance reports
- SSO
- SCIM
- Organization policies

Governance features primarily target Business and Enterprise plans.

---

# Support Limits

Support options may include:

Free

- Community resources

Starter

- Standard support

Professional

- Priority support

Business

- Priority queue
- Success guidance

Enterprise

- Dedicated account management
- Technical advisory
- SLA-backed support

---

# Enforcement Types

The platform supports multiple enforcement methods.

## Hard Limit

Action is blocked immediately.

Example:

Maximum websites reached.

---

## Soft Limit

Action remains available temporarily.

Warnings are displayed.

---

## Quota

Usage resets after the billing cycle.

Examples:

- AI requests
- API calls
- Automation executions

---

## Burst Allowance

Temporary usage above the standard quota.

Burst usage should remain measurable and commercially governed.

---

# Customer Experience Principles

When customers approach limits:

The platform should:

- Notify early
- Explain the limitation
- Show current usage
- Recommend upgrades
- Avoid unexpected failures

Users should always understand why an action is restricted.

---

# Upgrade Behavior

When upgrading:

- New limits become active.
- Existing data remains unchanged.
- Locked capabilities become immediately available where possible.

No customer configuration should be lost.

---

# Downgrade Behavior

When downgrading:

Existing data should be preserved.

If new limits are exceeded:

Examples:

- Existing websites remain accessible.
- New websites cannot be added.
- Existing workflows continue where policy allows.
- Editing may become restricted.

Customers should never lose data solely because of a downgrade.

---

# Overage Policy

Certain resources may support controlled overages.

Examples:

- Temporary AI consumption
- Additional storage
- Extra API requests

Overages should:

- Be transparent
- Be measurable
- Require commercial approval where applicable

---

# Plan Comparison Principles

Marketing comparison tables should be generated from this specification.

The canonical source remains this document rather than sales collateral.

---

# Relationship to Licensing

Licensing grants entitlement.

This document defines the operational boundaries of those entitlements.

---

# Relationship to Permissions

Permissions determine whether a user may perform an action.

Plans determine whether the organization is entitled to perform that action.

Both checks are required.

---

# Relationship to Other Documents

Related documents:

- PRICING_MODEL.md
- LICENSING_MODEL.md
- PERMISSION_MODEL.md
- MODULE_CATALOG.md

---

Status: Draft

Approval Required: Yes

Next Document:

11-ONBOARDING_EXPERIENCE.md