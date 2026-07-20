---
status: Draft
version: 1.0.0
document: ACTIVITY_FEED_ERROR_CODES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
  - STATES.md
approval_status: Pending
---

# Activity Feed Error Codes

## Purpose

This document defines the canonical error codes for the Activity Feed module.

Activity Feed error codes provide stable, provider-independent identifiers for failures related to activity processing, timeline retrieval, synchronization, visibility, retention, and administrative operations.

---

# Objectives

Activity Feed error codes must:

- Be stable.
- Be machine-readable.
- Be human-readable.
- Support troubleshooting.
- Support monitoring.
- Remain provider-independent.

---

# Error Code Format

```
ACTIVITY-XXXX
```

Example:

```
ACTIVITY-0101
```

---

# Error Categories

| Range | Category |
|--------|----------|
| ACTIVITY-0000–0099 | General |
| ACTIVITY-0100–0199 | Activity Processing |
| ACTIVITY-0200–0299 | Timeline Retrieval |
| ACTIVITY-0300–0399 | Visibility & Authorization |
| ACTIVITY-0400–0499 | Synchronization |
| ACTIVITY-0500–0599 | Retention & Archiving |
| ACTIVITY-0600–0699 | Administrative |
| ACTIVITY-0700–0799 | Security |

---

# General Errors

| Code | Description |
|------|-------------|
| ACTIVITY-0001 | Unknown activity error |
| ACTIVITY-0002 | Invalid request |
| ACTIVITY-0003 | Unsupported operation |

---

# Activity Processing Errors

| Code | Description |
|------|-------------|
| ACTIVITY-0101 | Invalid activity event |
| ACTIVITY-0102 | Activity generation failed |
| ACTIVITY-0103 | Duplicate activity detected |
| ACTIVITY-0104 | Activity record not found |
| ACTIVITY-0105 | Invalid activity metadata |

---

# Timeline Retrieval Errors

| Code | Description |
|------|-------------|
| ACTIVITY-0201 | Timeline unavailable |
| ACTIVITY-0202 | Invalid timeline scope |
| ACTIVITY-0203 | Pagination limit exceeded |
| ACTIVITY-0204 | Invalid filter |
| ACTIVITY-0205 | Invalid sort criteria |

---

# Visibility & Authorization Errors

| Code | Description |
|------|-------------|
| ACTIVITY-0301 | Permission denied |
| ACTIVITY-0302 | Activity not visible |
| ACTIVITY-0303 | Cross-organization access prohibited |
| ACTIVITY-0304 | Cross-workspace access prohibited |
| ACTIVITY-0305 | Invalid visibility policy |

---

# Synchronization Errors

| Code | Description |
|------|-------------|
| ACTIVITY-0401 | Event synchronization failed |
| ACTIVITY-0402 | Source event not found |
| ACTIVITY-0403 | Event ordering violation |
| ACTIVITY-0404 | Retry limit exceeded |
| ACTIVITY-0405 | Correlation validation failed |

---

# Retention & Archiving Errors

| Code | Description |
|------|-------------|
| ACTIVITY-0501 | Archive operation failed |
| ACTIVITY-0502 | Retention policy violation |
| ACTIVITY-0503 | Activity already archived |
| ACTIVITY-0504 | Activity expired |
| ACTIVITY-0505 | Archive restoration not permitted |

---

# Administrative Errors

| Code | Description |
|------|-------------|
| ACTIVITY-0601 | Activity rebuild failed |
| ACTIVITY-0602 | Retention update failed |
| ACTIVITY-0603 | Configuration update failed |
| ACTIVITY-0604 | Administrative policy violation |

---

# Security Errors

| Code | Description |
|------|-------------|
| ACTIVITY-0701 | Unauthorized request |
| ACTIVITY-0702 | Invalid security context |
| ACTIVITY-0703 | Rate limit exceeded |
| ACTIVITY-0704 | Activity integrity validation failed |

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

Activity Feed errors must:

- Never expose internal infrastructure.
- Never expose implementation details.
- Preserve Correlation IDs.
- Remain stable across versions.
- Be safe for public APIs.

---

# Error Translation

Internal exceptions should always be translated into canonical Activity Feed error codes before leaving the module.

Business modules must never receive implementation-specific errors.

---

# Related Documents

- README.md
- FEATURES.md
- STATES.md
- EVENTS.md
- SECURITY.md
- AUDIT_LOGGING.md
- FAQ.md

---

Status: Draft

Approval Required: Yes

Next Document:
SECURITY.md