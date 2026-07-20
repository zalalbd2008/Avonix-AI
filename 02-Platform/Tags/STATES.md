---
status: Draft
version: 1.0.0
document: TAGS_STATES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
approval_status: Pending
---

# Tag States

## Purpose

This document defines the lifecycle of tag definitions within the Avonix AI Tags module.

The lifecycle governs how tags are created, activated, archived, restored, and permanently removed while remaining independent from the entities that use them.

---

# Objectives

The tag lifecycle must:

- Preserve classification consistency.
- Prevent invalid state transitions.
- Support auditability.
- Allow safe reuse.
- Enable long-term governance.

---

# Design Principles

Tag states must be:

- Deterministic
- Auditable
- Recoverable where appropriate
- Independent of business modules
- Backward compatible

---

# State Machine

```
Draft
   │
   ▼
Active
   │
   ├────────► Archived
   │
   ├────────► Deprecated
   │
   ▼
Updated
   │
   ▼
Active

Archived
   │
   ▼
Restored
   │
   ▼
Active

Deprecated
   │
   ├────────► Active
   │
   ▼
Archived

Archived
   │
   ▼
Deleted
```

---

# State Definitions

## Draft

The tag exists but is not yet available for assignment.

Characteristics:

- Editable
- Not assignable
- Not visible to business modules

---

## Active

The tag is available for assignment.

Characteristics:

- Searchable
- Assignable
- Visible within scope
- Available for automation

---

## Updated

Metadata has been modified.

Examples:

- Name changed
- Color changed
- Category changed
- Description updated

The tag returns to Active after validation.

---

## Archived

The tag is no longer available for new assignments.

Characteristics:

- Existing assignments remain valid.
- Hidden from normal selection.
- Recoverable.

---

## Deprecated

The tag remains valid for historical references but should no longer be used for new assignments.

Characteristics:

- Existing assignments remain.
- New assignments are prohibited.
- Replacement tags may be suggested.

---

## Restored

An archived tag has been restored.

Characteristics:

- Original Tag ID preserved.
- Historical assignments remain intact.

The tag returns to the Active state.

---

## Deleted

The tag definition has been permanently removed according to platform policy.

Characteristics:

- Terminal state.
- Not recoverable.
- Existing assignment handling depends on platform policy.

---

# Assignment Lifecycle

Assignments have a simpler lifecycle.

```
Assigned
     │
     ▼
Updated
     │
     ▼
Removed
```

Assignments do not affect the state of the Tag Definition.

---

# Valid State Transitions

| From | To |
|------|----|
| Draft | Active |
| Active | Updated |
| Updated | Active |
| Active | Archived |
| Archived | Restored |
| Restored | Active |
| Active | Deprecated |
| Deprecated | Active |
| Deprecated | Archived |
| Archived | Deleted |

---

# Invalid State Transitions

The following transitions are prohibited:

| From | To |
|------|----|
| Deleted | Any |
| Draft | Archived |
| Draft | Deleted |
| Active | Deleted |
| Updated | Deleted |

Deleted is a terminal state.

---

# Governance Rules

- Archived tags cannot receive new assignments.
- Deprecated tags remain valid for historical reporting.
- Active tags are the only tags eligible for new assignments.
- Deleting tags should be restricted by platform policy.

---

# Assignment Rules

Assignments:

- Reference Tag ID only.
- Reference Entity Type.
- Reference Entity ID.
- Generate audit records.
- May trigger automation workflows.

Assignments never own business entities.

---

# State Events

Typical lifecycle events include:

- TAG.CREATED
- TAG.ACTIVATED
- TAG.UPDATED
- TAG.ARCHIVED
- TAG.RESTORED
- TAG.DEPRECATED
- TAG.DELETED
- TAG.ASSIGNED
- TAG.UNASSIGNED

---

# Persistence

Each state transition should record:

- Tag ID
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
- ERROR_CODES.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Document:
EVENTS.md