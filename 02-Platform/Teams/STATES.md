---
status: Draft
version: 1.0.0
document: TEAMS_STATES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
approval_status: Pending
---

# Team States

## Purpose

This document defines the lifecycle states of a Team within Avonix AI.

It provides the canonical state machine for team provisioning, operational management, archival, restoration, and deletion.

---

# Objectives

The Team state model must:

- Ensure predictable lifecycle behavior.
- Prevent invalid transitions.
- Protect assigned resources.
- Support delegated administration.
- Maintain auditability.

---

# Team Lifecycle

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

# Team States

## REQUESTED

Description

A request to create a Team has been received.

Allowed Actions

- Validate request
- Allocate Team ID
- Reject request

Exit Conditions

- Provisioning begins
- Request rejected

---

## PROVISIONING

Description

The platform is creating the Team.

Provisioning includes:

- Team record
- Initial owner assignment
- Default settings
- Initial audit record

Members cannot access the Team during provisioning.

---

## ACTIVE

Description

The Team is fully operational.

Allowed Actions

- Add members
- Remove members
- Assign resources
- Update settings
- Transfer ownership
- Archive Team

---

## ARCHIVED

Description

The Team is inactive but retained.

Allowed Actions

- Read-only access
- Export metadata
- Restore Team

Blocked Actions

- Add members
- Assign resources
- Update settings

---

## SCHEDULED_FOR_DELETION

Description

The Team is waiting for permanent deletion.

Purpose

- Prevent accidental deletion.
- Allow recovery during retention period.

Allowed Actions

- Cancel deletion
- Export Team metadata

Blocked Actions

- Normal Team operations

---

## DELETED

Description

The Team has been permanently removed.

Characteristics

- Terminal state
- Team ID never reused
- Audit history preserved

---

# State Transition Matrix

| Current State | Event | Next State |
|---------------|-------|------------|
| Requested | Provision Started | Provisioning |
| Provisioning | Provision Completed | Active |
| Active | Archive | Archived |
| Archived | Restore | Active |
| Active | Delete Requested | Scheduled for Deletion |
| Archived | Delete Requested | Scheduled for Deletion |
| Scheduled for Deletion | Deletion Cancelled | Active |
| Scheduled for Deletion | Retention Expired | Deleted |

---

# Invalid State Transitions

The following transitions are prohibited:

- Deleted → Active
- Deleted → Archived
- Requested → Active
- Provisioning → Archived
- Archived → Provisioning
- Active → Requested

---

# State Persistence

Persist at minimum:

- Team Status
- Team Owner(s)
- Organization ID
- Created Timestamp
- Archived Timestamp
- Deletion Schedule
- Last State Change

---

# State Events

Every transition publishes a domain event.

Examples:

- TEAM.CREATED
- TEAM.ACTIVATED
- TEAM.ARCHIVED
- TEAM.RESTORED
- TEAM.DELETION.SCHEDULED
- TEAM.DELETED

---

# Resource Behavior

| Team State | Members | Resources | Settings |
|------------|:-------:|:---------:|:--------:|
| Requested | ❌ | ❌ | ❌ |
| Provisioning | ❌ | ❌ | ❌ |
| Active | ✅ | ✅ | ✅ |
| Archived | Read Only | Read Only | Read Only |
| Scheduled for Deletion | ❌ | Export Only | ❌ |
| Deleted | ❌ | ❌ | ❌ |

---

# UI Guidelines

The interface should clearly communicate Team status.

Examples:

- Provisioning → Display setup progress.
- Archived → Read-only interface.
- Scheduled for Deletion → Recovery countdown.
- Deleted → Team unavailable.

---

# Related Documents

- FEATURES.md
- EVENTS.md
- TEAM_LIFECYCLE.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Document:
EVENTS.md