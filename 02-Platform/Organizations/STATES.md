---
status: Draft
version: 1.0.0
document: ORGANIZATION_STATES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
approval_status: Pending
---

# Organization States

## Purpose

This document defines the lifecycle states of an Organization within Avonix AI.

It provides the canonical state machine for organization provisioning, administration, billing eligibility, security enforcement, and resource accessibility.

---

# Objectives

The organization state model must:

- Ensure predictable lifecycle behavior.
- Prevent invalid transitions.
- Protect business resources.
- Support enterprise administration.
- Enable automation and auditability.

---

# Organization Lifecycle

Requested

↓

Provisioning

↓

Active

↓

Suspended

↓

Reactivated

↓

Archived

↓

Scheduled for Deletion

↓

Deleted

---

# Organization States

## REQUESTED

Description

An organization creation request has been received but provisioning has not started.

Allowed Actions

- Validate request
- Allocate identifier
- Reject request

Exit Conditions

- Provisioning begins
- Request rejected

---

## PROVISIONING

Description

Platform resources are being created.

Provisioning includes:

- Organization record
- Default workspace
- Owner membership
- Default settings
- Default policies
- Initial audit records

Users cannot access the organization during provisioning.

---

## ACTIVE

Description

Organization is fully operational.

Allowed Actions

- Invite members
- Create resources
- Manage settings
- Access APIs
- Manage billing
- Configure policies

---

## SUSPENDED

Description

Organization access has been temporarily restricted.

Possible Causes

- Billing issues
- Administrative action
- Security incident
- Compliance review

Allowed Actions

- Billing updates
- Administrative review
- Owner communication

Blocked Actions

- Resource creation
- User access
- API operations (policy dependent)

---

## REACTIVATED

Description

Organization has returned to Active status after suspension.

System Actions

- Restore access
- Resume automation
- Notify members
- Record audit event

Next State

Active

---

## ARCHIVED

Description

Organization is inactive but retained for historical purposes.

Allowed Actions

- Read-only access (policy dependent)
- Export data
- Restore (if allowed)

Blocked Actions

- Resource creation
- Member invitations
- Configuration changes

---

## SCHEDULED_FOR_DELETION

Description

Organization has entered a deletion waiting period.

Purpose

- Prevent accidental deletion.
- Allow recovery during retention window.

Allowed Actions

- Cancel deletion
- Export organization data

Blocked Actions

- Normal platform operations

---

## DELETED

Description

Organization has been permanently removed according to platform retention policies.

Characteristics

- Immutable terminal state
- Identifier is never reused
- Audit records remain according to retention policy

---

# State Transition Matrix

| Current State | Event | Next State |
|---------------|-------|------------|
| Requested | Provision Started | Provisioning |
| Provisioning | Provision Completed | Active |
| Active | Suspend | Suspended |
| Suspended | Reactivate | Reactivated |
| Reactivated | Activation Complete | Active |
| Active | Archive | Archived |
| Archived | Restore | Active |
| Active | Delete Requested | Scheduled for Deletion |
| Scheduled for Deletion | Retention Expired | Deleted |
| Scheduled for Deletion | Deletion Cancelled | Active |

---

# Invalid State Transitions

The following transitions are prohibited:

- Deleted → Active
- Deleted → Archived
- Suspended → Deleted
- Requested → Active
- Provisioning → Archived
- Archived → Suspended

---

# State Persistence

Persist at minimum:

- Organization Status
- Owner ID
- Creation Timestamp
- Suspension Reason
- Archive Timestamp
- Deletion Schedule
- Last State Change

---

# State Events

Each state transition should emit a domain event.

Examples:

- OrganizationCreated
- OrganizationProvisioned
- OrganizationActivated
- OrganizationSuspended
- OrganizationReactivated
- OrganizationArchived
- OrganizationDeletionScheduled
- OrganizationDeleted

---

# UI Guidelines

The interface should clearly communicate organization status.

Examples:

- Provisioning → Display setup progress.
- Suspended → Display suspension notice.
- Archived → Read-only interface.
- Scheduled for Deletion → Countdown with recovery option.
- Deleted → Resource unavailable.

---

# Related Documents

- FEATURES.md
- EVENTS.md
- ORGANIZATION_LIFECYCLE.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Document:
EVENTS.md