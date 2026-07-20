---
status: Draft
version: 1.0.0
document: LICENSING_MODEL
owner: Commercial Platform Team
last_updated: 2026-07-19
depends_on:
  - 07-PERMISSION_MODEL.md
  - 08-PRICING_MODEL.md
approval_status: Pending
---

# Licensing Model

> "Pricing determines what customers buy. Licensing determines what they are entitled to use."

---

# Purpose

This document defines the licensing and entitlement architecture of Avonix AI.

It establishes:

- License philosophy
- License lifecycle
- Entitlement model
- Validation rules
- Seat assignment
- Tenant association
- Compliance requirements

This document intentionally does not define prices or feature packaging.

---

# Licensing Philosophy

Avonix AI follows a subscription-first entitlement model.

A license does not merely unlock features.

It establishes contractual rights to use platform capabilities within defined commercial limits.

Every entitlement should be:

- Explicit
- Measurable
- Auditable
- Revocable
- Transferable only when policy allows

---

# Commercial Relationship

```
Pricing

↓

Purchase

↓

License

↓

Entitlements

↓

Permissions

↓

Product Experience
```

Pricing creates the commercial agreement.

Licensing converts that agreement into technical entitlements.

Permissions determine operational access.

---

# License Types

The platform supports multiple license models.

---

## Trial License

Purpose

Product evaluation.

Characteristics

- Limited duration
- Limited capabilities
- Guided onboarding
- Upgrade eligible

---

## Subscription License

Purpose

Standard commercial licensing.

Characteristics

- Recurring billing
- Renewable
- Plan-based
- Usage-aware

---

## Enterprise Agreement

Purpose

Large organizations.

Characteristics

- Custom commercial terms
- Dedicated infrastructure (optional)
- Enterprise support
- Custom entitlements
- SLA coverage

---

## Partner License

Purpose

Internal partners, agencies, or resellers.

Characteristics

- Managed customer access
- Multi-tenant administration
- Partner-specific capabilities

---

# License Scope

Licenses may apply to one or more commercial entities.

Supported scopes include:

- Organization
- Workspace
- Website
- User Seat
- API Client
- AI Service
- Integration

A single organization may hold multiple licenses.

---

# Entitlement Model

Entitlements define what a license allows.

Entitlements may include:

- Enabled capabilities
- Plan level
- Website limits
- User seat limits
- AI consumption
- Automation quotas
- Storage capacity
- API limits
- Integration availability
- Support tier

Entitlements should be machine-readable.

---

# License Lifecycle

```
Created

↓

Activated

↓

Active

↓

Renewed

↓

Suspended

↓

Expired

↓

Cancelled

↓

Archived
```

Every transition should be recorded in the audit system.

---

## Created

Commercial agreement exists.

License not yet active.

---

## Activated

License becomes effective.

Entitlements become available.

---

## Active

Customer operates normally.

Validation occurs continuously.

---

## Renewed

License validity extends.

Existing entitlements continue unless modified.

---

## Suspended

Temporary restriction.

Possible reasons:

- Payment failure
- Fraud investigation
- Administrative action

Customer data should remain preserved.

---

## Expired

License validity ends.

Access transitions according to entitlement policy.

---

## Cancelled

Commercial relationship ends.

Data retention follows platform retention policies.

---

## Archived

Historical record retained.

No operational access.

---

# License Validation

Validation ensures licenses remain valid.

Supported validation methods:

- Online validation
- Cached validation
- Grace-period validation
- Enterprise offline validation (optional)

Validation should be resilient to temporary service interruptions.

---

# Grace Period

Temporary failures should not immediately disrupt customers.

Grace periods may apply to:

- Payment issues
- Validation outages
- Billing synchronization

Grace duration is governed by commercial policy.

---

# Seat Assignment

Administrative users consume licensed seats.

Seat assignment principles:

- Explicit allocation
- Transferable
- Auditable
- Reclaimable

Seat changes should never remove historical audit records.

---

# Multi-Tenant Licensing

Organizations remain isolated.

Each tenant has:

- Independent license state
- Independent usage
- Independent entitlements
- Independent billing relationship

Cross-tenant entitlement sharing is not supported unless defined by enterprise policy.

---

# Capability Enforcement

Capabilities are enabled through entitlement checks.

Example flow:

License

↓

Plan

↓

Entitlement

↓

Capability

↓

Permission

↓

Execution

Capabilities should never rely solely on client-side checks.

---

# Usage Enforcement

Licensed resources may include measurable limits.

Examples:

- Maximum websites
- Maximum users
- AI requests
- Storage
- Workflow executions
- API requests

Approaching limits should generate proactive notifications.

---

# Upgrade Behavior

When upgrading:

- Existing data remains available.
- New entitlements activate immediately where possible.
- Existing configuration is preserved.

---

# Downgrade Behavior

When downgrading:

- Existing data is retained.
- Restricted capabilities become unavailable.
- Historical information remains accessible according to policy.
- Customers receive advance notice where appropriate.

---

# Compliance & Audit

Licensing events should always be auditable.

Examples include:

- License activation
- Renewal
- Suspension
- Cancellation
- Seat assignment
- Entitlement changes
- Validation failures

Audit records should be immutable.

---

# Relationship to Other Documents

This document defines entitlement architecture.

Related documents:

- PRICING_MODEL.md
- PLAN_LIMITATIONS.md
- PERMISSION_MODEL.md
- PRODUCT_METRICS.md

---

Status: Draft

Approval Required: Yes

Next Document:

10-PLAN_LIMITATIONS.md