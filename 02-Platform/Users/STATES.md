---
status: Draft
version: 1.0.0
document: USERS_STATES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
  - ../Authentication/STATES.md
approval_status: Pending
---

# User States

## Purpose

This document defines the lifecycle and operational states of User profiles within the Avonix AI platform.

Authentication states remain the responsibility of the Authentication module.

The Users module defines profile readiness, availability, and presence.

---

# Objectives

User states must:

- Represent profile availability.
- Support personalization.
- Enable collaboration.
- Preserve auditability.
- Remain independent from authentication.
- Support future extensibility.

---

# Design Principles

User profile states must be:

- Explicit
- Deterministic
- Auditable
- Backward compatible
- Identity-independent

Every User Profile has exactly one lifecycle state.

Presence is tracked separately.

---

# Profile Lifecycle

Provisioning

↓

Active

↓

Suspended

↓

Archived

---

# State Definitions

## Provisioning

The authenticated identity exists.

The platform is preparing the User profile.

Examples:

- Create profile
- Apply defaults
- Initialize preferences
- Generate metadata

Allowed Actions:

- Complete profile creation
- Retry provisioning

---

## Active

The User profile is available across the platform.

Capabilities:

- Update profile
- Change preferences
- Join Workspaces
- Receive notifications
- Personalize dashboard

---

## Suspended

The User profile is temporarily unavailable for platform operations.

Characteristics:

- Profile retained
- Preferences retained
- Personalization retained
- Workspace participation restricted according to Organization policy

Authentication status is determined separately.

---

## Archived

The profile is retained for historical purposes.

Characteristics:

- Read-only
- No personalization changes
- Historical ownership preserved
- Audit references remain valid

---

# Valid State Transitions

| From | To |
|------|----|
| Provisioning | Active |
| Active | Suspended |
| Suspended | Active |
| Active | Archived |

---

# Invalid State Transitions

The following transitions are prohibited:

- Archived → Active
- Archived → Suspended
- Provisioning → Archived

Invalid transitions should return standardized User error codes.

---

# Presence States

Presence communicates temporary availability.

Supported values:

- Online
- Away
- Busy
- Offline

Presence is not a lifecycle state.

Presence must never affect authorization decisions.

---

# Profile Visibility

Profile visibility is independent of lifecycle.

Examples:

- Public
- Organization Only
- Workspace Only
- Private

Visibility is governed by Organization policy.

---

# Events

Typical lifecycle events include:

- USER.PROFILE.CREATED
- USER.PROFILE.ACTIVATED
- USER.PROFILE.SUSPENDED
- USER.PROFILE.ARCHIVED

Presence events include:

- USER.PRESENCE.ONLINE
- USER.PRESENCE.AWAY
- USER.PRESENCE.BUSY
- USER.PRESENCE.OFFLINE

---

# Persistence

Every lifecycle transition records:

- User ID
- Previous State
- New State
- Actor ID
- Timestamp (UTC)
- Correlation ID

Historical transitions remain immutable.

---

# UI Guidelines

Recommended status labels:

| State | Label |
|--------|-------|
| Provisioning | Setting Up |
| Active | Active |
| Suspended | Suspended |
| Archived | Archived |

Presence indicators should be visually distinct from lifecycle states.

---

# Related Documents

- README.md
- FEATURES.md
- EVENTS.md
- ERROR_CODES.md
- PROFILE.md

---

Status: Draft

Approval Required: Yes

Next Document:
EVENTS.md