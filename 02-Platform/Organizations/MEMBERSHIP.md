---
status: Draft
version: 1.0.0
document: ORGANIZATION_MEMBERSHIP
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - ORGANIZATION_LIFECYCLE.md
approval_status: Pending
---

# Organization Membership

## Purpose

This document defines how users become members of an Organization, how memberships are managed throughout their lifecycle, and how membership interacts with authentication, permissions, workspaces, and teams.

A membership represents the relationship between a User and an Organization.

---

# Objectives

The membership system must:

- Support secure collaboration.
- Maintain tenant isolation.
- Allow multiple organizations per user.
- Support invitation-based onboarding.
- Maintain complete membership history.
- Enable enterprise administration.

---

# Core Principles

A membership:

- Belongs to exactly one Organization.
- References exactly one User.
- Exists independently of authentication sessions.
- May be active or inactive.
- Does not define permissions directly.

Permissions are managed by the Permissions module.

---

# Membership Lifecycle

Invitation Sent

↓

Invitation Accepted

↓

Membership Created

↓

Active

↓

Suspended (Optional)

↓

Restored

↓

Removed

---

# Membership States

## Pending

Invitation exists.

Membership has not yet been created.

---

## Active

User is an active member.

Allowed actions depend on assigned permissions.

---

## Suspended

Membership exists but access is temporarily restricted.

User authentication remains valid, but organization access is denied.

---

## Removed

Membership has been revoked.

The user no longer belongs to the organization.

Historical records remain for auditing.

---

# Membership Creation

Membership may be created by:

- Accepting an invitation.
- Organization provisioning (Owner only).
- Administrative import (future).
- SCIM synchronization (future Enterprise).

---

# Membership Properties

Each membership should include:

- Membership ID
- Organization ID
- User ID
- Status
- Joined At
- Invited By
- Invitation ID (if applicable)
- Last Updated
- Removal Timestamp (optional)

---

# Membership Rules

Each membership must satisfy:

- One user may belong to multiple organizations.
- One organization may have multiple users.
- Duplicate memberships are not allowed.
- Membership IDs are immutable.
- Removed memberships cannot be reactivated; a new membership record is created unless organization policy specifies restoration.

---

# Owner Membership

Every organization must always have at least one Owner.

Rules:

- An Owner cannot remove themselves unless ownership is transferred first.
- Ownership transfer must complete before the previous Owner membership changes.
- Organizations must never exist without an Owner.

---

# Suspension

A membership may be suspended due to:

- Administrative action.
- Security concerns.
- Policy violations.
- Compliance requirements.

Effects:

- Organization access blocked.
- Sessions for that organization revoked.
- Audit event generated.

---

# Removal

Removing a membership should:

- Revoke organization-specific access.
- End active organization sessions.
- Preserve audit history.
- Retain ownership of historical activity for reporting.

Removing a membership does not delete the User account.

---

# Membership Limits

Organizations may configure:

- Maximum members.
- Invitation limits.
- Guest access (future).
- External collaborator support (future).

Limits may depend on the organization's subscription plan.

---

# Audit Requirements

Record:

- Membership Created
- Membership Activated
- Membership Suspended
- Membership Restored
- Membership Removed
- Ownership Changed

---

# Related Documents

- README.md
- INVITATIONS.md
- SECURITY.md
- AUDIT_LOGGING.md
- Permissions/README.md

---

Status: Draft

Approval Required: Yes

Next Document:
INVITATIONS.md