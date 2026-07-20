---
status: Draft
version: 1.0.0
document: ACTIVITY_FEED_STATES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
approval_status: Pending
---

# Activity Feed States

## Purpose

This document defines the canonical lifecycle states for Activity Records within the Avonix AI platform.

Activities are immutable projections of domain events. While the underlying activity content never changes, an activity record progresses through a controlled processing lifecycle before becoming available to users.

---

# Objectives

The lifecycle must:

- Ensure reliable event processing.
- Support asynchronous generation.
- Enable retries.
- Prevent duplicate activities.
- Support archival.
- Preserve historical integrity.

---

# Design Principles

Activity lifecycle states should be:

- Event-driven
- Immutable after publication
- Replay-safe
- Idempotent
- Eventually consistent

An activity represents a completed historical event and must never be edited after publication.

---

# Activity Lifecycle

```
Received

↓

Queued

↓

Processing

↓

Published

├── Archived

└── Expired (Optional)
```

---

# State Definitions

## Received

A valid domain event has been accepted for activity generation.

Characteristics:

- Event validated
- Correlation ID assigned
- Awaiting processing

---

## Queued

The activity request is waiting for processing.

Characteristics:

- Durable queue
- Retry eligible
- FIFO ordering where applicable

---

## Processing

The Activity Processor is generating the activity record.

Operations include:

- Event normalization
- Metadata enrichment
- Visibility evaluation
- Timeline preparation

---

## Published

The activity is visible through timeline APIs.

Characteristics:

- Immutable
- Searchable
- Filterable
- Chronologically ordered

Published activities are considered complete.

---

## Archived

The activity has been removed from active timelines but remains available for historical retrieval according to retention policy.

Characteristics:

- Read-only
- Not shown in default feeds
- Retained for historical purposes

---

## Expired (Optional)

The activity has reached the end of its configured retention period and is no longer available through normal platform interfaces.

Expiration behavior depends on organizational retention policies.

---

# Failure Lifecycle

```
Processing

↓

Failed

↓

Retry Scheduled

↓

Queued

↓

Processing
```

Retries should only occur for transient failures.

Permanent failures should generate operational alerts.

---

# Failure States

## Failed

Activity generation failed.

Possible causes:

- Invalid event payload
- Missing entity
- Dependency unavailable
- Processing error

---

## Retry Scheduled

A retry has been scheduled according to platform retry policy.

Retry attempts should preserve:

- Event ID
- Correlation ID
- Ordering guarantees

---

# State Transition Rules

| Current State | Allowed Next State |
|---------------|-------------------|
| Received | Queued |
| Queued | Processing |
| Processing | Published |
| Processing | Failed |
| Failed | Retry Scheduled |
| Retry Scheduled | Queued |
| Published | Archived |
| Published | Expired (Optional) |

All other transitions are invalid.

---

# Immutability Rules

After publication:

- Activity text must not change.
- Actor must not change.
- Timestamp must not change.
- Correlation ID must not change.
- Original metadata must remain intact.

Corrections should generate new activities rather than modifying existing ones.

---

# Visibility Lifecycle

Visibility is evaluated before publication.

Visibility may include:

- Organization
- Workspace
- Team
- User
- Permission policies

Published visibility should remain stable unless authorization rules explicitly require reevaluation.

---

# Retention

Retention policies may define:

- Active period
- Archive period
- Permanent retention
- Automatic expiration

Retention configuration is managed by platform policy.

---

# Related Documents

- README.md
- FEATURES.md
- EVENTS.md
- ERROR_CODES.md
- SECURITY.md
- AUDIT_LOGGING.md
- FAQ.md

---

Status: Draft

Approval Required: Yes

Next Document:
EVENTS.md