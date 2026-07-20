---
status: Draft
version: 1.0.0
document: AUTHENTICATION_EVENTS
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - FEATURES.md
  - STATES.md
approval_status: Pending
---

# Authentication Events

## Purpose

This document defines all domain events produced by the Authentication module.

Authentication events notify other platform modules whenever a meaningful authentication-related action or state transition occurs.

These events enable an event-driven architecture while keeping modules loosely coupled.

---

# Objectives

Authentication events must:

- Represent completed business actions.
- Be immutable once published.
- Be versioned for compatibility.
- Be independently consumable.
- Support asynchronous processing.

---

# Event Principles

Every event must be:

- Immutable
- Timestamped
- Versioned
- Traceable
- Idempotent
- Auditable

---

# Standard Event Schema

Every authentication event should contain:

| Field | Required |
|--------|----------|
| Event ID | ✅ |
| Event Name | ✅ |
| Event Version | ✅ |
| Timestamp (UTC) | ✅ |
| User ID | Optional |
| Organization ID | Optional |
| Workspace ID | Optional |
| Session ID | Optional |
| Device ID | Optional |
| Correlation ID | ✅ |
| Actor Type | ✅ |
| Metadata | Optional |

---

# Event Categories

## Registration

### AUTH.REGISTRATION.STARTED

Produced when:

- Registration process begins.

Possible Consumers:

- Audit Service
- Analytics

---

### AUTH.REGISTRATION.COMPLETED

Produced when:

- Registration succeeds.

Possible Consumers:

- Organizations
- Billing
- CRM
- Analytics
- Notification Service

---

### AUTH.EMAIL.VERIFIED

Produced when:

- Email ownership is confirmed.

Possible Consumers:

- User Service
- Organizations
- Automation Engine

---

# Login

### AUTH.LOGIN.SUCCEEDED

Produced when:

- Authentication completes successfully.

Possible Consumers:

- Session Service
- Analytics
- Audit Logging
- AI Risk Engine

---

### AUTH.LOGIN.FAILED

Produced when:

- Authentication fails.

Possible Consumers:

- Security Monitoring
- Rate Limiter
- Audit Logging

---

### AUTH.LOGIN.BLOCKED

Produced when:

- Login is denied due to policy.

Possible Consumers:

- Security Service
- Notifications
- Audit Logging

---

# Password

### AUTH.PASSWORD.CHANGED

Consumers:

- Session Service
- Device Service
- Audit Logging

---

### AUTH.PASSWORD.RESET.REQUESTED

Consumers:

- Notification Service
- Audit Logging

---

### AUTH.PASSWORD.RESET.COMPLETED

Consumers:

- Session Service
- Security Service

---

# MFA

### AUTH.MFA.ENABLED

Consumers:

- Security Dashboard
- Audit Logging

---

### AUTH.MFA.DISABLED

Consumers:

- Security Monitoring
- Audit Logging

---

### AUTH.MFA.COMPLETED

Consumers:

- Session Service

---

### AUTH.MFA.FAILED

Consumers:

- Risk Engine
- Audit Logging

---

# Session

### AUTH.SESSION.CREATED

### AUTH.SESSION.REFRESHED

### AUTH.SESSION.EXPIRED

### AUTH.SESSION.REVOKED

### AUTH.LOGOUT

### AUTH.LOGOUT.ALL

Consumers:

- Device Management
- Analytics
- Audit Logging

---

# Device

### AUTH.DEVICE.REGISTERED

### AUTH.DEVICE.TRUSTED

### AUTH.DEVICE.UNTRUSTED

### AUTH.DEVICE.REVOKED

Consumers:

- Security Dashboard
- Notifications
- Audit Logging

---

# Administrative

### AUTH.ACCOUNT.DISABLED

### AUTH.ACCOUNT.ENABLED

### AUTH.ACCOUNT.LOCKED

### AUTH.ACCOUNT.UNLOCKED

Consumers:

- Organizations
- Security
- Notifications

---

# Event Ordering

Where ordering matters:

1. AUTH.LOGIN.SUCCEEDED
2. AUTH.SESSION.CREATED
3. AUTH.DEVICE.REGISTERED
4. AUTH.AUDIT.CREATED

Consumers must not assume ordering across unrelated event streams.

---

# Delivery Guarantees

The platform should support:

- At-least-once delivery
- Idempotent consumers
- Retry on transient failures
- Dead-letter queue handling

---

# Event Versioning

Breaking changes require:

- New event version
- Backward compatibility strategy
- Consumer migration plan

---

# Related Documents

- STATES.md
- FEATURES.md
- AUDIT_LOGGING.md
- SECURITY.md

---

Status: Draft

Approval Required: Yes

Next Document:
ERROR_CODES.md