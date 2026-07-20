---
status: Draft
version: 1.0.0
document: WORKSPACES_STATES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
approval_status: Pending
---

# Workspace States

## Purpose

This document defines the lifecycle states for Workspaces within the Avonix AI platform.

Workspace states determine operational availability, administrative actions, and resource accessibility while ensuring deterministic lifecycle management.

---

# Objectives

Workspace states must:

- Support predictable lifecycle management.
- Preserve business continuity.
- Prevent unauthorized operations.
- Maintain complete auditability.
- Support enterprise retention policies.
- Enable future automation.

---

# Design Principles

Workspace lifecycle must be:

- Explicit
- Deterministic
- Auditable
- Version-aware
- Recoverable where supported

Every Workspace has exactly one current lifecycle state.

---

# Workspace Lifecycle

Requested

↓

Provisioning

↓

Active

↓

Archived

↓

Scheduled for Deletion

↓

Deleted

---

# State Definitions

## Requested

The Workspace creation request has been accepted.

Resources have not yet been provisioned.

Allowed Actions:

- Cancel
- Begin Provisioning

---

## Provisioning

The platform is preparing the Workspace.

Examples:

- Generate Workspace ID
- Create metadata
- Apply default settings
- Assign initial owner
- Initialize integrations

The Workspace is not yet available for normal use.

---

## Active

The Workspace is fully operational.

Allowed Actions:

- Add Members
- Remove Members
- Create Resources
- Update Settings
- Archive
- Transfer Ownership

---

## Archived

The Workspace is inactive but preserved.

Characteristics:

- Read-only access (policy dependent)
- No new resources
- No membership changes
- Historical data retained

Restoration may be permitted by Organization policy.

---

## Scheduled for Deletion

The Workspace is pending permanent deletion.

Characteristics:

- Access denied
- Restoration may be allowed during the retention period
- No modifications permitted

---

## Deleted

The Workspace has been permanently removed according to the platform's retention policy.

Deleted Workspaces cannot be restored.

---

# Valid State Transitions

| From | To |
|------|----|
| Requested | Provisioning |
| Requested | Deleted |
| Provisioning | Active |
| Active | Archived |
| Archived | Active |
| Archived | Scheduled for Deletion |
| Scheduled for Deletion | Deleted |
| Scheduled for Deletion | Archived |

---

# Invalid State Transitions

The following transitions are prohibited:

- Deleted → Active
- Deleted → Archived
- Provisioning → Archived
- Requested → Active

Invalid transitions must return standardized Workspace error codes.

---

# Resource Behavior

| Workspace State | Resource Access |
|-----------------|-----------------|
| Requested | Not Available |
| Provisioning | Not Available |
| Active | Full Access |
| Archived | Read Only (Policy Dependent) |
| Scheduled for Deletion | No Access |
| Deleted | Not Available |

Individual resource modules may impose stricter restrictions.

---

# Membership Behavior

| Workspace State | Membership Changes |
|-----------------|-------------------|
| Requested | No |
| Provisioning | No |
| Active | Yes |
| Archived | No |
| Scheduled for Deletion | No |
| Deleted | No |

---

# State Events

Typical lifecycle events include:

- WORKSPACE.REQUESTED
- WORKSPACE.CREATED
- WORKSPACE.ACTIVATED
- WORKSPACE.ARCHIVED
- WORKSPACE.RESTORED
- WORKSPACE.DELETION.SCHEDULED
- WORKSPACE.DELETED

---

# Persistence

Every state transition records:

- Previous State
- New State
- Actor
- Timestamp (UTC)
- Correlation ID
- Reason (Optional)

Historical transitions remain immutable.

---

# UI Guidelines

Recommended status indicators:

| State | Suggested Label |
|--------|-----------------|
| Requested | Pending |
| Provisioning | Setting Up |
| Active | Active |
| Archived | Archived |
| Scheduled for Deletion | Pending Deletion |
| Deleted | Deleted |

Presentation details remain implementation-specific.

---

# Related Documents

- README.md
- FEATURES.md
- EVENTS.md
- ERROR_CODES.md
- WORKSPACE_LIFECYCLE.md

---

Status: Draft

Approval Required: Yes

Next Document:
EVENTS.md