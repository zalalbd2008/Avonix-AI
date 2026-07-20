---
status: Draft
version: 1.0.0
document: TEAM_MEMBERSHIP
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - TEAM_LIFECYCLE.md
  - ../Organizations/MEMBERSHIP.md
approval_status: Pending
---

# Team Membership

## Purpose

This document defines how Organization Members become Team Members, how Team Membership is managed throughout its lifecycle, and how it integrates with Permissions, Workspaces, and Resources.

A Team Membership represents the relationship between an Organization Member and a Team.

---

# Objectives

The Team Membership model must:

- Support structured collaboration.
- Maintain Organization boundaries.
- Enable delegated administration.
- Preserve historical records.
- Support future enterprise features.
- Maintain complete auditability.

---

# Core Principles

A Team Membership:

- Belongs to exactly one Team.
- References exactly one Organization Membership.
- Cannot exist without an active Organization Membership.
- Exists independently of authentication sessions.
- Does not directly grant permissions.

Authorization is managed by the Permissions module.

---

# Relationship Model

Organization

↓

Organization Membership

↓

Team

↓

Team Membership

A Team Membership extends an Organization Membership rather than replacing it.

---

# Membership Lifecycle

Assigned

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

## Assigned

The Team Membership has been created but onboarding actions may still be pending.

---

## Active

The member actively participates in the Team.

Allowed actions depend on assigned permissions.

---

## Suspended

The member remains assigned to the Team but cannot participate in Team activities.

Organization Membership remains unaffected unless separately suspended.

---

## Removed

The Team Membership has been revoked.

Historical records remain available for auditing.

---

# Membership Creation

A Team Membership may be created by:

- Team Owner
- Organization Administrator
- Automated Workflow
- Future SCIM Synchronization

Requirements

- Organization must be Active.
- Team must be Active.
- User must already have an active Organization Membership.

---

# Membership Properties

Each Team Membership should include:

- Team Membership ID
- Team ID
- Organization Membership ID
- Status
- Joined At
- Added By
- Last Updated
- Removed At (Optional)

---

# Membership Rules

- Duplicate Team Memberships are prohibited.
- A Team Membership cannot outlive its Organization Membership.
- One Organization Member may belong to multiple Teams.
- Membership identifiers are immutable.

---

# Team Owners

Every active Team must always have at least one Owner.

Rules

- An Owner cannot remove themselves if they are the last remaining Owner.
- Ownership transfer must complete before ownership changes take effect.
- Owner changes must generate audit events.

---

# Suspension

A Team Membership may be suspended due to:

- Administrative action
- Policy violation
- Temporary project restriction

Effects

- Team access revoked.
- Assigned Team responsibilities paused.
- Audit event generated.

---

# Removal

Removing a Team Membership should:

- Remove Team-specific access.
- Preserve activity history.
- Preserve audit history.
- Leave Organization Membership unchanged.

---

# Resource Access

Removing a Team Membership does not automatically:

- Transfer resource ownership.
- Delete assigned resources.
- Remove Organization access.

Resource reassignment is handled by consuming modules.

---

# Limits

Organizations may configure:

- Maximum Teams per Member
- Maximum Members per Team
- Department-specific restrictions
- External collaborator policies (Future)

Limits may vary by subscription plan.

---

# Audit Requirements

Record:

- Team Membership Created
- Team Membership Activated
- Team Membership Suspended
- Team Membership Restored
- Team Membership Removed
- Team Ownership Changed

---

# Related Events

- TEAM.MEMBER.ADDED
- TEAM.MEMBER.REMOVED
- TEAM.MEMBER.SUSPENDED
- TEAM.MEMBER.RESTORED
- TEAM.OWNER.TRANSFERRED

---

# Related Documents

- TEAM_LIFECYCLE.md
- EVENTS.md
- SECURITY.md
- AUDIT_LOGGING.md
- ../Organizations/MEMBERSHIP.md

---

Status: Draft

Approval Required: Yes

Next Document:
SETTINGS.md