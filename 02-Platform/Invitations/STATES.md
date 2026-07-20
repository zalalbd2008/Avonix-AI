---
status: Draft
version: 1.0.0
document: INVITATIONS_STATES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
approval_status: Pending
---

# Invitation States

## Purpose

This document defines the lifecycle of Invitations within the Avonix AI platform.

The Invitation lifecycle is independent from Authentication, Membership, and Notification delivery lifecycles.

---

# Objectives

The Invitation state model must:

- Support secure onboarding.
- Prevent duplicate acceptance.
- Ensure deterministic lifecycle transitions.
- Enable auditability.
- Support expiration and revocation.
- Remain extensible.

---

# Design Principles

Invitation states must be:

- Deterministic
- Immutable after completion
- Auditable
- Policy-aware
- Versionable
- Independent from delivery mechanisms

---

# State Machine

```
Draft
   │
   ▼
Issued
   │
   ├──────────────► Revoked
   │
   ├──────────────► Expired
   │
   ├──────────────► Declined
   │
   ▼
Accepted
   │
   ▼
Completed
```

Completed is a terminal state.

---

# State Definitions

## Draft

The invitation has been created but has not yet been issued.

Typical characteristics:

- Editable
- Not deliverable
- No active token required

---

## Issued

The invitation has been successfully issued.

Characteristics:

- Active
- Token valid
- Awaiting recipient action

---

## Accepted

The recipient has successfully accepted the invitation.

Characteristics:

- Identity verified
- Token consumed
- Membership provisioning initiated

Membership creation belongs to the target module.

---

## Completed

The onboarding workflow has completed successfully.

Characteristics:

- Membership created
- Invitation closed
- Immutable

---

## Declined

The recipient explicitly rejected the invitation.

Characteristics:

- Terminal
- No membership created
- May allow future re-invitation

---

## Revoked

The inviter or administrator cancelled the invitation.

Characteristics:

- Terminal
- Token invalidated
- No further acceptance allowed

---

## Expired

The invitation exceeded its validity period.

Characteristics:

- Terminal
- Token invalid
- New invitation required

---

# Valid State Transitions

| From | To |
|------|----|
| Draft | Issued |
| Issued | Accepted |
| Issued | Declined |
| Issued | Revoked |
| Issued | Expired |
| Accepted | Completed |

---

# Invalid State Transitions

The following transitions are prohibited:

| From | To |
|------|----|
| Completed | Any |
| Declined | Accepted |
| Revoked | Accepted |
| Expired | Accepted |
| Completed | Issued |

Terminal states cannot transition to another state.

---

# State Rules

## Token Consumption

Invitation tokens:

- Are unused before acceptance.
- Become permanently invalid immediately after acceptance.
- Must never be reused.

---

## Expiration

Expired invitations:

- Cannot be accepted.
- Cannot be reactivated.
- Require a new invitation.

---

## Revocation

Revocation immediately:

- Invalidates the token.
- Prevents acceptance.
- Records an audit event.

---

# Relationship to Membership

Invitation acceptance **does not create membership directly**.

Instead:

Invitation Accepted

↓

Membership Module

↓

Membership Created

↓

Invitation Completed

Membership ownership remains outside this module.

---

# State Events

Typical lifecycle events:

- INVITATION.CREATED
- INVITATION.ISSUED
- INVITATION.ACCEPTED
- INVITATION.DECLINED
- INVITATION.REVOKED
- INVITATION.EXPIRED
- INVITATION.COMPLETED

---

# Persistence

Each state transition should record:

- Invitation ID
- Previous State
- New State
- Actor ID
- Timestamp (UTC)
- Correlation ID

---

# Related Documents

- README.md
- FEATURES.md
- EVENTS.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Document:
EVENTS.md