---
status: Draft
version: 1.0.0
document: USERS_ERROR_CODES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - EVENTS.md
approval_status: Pending
---

# User Error Codes

## Purpose

This document defines the standardized error catalog for the Users module.

User error codes provide predictable, machine-readable responses for profile operations, preferences, presence, privacy settings, and administrative actions.

---

# Objectives

User error codes must be:

- Stable
- Predictable
- Machine-readable
- Human-readable
- Localizable
- Backward compatible

Published error identifiers are immutable.

---

# Error Code Format

Pattern:

USER-XXXX

Example:

USER-0001

---

# Error Categories

| Range | Category |
|--------|----------|
| 0000–0099 | General |
| 0100–0199 | Profile |
| 0200–0299 | Preferences |
| 0300–0399 | Presence |
| 0400–0499 | Privacy |
| 0500–0599 | Dashboard |
| 0600–0699 | Workspace Context |
| 0700–0799 | Security |
| 0800–0899 | Administrative |

---

# General Errors

| Code | Description |
|------|-------------|
| USER-0001 | Unknown user error |
| USER-0002 | Invalid request |
| USER-0003 | Unsupported operation |
| USER-0004 | User profile not found |

---

# Profile Errors

| Code | Description |
|------|-------------|
| USER-0101 | Profile already exists |
| USER-0102 | Profile initialization failed |
| USER-0103 | Invalid profile state |
| USER-0104 | Profile archived |
| USER-0105 | Profile update prohibited |

---

# Preference Errors

| Code | Description |
|------|-------------|
| USER-0201 | Invalid preference |
| USER-0202 | Preference validation failed |
| USER-0203 | Unsupported preference |
| USER-0204 | Organization policy conflict |

---

# Presence Errors

| Code | Description |
|------|-------------|
| USER-0301 | Invalid presence state |
| USER-0302 | Presence update rejected |
| USER-0303 | Presence unavailable |

Presence failures must never affect authorization.

---

# Privacy Errors

| Code | Description |
|------|-------------|
| USER-0401 | Invalid privacy configuration |
| USER-0402 | Visibility update prohibited |
| USER-0403 | Restricted by organization policy |

---

# Dashboard Errors

| Code | Description |
|------|-------------|
| USER-0501 | Dashboard configuration invalid |
| USER-0502 | Favorite resource unavailable |
| USER-0503 | Dashboard reset failed |

---

# Workspace Context Errors

| Code | Description |
|------|-------------|
| USER-0601 | Workspace context required |
| USER-0602 | Workspace unavailable |
| USER-0603 | Last active workspace unavailable |

---

# Security Errors

| Code | Description |
|------|-------------|
| USER-0701 | Unauthorized profile access |
| USER-0702 | Permission denied |
| USER-0703 | Cross-organization profile access denied |
| USER-0704 | Sensitive profile operation requires MFA |
| USER-0705 | User security policy violation |

---

# Administrative Errors

| Code | Description |
|------|-------------|
| USER-0801 | User export prohibited |
| USER-0802 | User data export failed |
| USER-0803 | Profile merge prohibited |
| USER-0804 | Administrative approval required |

---

# Standard Error Response

Every User error response should include:

| Field | Required |
|--------|----------|
| Error Code | ✅ |
| Message | ✅ |
| HTTP Status | ✅ |
| Timestamp (UTC) | ✅ |
| Correlation ID | ✅ |
| Details | Optional |

---

# HTTP Status Recommendations

| HTTP Status | Typical Usage |
|--------------|---------------|
| 400 | Invalid request |
| 401 | Authentication required |
| 403 | Access denied |
| 404 | User profile not found |
| 409 | Conflict |
| 422 | Validation failed |
| 500 | Internal server error |

---

# Logging

Every User error should record:

- User ID
- Organization ID (if applicable)
- Workspace ID (if applicable)
- Actor ID
- Correlation ID
- Timestamp (UTC)
- Failure Reason

Sensitive information must never appear in client responses.

---

# Localization

Error codes remain constant.

Only localized messages may change.

---

# Related Documents

- README.md
- STATES.md
- EVENTS.md
- PROFILE.md
- PREFERENCES.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Document:
PROFILE.md