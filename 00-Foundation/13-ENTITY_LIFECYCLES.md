---
status: Draft
version: 1.0.0
document: ENTITY_LIFECYCLES
owner: Platform Architecture Team
last_updated: 2026-07-19
depends_on:
  - 07-DOMAIN_MODEL.md
  - 09-DECISION_PRINCIPLES.md
  - 12-OWNERSHIP_MATRIX.md
approval_status: Pending
---

# Entity Lifecycles

> "Business entities are not static. Every entity progresses through a defined lifecycle."

---

# Purpose

This document defines the canonical lifecycle of the primary business entities in Avonix AI.

Each lifecycle specifies:

- Valid states
- Allowed transitions
- Terminal states
- Recovery paths
- Ownership responsibilities

The lifecycle describes business behavior rather than implementation details.

---

# Lifecycle Principles

Every lifecycle should:

- Have a clearly defined beginning.
- Progress through explicit states.
- Prevent invalid transitions.
- Be observable.
- Be auditable.
- Support automation.
- Support recovery where appropriate.

---

# Common State Categories

Although each entity has its own lifecycle, most entities move through variations of these categories:

```
Created

↓

Configured

↓

Active

↓

Updated

↓

Paused (optional)

↓

Archived

↓

Deleted (optional)
```

Deletion should be exceptional. Archiving is generally preferred.

---

# Organization Lifecycle

```
Requested

↓

Created

↓

Configured

↓

Active

↓

Suspended

↓

Archived
```

Rules:

- Only Active organizations may operate Websites.
- Suspended organizations retain historical data.
- Archived organizations are read-only.

---

# Website Lifecycle

```
Created

↓

Ownership Verified

↓

Connected

↓

Synchronizing

↓

Healthy

↓

Warning

↓

Maintenance

↓

Archived
```

Possible transitions:

- Healthy → Warning
- Warning → Healthy
- Healthy → Maintenance
- Maintenance → Healthy

---

# Workspace Lifecycle

```
Provisioning

↓

Available

↓

Updating

↓

Available

↓

Archived
```

Workspaces should never exist without a Website.

---

# User Lifecycle

```
Invited

↓

Registered

↓

Verified

↓

Active

↓

Suspended

↓

Deactivated
```

Rules:

- Invitations expire.
- Suspended users cannot authenticate.
- Deactivated users remain in audit history.

---

# Visitor Lifecycle

```
Anonymous

↓

Identified

↓

Contact

↓

Lead

↓

Customer
```

Not every Visitor progresses beyond Anonymous.

---

# Conversation Lifecycle

```
Started

↓

Active

↓

Waiting

↓

Escalated (optional)

↓

Resolved

↓

Closed
```

Rules:

- Closed conversations become read-only.
- Escalation preserves conversation history.

---

# Lead Lifecycle

```
Created

↓

Qualified

↓

Assigned

↓

Engaged

↓

Opportunity

↓

Won

OR

Lost

OR

Archived
```

Each transition should be timestamped for reporting.

---

# Knowledge Lifecycle

```
Imported

↓

Processed

↓

Validated

↓

Indexed

↓

Published

↓

Updated

↓

Deprecated

↓

Archived
```

Only Published knowledge should be available to AI.

---

# AI Agent Lifecycle

```
Created

↓

Configured

↓

Validated

↓

Active

↓

Paused

↓

Retired
```

Paused agents retain configuration but do not process requests.

---

# Form Lifecycle

```
Draft

↓

Published

↓

Active

↓

Updated

↓

Disabled

↓

Archived
```

Published forms may receive submissions.

Disabled forms preserve historical data.

---

# Popup Lifecycle

```
Draft

↓

Scheduled

↓

Active

↓

Paused

↓

Completed

↓

Archived
```

---

# Automation Lifecycle

```
Draft

↓

Validated

↓

Enabled

↓

Running

↓

Paused

↓

Disabled

↓

Archived
```

Validation is required before activation.

---

# Notification Lifecycle

```
Generated

↓

Queued

↓

Delivered

↓

Read

↓

Archived
```

Delivery failures should enter retry workflows.

---

# Security Finding Lifecycle

```
Detected

↓

Verified

↓

Investigating

↓

Mitigated

↓

Resolved

↓

Closed
```

Every transition must produce an audit event.

---

# Website Health Lifecycle

```
Unknown

↓

Monitoring

↓

Healthy

↓

Warning

↓

Critical

↓

Recovering

↓

Healthy
```

Health is continuously recalculated.

---

# Lifecycle Rules

## Rule 1

Only the Primary Owner may change lifecycle state.

---

## Rule 2

Every state transition should be observable.

---

## Rule 3

Invalid transitions must be rejected.

Example:

```
Draft

↓

Archived

↓

Published

❌ Invalid
```

---

## Rule 4

Every transition should produce:

- Timestamp
- Actor
- Previous State
- New State
- Reason (where applicable)

---

## Rule 5

Terminal states should preserve historical records unless explicit deletion policies apply.

---

# Automation

Lifecycle transitions may trigger:

- Notifications
- Workflows
- AI actions
- Reports
- Analytics
- Integrations

The lifecycle itself remains the authoritative source of state.

---

# Relationship to Other Documents

This document defines how business entities evolve over time.

Related documents:

- DOMAIN_MODEL.md
- OWNERSHIP_MATRIX.md
- EVENT_PHILOSOPHY.md
- DECISION_PRINCIPLES.md

---

Status: Draft

Approval Required: Yes

Next Document:

14-EVENT_PHILOSOPHY.md