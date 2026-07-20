---
status: Draft
version: 1.0.0
document: PERMISSIONS_STATES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
approval_status: Pending
---

# Permission States

## Purpose

This document defines the lifecycle states for permission assignments within the Avonix AI platform.

It specifies how permission grants transition between states while maintaining security, auditability, and deterministic authorization behavior.

---

# Objectives

Permission states must:

- Support secure authorization.
- Prevent privilege escalation.
- Enable temporary suspension.
- Preserve audit history.
- Support future approval workflows.
- Maintain deterministic evaluation.

---

# Design Principles

Permission assignments must be:

- Explicit
- Auditable
- Versioned
- Immutable in identity
- Revocable
- Predictable

Authorization always evaluates the current effective state.

---

# Permission Assignment Lifecycle

Requested

↓

Pending Approval (Optional)

↓

Active

↓

Suspended

↓

Expired

↓

Revoked

---

# State Definitions

## Requested

A permission assignment request has been created but has not yet entered the approval workflow.

Allowed Actions:

- Approve
- Reject
- Cancel

---

## Pending Approval

The assignment awaits approval from an authorized administrator.

No permissions are granted while pending.

Allowed Actions:

- Approve
- Reject
- Cancel

---

## Active

The permission assignment is effective.

Authorization evaluations include this assignment.

Allowed Actions:

- Suspend
- Revoke
- Expire
- Update Metadata

---

## Suspended

The assignment remains recorded but does not grant permissions.

Typical reasons:

- Administrative action
- Security investigation
- Temporary restriction

Allowed Actions:

- Restore
- Revoke

---

## Expired

The assignment has reached its configured expiration time.

Permissions are no longer granted.

Expired assignments remain available for auditing.

---

## Revoked

The assignment has been permanently withdrawn.

Revoked assignments cannot return to Active.

A new assignment must be created.

---

# Valid State Transitions

| From | To |
|------|----|
| Requested | Pending Approval |
| Requested | Active |
| Requested | Cancelled |
| Pending Approval | Active |
| Pending Approval | Rejected |
| Pending Approval | Cancelled |
| Active | Suspended |
| Active | Expired |
| Active | Revoked |
| Suspended | Active |
| Suspended | Revoked |

---

# Invalid Transitions

The following transitions are prohibited:

- Revoked → Active
- Expired → Active
- Revoked → Pending Approval
- Expired → Pending Approval

These require a new permission assignment.

---

# Effective Authorization

Only assignments in the **Active** state participate in authorization decisions.

Assignments in all other states must be ignored during permission resolution.

---

# State Events

Typical lifecycle events include:

- PERMISSION.REQUESTED
- PERMISSION.APPROVED
- PERMISSION.ACTIVATED
- PERMISSION.SUSPENDED
- PERMISSION.RESTORED
- PERMISSION.EXPIRED
- PERMISSION.REVOKED

---

# Persistence

Every state transition records:

- Previous State
- New State
- Timestamp (UTC)
- Actor
- Correlation ID
- Reason (Optional)

Historical states must never be deleted.

---

# UI Guidelines

Recommended status indicators:

| State | Suggested Indicator |
|--------|---------------------|
| Requested | Pending |
| Pending Approval | Waiting Approval |
| Active | Active |
| Suspended | Suspended |
| Expired | Expired |
| Revoked | Revoked |

Presentation details remain implementation-specific.

---

# Related Documents

- README.md
- FEATURES.md
- EVENTS.md
- ERROR_CODES.md
- RBAC.md
- POLICIES.md

---

Status: Draft

Approval Required: Yes

Next Document:
EVENTS.md