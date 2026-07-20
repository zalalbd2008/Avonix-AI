---
status: Draft
version: 1.0.0
document: SERVICE_ACCOUNTS_STATES
owner: Platform Identity Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
approval_status: Pending
---

# Service Accounts States

## Purpose

This document defines the canonical lifecycle states for Service Accounts within the Avonix AI platform.

A Service Account represents a persistent non-human identity used by applications, integrations, AI agents, automation workflows, and backend services. The lifecycle ensures identities remain secure, auditable, and consistently managed across the platform.

---

# Objectives

The lifecycle must:

- Secure machine identities.
- Support temporary suspension.
- Enable long-term identity continuity.
- Preserve audit history.
- Support compliance requirements.
- Prevent unauthorized authentication.
- Maintain predictable state transitions.

---

# Design Principles

Service Account states should be:

- Deterministic
- Explicit
- Auditable
- Immutable where appropriate
- Replay-safe
- Security-first

Every lifecycle transition must be intentional and recorded.

---

# Service Account Lifecycle

```
Created

↓

Active

├─────────────┐
│             │
▼             ▼
Disabled   Archived
```

Archived is a terminal lifecycle state.

---

# State Definitions

## Created

A Service Account has been created but is not yet active.

Characteristics:

- Identity established
- Organization assigned
- Workspace assignment optional
- API Keys may be created
- Authentication not yet permitted

---

## Active

The Service Account is operational.

Characteristics:

- Authentication permitted
- API Keys may authenticate
- Permissions evaluated
- Audit logging enabled
- Usage tracking enabled

Only Active Service Accounts may establish machine identities.

---

## Disabled

The Service Account is temporarily suspended.

Characteristics:

- Authentication denied
- Permissions retained
- API Keys cannot be used
- Audit history preserved
- Reactivation permitted

Suitable for maintenance, security investigations, or temporary operational pauses.

---

## Archived

The Service Account is permanently retired.

Characteristics:

- Authentication denied
- API Keys invalidated according to policy
- Identity retained for historical reference
- Audit history preserved
- Reactivation not permitted

Archived identities exist solely for compliance and historical reporting.

---

# Lifecycle Transition Rules

| Current State | Allowed Next State |
|---------------|-------------------|
| Created | Active |
| Active | Disabled |
| Active | Archived |
| Disabled | Active |
| Disabled | Archived |

All other transitions are invalid.

---

# Authentication Rules

| State | Authentication |
|--------|----------------|
| Created | ❌ Denied |
| Active | ✅ Allowed |
| Disabled | ❌ Denied |
| Archived | ❌ Denied |

Authentication requests must always verify the Service Account state before evaluating permissions.

---

# API Key Relationship

API Keys inherit the operational status of their owning Service Account.

Examples:

- Active Service Account + Active API Key → Authentication Allowed
- Disabled Service Account + Active API Key → Authentication Denied
- Archived Service Account + Active API Key → Authentication Denied

The Service Account lifecycle takes precedence over credential state.

---

# Permission Relationship

Service Account states do not modify assigned permissions.

Permissions remain intact while:

- Disabled
- Archived

Authorization is evaluated only after successful authentication.

---

# Usage Tracking

Operational metrics may include:

- Last authentication
- Last activity
- Authentication count
- Failed authentication count
- Last API Key used

Usage metrics do not affect lifecycle state.

---

# Immutability

The following attributes must never change after creation:

- Service Account ID
- Creation timestamp
- Original Organization assignment
- Historical audit records

Mutable attributes include:

- Display name
- Description
- Labels
- Tags
- Metadata

---

# Related Documents

- README.md
- FEATURES.md
- EVENTS.md
- ERROR_CODES.md
- SECURITY.md
- AUDIT_LOGGING.md
- FAQ.md

---

Status: Draft

Approval Required: Yes

Next Document:
EVENTS.md