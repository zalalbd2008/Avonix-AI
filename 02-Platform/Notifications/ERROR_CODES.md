---
status: Draft
version: 1.0.0
document: NOTIFICATIONS_ERROR_CODES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
  - STATES.md
approval_status: Pending
---

# Notification Error Codes

## Purpose

This document defines the canonical error codes for the Notifications module.

Error codes provide a consistent mechanism for identifying notification failures across APIs, background workers, delivery providers, administrative operations, and platform integrations.

---

# Objectives

Notification error codes must:

- Be stable.
- Be human-readable.
- Be machine-readable.
- Support troubleshooting.
- Support monitoring.
- Remain provider-independent.

---

# Error Code Format

```
NOTIF-XXXX
```

Example:

```
NOTIF-0101
```

---

# Error Categories

| Range | Category |
|--------|----------|
| NOTIF-0000–0099 | General |
| NOTIF-0100–0199 | Notification Creation |
| NOTIF-0200–0299 | Delivery |
| NOTIF-0300–0399 | Scheduling |
| NOTIF-0400–0499 | Channel Routing |
| NOTIF-0500–0599 | Templates |
| NOTIF-0600–0699 | User Preferences |
| NOTIF-0700–0799 | Retry Management |
| NOTIF-0800–0899 | Security |
| NOTIF-0900–0999 | Administrative |

---

# General Errors

| Code | Description |
|------|-------------|
| NOTIF-0001 | Unknown notification error |
| NOTIF-0002 | Invalid request |
| NOTIF-0003 | Unsupported operation |

---

# Notification Creation

| Code | Description |
|------|-------------|
| NOTIF-0101 | Notification not found |
| NOTIF-0102 | Invalid notification payload |
| NOTIF-0103 | Missing recipient |
| NOTIF-0104 | Invalid recipient |
| NOTIF-0105 | Duplicate notification request |

---

# Delivery Errors

| Code | Description |
|------|-------------|
| NOTIF-0201 | Delivery failed |
| NOTIF-0202 | Delivery timeout |
| NOTIF-0203 | Provider unavailable |
| NOTIF-0204 | Delivery rejected |
| NOTIF-0205 | Delivery expired |

---

# Scheduling Errors

| Code | Description |
|------|-------------|
| NOTIF-0301 | Invalid schedule |
| NOTIF-0302 | Scheduled time in the past |
| NOTIF-0303 | Notification already scheduled |
| NOTIF-0304 | Scheduled notification cancelled |

---

# Channel Routing

| Code | Description |
|------|-------------|
| NOTIF-0401 | Unsupported delivery channel |
| NOTIF-0402 | No eligible delivery channel |
| NOTIF-0403 | Channel disabled |
| NOTIF-0404 | Channel temporarily unavailable |
| NOTIF-0405 | Channel policy violation |

---

# Template Errors

| Code | Description |
|------|-------------|
| NOTIF-0501 | Template not found |
| NOTIF-0502 | Template rendering failed |
| NOTIF-0503 | Missing template variable |
| NOTIF-0504 | Unsupported localization |

---

# User Preference Errors

| Code | Description |
|------|-------------|
| NOTIF-0601 | Delivery blocked by user preference |
| NOTIF-0602 | Quiet hours active |
| NOTIF-0603 | Digest mode enabled |
| NOTIF-0604 | Recipient opted out |

---

# Retry Errors

| Code | Description |
|------|-------------|
| NOTIF-0701 | Retry limit exceeded |
| NOTIF-0702 | Retry policy unavailable |
| NOTIF-0703 | Retry cancelled |

---

# Security Errors

| Code | Description |
|------|-------------|
| NOTIF-0801 | Permission denied |
| NOTIF-0802 | Unauthorized notification request |
| NOTIF-0803 | Cross-organization request prohibited |
| NOTIF-0804 | Invalid authentication context |

---

# Administrative Errors

| Code | Description |
|------|-------------|
| NOTIF-0901 | Bulk notification failed |
| NOTIF-0902 | Bulk operation cancelled |
| NOTIF-0903 | Administrative policy violation |

---

# Standard Error Response

Every error response should include:

| Field | Required |
|--------|----------|
| Error Code | ✅ |
| Message | ✅ |
| HTTP Status | ✅ |
| Correlation ID | ✅ |
| Timestamp (UTC) | ✅ |
| Details | Optional |

---

# Design Principles

Notification errors must:

- Never expose provider credentials.
- Never expose internal infrastructure.
- Preserve correlation identifiers.
- Remain stable across platform versions.
- Be safe for API consumers.

---

# Related Documents

- README.md
- FEATURES.md
- STATES.md
- EVENTS.md
- CHANNELS.md
- SECURITY.md
- AUDIT_LOGGING.md
- FAQ.md

---

Status: Draft

Approval Required: Yes

Next Document:
CHANNELS.md