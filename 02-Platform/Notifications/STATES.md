---
status: Draft
version: 1.0.0
document: NOTIFICATIONS_STATES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
approval_status: Pending
---

# Notification States

## Purpose

This document defines the lifecycle of notifications managed by the Avonix AI Notifications module.

The lifecycle governs how notifications move from creation through delivery, expiration, cancellation, or archival while remaining independent of business modules and delivery providers.

---

# Objectives

The notification lifecycle must:

- Ensure reliable delivery.
- Support retries.
- Enable scheduling.
- Preserve auditability.
- Respect user preferences.
- Remain channel-independent.

---

# Design Principles

Notification states must be:

- Deterministic
- Auditable
- Retry-aware
- Provider-independent
- Policy-driven
- Extensible

---

# Notification Lifecycle

```
Draft
   │
   ▼
Scheduled
   │
   ├────────► Cancelled
   │
   ▼
Queued
   │
   ▼
Processing
   │
   ▼
Delivered
   │
   ├────────► Read
   │
   ▼
Archived

Queued
   │
   ▼
Failed
   │
   ▼
Retry Scheduled
   │
   ▼
Queued

Delivered
   │
   ▼
Expired
```

---

# State Definitions

## Draft

Notification exists but has not yet entered the delivery pipeline.

Characteristics:

- Editable
- Not visible to recipients
- No delivery attempts

---

## Scheduled

Notification is waiting for its scheduled delivery time.

Characteristics:

- Delivery delayed
- Can be cancelled
- No delivery attempts

---

## Queued

Notification is ready for delivery.

Characteristics:

- Awaiting processing
- Channel selection completed
- Eligible for retry

---

## Processing

Delivery is actively being attempted.

Characteristics:

- Provider request in progress
- Awaiting delivery result
- Not editable

---

## Delivered

The notification has been successfully delivered to the target channel.

Characteristics:

- Delivery confirmed
- Read tracking may begin
- Immutable

---

## Read

The recipient has viewed or opened the notification.

Characteristics:

- Only available for supported channels
- Read timestamp recorded

---

## Failed

Delivery attempt failed.

Characteristics:

- Failure reason recorded
- Retry policy evaluated
- Audit generated

---

## Retry Scheduled

The notification is waiting for another delivery attempt.

Characteristics:

- Retry count incremented
- Delay determined by retry policy

---

## Cancelled

Scheduled notification cancelled before delivery.

Characteristics:

- No future delivery attempts
- Terminal state

---

## Expired

Notification is no longer relevant.

Characteristics:

- Delivery no longer attempted
- Policy-driven
- Terminal state

---

## Archived

Notification retained for historical purposes.

Characteristics:

- Read-only
- Searchable
- Auditable

---

# Delivery Attempt Lifecycle

Each delivery channel maintains its own attempt lifecycle.

```
Pending
    │
    ▼
Sending
    │
 ┌──┴────────┐
 ▼           ▼
Delivered   Failed
               │
               ▼
         Retry Scheduled
               │
               ▼
            Sending
```

A single notification may contain multiple independent delivery attempts.

Example:

Email → Delivered

SMS → Failed

Push → Retry Scheduled

---

# Valid State Transitions

| From | To |
|------|----|
| Draft | Scheduled |
| Draft | Queued |
| Scheduled | Queued |
| Scheduled | Cancelled |
| Queued | Processing |
| Processing | Delivered |
| Processing | Failed |
| Failed | Retry Scheduled |
| Retry Scheduled | Queued |
| Delivered | Read |
| Delivered | Archived |
| Delivered | Expired |
| Read | Archived |

---

# Invalid State Transitions

| From | To |
|------|----|
| Delivered | Draft |
| Read | Processing |
| Archived | Delivered |
| Cancelled | Any |
| Expired | Any |

Cancelled and Expired are terminal states.

---

# Retry Rules

Retry behavior is controlled by policy.

Typical factors include:

- Maximum retry count
- Retry interval
- Channel type
- Failure reason

Retries generate independent delivery attempts.

---

# Read Tracking Rules

Read tracking depends on channel capability.

Examples:

Supported:

- In-App
- Push
- Email (provider dependent)

Not typically supported:

- SMS
- Webhooks

---

# State Events

Typical lifecycle events include:

- NOTIFICATION.CREATED
- NOTIFICATION.SCHEDULED
- NOTIFICATION.QUEUED
- NOTIFICATION.PROCESSING.STARTED
- NOTIFICATION.DELIVERED
- NOTIFICATION.READ
- NOTIFICATION.FAILED
- NOTIFICATION.RETRY.SCHEDULED
- NOTIFICATION.CANCELLED
- NOTIFICATION.EXPIRED
- NOTIFICATION.ARCHIVED

---

# Persistence

Each state transition should record:

- Notification ID
- Previous State
- New State
- Recipient ID
- Channel
- Timestamp (UTC)
- Correlation ID

---

# Related Documents

- README.md
- FEATURES.md
- EVENTS.md
- ERROR_CODES.md
- CHANNELS.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Document:
EVENTS.md