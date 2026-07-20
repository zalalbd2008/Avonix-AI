---
status: Draft
version: 1.0.0
document: WORKSPACE_MEMBERSHIP
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - WORKSPACE_LIFECYCLE.md
  - ../Organizations/MEMBERSHIP.md
  - ../Permissions/RBAC.md
approval_status: Pending
---

# Workspace Membership

## Purpose

This document defines how members participate in a Workspace.

Workspace Membership determines who can access, collaborate, and operate within a Workspace while remaining governed by Organization membership and the Permissions module.

---

# Design Principles

Workspace Membership must be:

- Organization-scoped
- Explicit
- Auditable
- Least-privilege by default
- Independent from Team membership
- Governed by centralized authorization

Workspace Membership grants access to a Workspace.

Permissions determine what actions a member may perform.

---

# Core Concepts

## Workspace Member

A Workspace Member is an active Organization Member who has been granted access to a specific Workspace.

A user may belong to multiple Workspaces within the same Organization.

---

## Membership Scope

Membership applies only to one Workspace.

Membership never crosses Organization boundaries.

---

## Membership Dependency

Workspace Membership requires:

- Authenticated User
- Active Organization Membership
- Workspace in Active state

If any prerequisite becomes invalid, Workspace access must be revoked.

---

# Membership Lifecycle

Invited

↓

Pending Acceptance

↓

Active

↓

Suspended

↓

Removed

Every membership exists in exactly one lifecycle state.

---

# Membership States

## Invited

An invitation has been created but not yet accepted.

Allowed Actions:

- Resend Invitation
- Cancel Invitation

---

## Pending Acceptance

The invitation has been delivered and awaits user action.

Allowed Actions:

- Accept
- Decline

---

## Active

The member has access to the Workspace.

Allowed Actions:

- Access Workspace
- Use Resources
- Receive Assigned Roles
- Participate in Collaboration

---

## Suspended

Access is temporarily disabled.

Characteristics:

- Authentication remains valid.
- Workspace access is denied.
- Assigned roles are retained but inactive.

---

## Removed

The membership has been terminated.

Characteristics:

- Workspace access revoked.
- Membership history retained for auditing.
- Rejoining requires a new membership.

---

# Membership Rules

## Rule 1

Every Workspace Member must be an active Organization Member.

---

## Rule 2

Removing Organization Membership automatically invalidates Workspace Membership.

---

## Rule 3

Workspace Membership does not automatically create Team Membership.

---

## Rule 4

Permissions are evaluated through the Permissions module.

Workspace Membership alone never grants authorization.

---

## Rule 5

A member may belong to multiple Workspaces within the same Organization.

---

# Role Assignment

Workspace Members may receive one or more Workspace-scoped Roles.

Examples:

- Workspace Owner
- Workspace Administrator
- Editor
- Contributor
- Viewer

Role definitions belong to the Permissions module.

---

# Ownership

Workspace Owners are also Workspace Members.

Ownership responsibilities include:

- Workspace administration
- Membership management
- Settings management
- Ownership transfer

Ownership does not bypass authorization policies.

---

# Membership Events

Typical events include:

- WORKSPACE.MEMBER.INVITED
- WORKSPACE.MEMBER.ACCEPTED
- WORKSPACE.MEMBER.ADDED
- WORKSPACE.MEMBER.SUSPENDED
- WORKSPACE.MEMBER.RESTORED
- WORKSPACE.MEMBER.REMOVED

---

# Audit Requirements

Every membership operation records:

- Workspace ID
- Organization ID
- Member ID
- Actor ID
- Previous State
- New State
- Timestamp (UTC)
- Correlation ID
- Reason (Optional)

Audit records are immutable.

---

# Security

Membership operations must:

- Validate Organization Membership
- Validate Permissions
- Prevent cross-Organization access
- Record administrative actions
- Enforce least privilege

---

# Related Documents

- README.md
- WORKSPACE_LIFECYCLE.md
- SETTINGS.md
- SECURITY.md
- AUDIT_LOGGING.md
- ../Organizations/MEMBERSHIP.md
- ../Permissions/RBAC.md

---

Status: Draft

Approval Required: Yes

Next Document:
SETTINGS.md