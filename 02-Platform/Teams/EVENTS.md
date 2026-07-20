---
status: Draft
version: 1.0.0
document: TEAMS_EVENTS
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - FEATURES.md
  - STATES.md
approval_status: Pending
---

# Team Events

## Purpose

This document defines all domain events produced by the Teams module.

Team events notify other platform modules whenever the lifecycle, ownership, membership, configuration, or resource assignment of a Team changes.

These events enable a loosely coupled, event-driven platform architecture.

---

# Objectives

Team events must:

- Represent completed business actions.
- Be immutable.
- Be versioned.
- Support asynchronous processing.
- Maintain tenant isolation.
- Enable reliable integrations.

---

# Event Principles

Every Team event must be:

- Immutable
- Timestamped
- Versioned
- Traceable
- Idempotent
- Auditable

---

# Standard Event Schema

Every Team event should include:

| Field | Required |
|--------|----------|
| Event ID | ✅ |
| Event Name | ✅ |
| Event Version | ✅ |
| Timestamp (UTC) | ✅ |
| Organization ID | ✅ |
| Team ID | ✅ |
| Actor ID | Optional |
| Correlation ID | ✅ |
| Actor Type | ✅ |
| Metadata | Optional |

---

# Event Categories

## Lifecycle

### TEAM.CREATED

Produced when:

- Team provisioning completes successfully.

Consumers

- Audit Logging
- Analytics
- Notification Service

---

### TEAM.ACTIVATED

Produced when:

- Team becomes operational.

Consumers

- Permissions
- Workspaces
- Automation

---

### TEAM.ARCHIVED

Produced when:

- Team enters archive state.

Consumers

- Permissions
- Resource Services
- Analytics

---

### TEAM.RESTORED

Produced when:

- Archived Team is restored.

Consumers

- Permissions
- Workspaces
- Automation

---

### TEAM.DELETION.SCHEDULED

Produced when:

- Team is scheduled for deletion.

Consumers

- Notification Service
- Resource Cleanup

---

### TEAM.DELETED

Produced when:

- Team is permanently deleted.

Consumers

- Cleanup Services
- Audit Logging
- Analytics

---

# Membership

### TEAM.MEMBER.ADDED

Consumers

- Permissions
- Analytics
- Notification Service

---

### TEAM.MEMBER.REMOVED

Consumers

- Permissions
- Automation
- Audit Logging

---

### TEAM.MEMBER.SUSPENDED

Consumers

- Permissions
- Security

---

### TEAM.MEMBER.RESTORED

Consumers

- Permissions
- Automation

---

# Ownership

### TEAM.OWNER.ASSIGNED

Consumers

- Permissions
- Notifications

---

### TEAM.OWNER.TRANSFERRED

Consumers

- Permissions
- Audit Logging

---

# Settings

### TEAM.SETTINGS.UPDATED

Consumers

- UI
- Automation
- Audit Logging

---

### TEAM.VISIBILITY.UPDATED

Consumers

- Search
- Discovery
- Permissions

---

# Resources

### TEAM.RESOURCE.ASSIGNED

Produced when:

- A resource is assigned to a Team.

Consumers

- CRM
- Forms
- AI
- Automation

---

### TEAM.RESOURCE.UNASSIGNED

Produced when:

- A resource is removed from a Team.

Consumers

- CRM
- Forms
- AI
- Automation

---

# Event Ordering

Recommended order:

1. TEAM.CREATED
2. TEAM.OWNER.ASSIGNED
3. TEAM.ACTIVATED
4. TEAM.MEMBER.ADDED

Consumers must not assume ordering between unrelated event streams.

---

# Delivery Guarantees

The platform should support:

- At-least-once delivery
- Idempotent consumers
- Automatic retries
- Dead-letter queues
- Event replay (where supported)

---

# Event Versioning

Breaking changes require:

- New event version
- Consumer migration documentation
- Backward compatibility strategy

---

# Related Documents

- FEATURES.md
- STATES.md
- TEAM_LIFECYCLE.md
- AUDIT_LOGGING.md
- SECURITY.md

---

Status: Draft

Approval Required: Yes

Next Document:
ERROR_CODES.md