---
status: Draft
version: 1.0.0
document: ACTIVITY_FEED_EVENTS
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - STATES.md
approval_status: Pending
---

# Activity Feed Events

## Purpose

This document defines the canonical event model for the Activity Feed module.

Activity events describe the lifecycle of activity records from ingestion through publication, archival, and expiration. They also support monitoring, automation, analytics, and timeline synchronization.

---

# Objectives

Activity events must:

- Represent completed processing stages.
- Remain immutable.
- Support replay.
- Enable monitoring.
- Support automation.
- Be provider-independent.

---

# Event Design Principles

Every Activity event must be:

- Immutable
- Idempotent
- Replay-safe
- Versioned
- Ordered per Activity Record

Each event represents one completed lifecycle transition.

---

# Standard Event Schema

Every event should include:

| Field | Required |
|--------|----------|
| Event ID | ✅ |
| Event Name | ✅ |
| Event Version | ✅ |
| Activity ID | ✅ |
| Source Event ID | Optional |
| Entity Type | Optional |
| Entity ID | Optional |
| Organization ID | Optional |
| Workspace ID | Optional |
| Actor ID | Optional |
| Correlation ID | ✅ |
| Timestamp (UTC) | ✅ |
| Metadata | Optional |

---

# Activity Lifecycle Events

- ACTIVITY.RECEIVED
- ACTIVITY.QUEUED
- ACTIVITY.PROCESSING.STARTED
- ACTIVITY.PUBLISHED
- ACTIVITY.ARCHIVED
- ACTIVITY.EXPIRED

These events describe the normal lifecycle of an Activity Record.

---

# Failure Events

- ACTIVITY.PROCESSING.FAILED
- ACTIVITY.RETRY.SCHEDULED
- ACTIVITY.RETRY.STARTED
- ACTIVITY.RETRY.SUCCEEDED
- ACTIVITY.RETRY.EXHAUSTED

Retries must preserve the original Correlation ID and ordering guarantees.

---

# Administrative Events

- ACTIVITY.REBUILD.REQUESTED
- ACTIVITY.REBUILD.STARTED
- ACTIVITY.REBUILD.COMPLETED
- ACTIVITY.RETENTION.UPDATED
- ACTIVITY.VISIBILITY.POLICY.UPDATED

Administrative events support governance and operational management.

---

# Synchronization Events

Activity Feed consumes domain events from other modules but may publish operational events indicating synchronization progress.

Examples:

- ACTIVITY.SYNC.STARTED
- ACTIVITY.SYNC.COMPLETED
- ACTIVITY.SYNC.FAILED

These events relate to feed processing rather than business logic.

---

# Event Ordering

Events should preserve ordering for each Activity Record.

Example:

ACTIVITY.RECEIVED

↓

ACTIVITY.QUEUED

↓

ACTIVITY.PROCESSING.STARTED

↓

ACTIVITY.PUBLISHED

↓

ACTIVITY.ARCHIVED

---

# Event Consumers

Activity events may be consumed by:

- Timeline APIs
- Analytics
- Monitoring
- Automation
- Audit Logging
- Search
- Notifications
- Platform Operations

---

# Correlation

Every activity should retain the Correlation ID from the originating domain event.

Example:

CRM.LEAD.CREATED

↓

ACTIVITY.PUBLISHED

↓

NOTIFICATION.CREATED

↓

SEARCH.DOCUMENT.INDEXED

All related operations can be traced using the same Correlation ID.

---

# Failure Handling

Consumers should:

- Ignore duplicate events.
- Preserve ordering.
- Retry transient failures.
- Reject unsupported versions.
- Record processing failures.

---

# Versioning

Events follow semantic versioning.

Breaking schema changes require a new event version.

Consumers should safely ignore unknown fields.

---

# Privacy

Activity events must never expose:

- Authentication credentials
- Authorization decisions
- Secrets
- Internal infrastructure
- Provider implementation details

Only canonical activity metadata should be published.

---

# Related Documents

- README.md
- STATES.md
- ERROR_CODES.md
- SECURITY.md
- AUDIT_LOGGING.md
- FAQ.md

---

Status: Draft

Approval Required: Yes

Next Document:
ERROR_CODES.md