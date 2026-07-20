---
status: Draft
version: 1.0.0
document: TAGS_ERROR_CODES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - EVENTS.md
approval_status: Pending
---

# Tag Error Codes

## Purpose

This document defines the standardized error catalog for the Tags module.

Tag error codes provide consistent, machine-readable responses for tag lifecycle management, assignment operations, scope validation, governance policies, and administrative actions.

---

# Objectives

Tag error codes must be:

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

TAG-XXXX

Example:

TAG-0001

---

# Error Categories

| Range | Category |
|--------|----------|
| 0000–0099 | General |
| 0100–0199 | Tag Definition |
| 0200–0299 | Assignment |
| 0300–0399 | Scope & Validation |
| 0400–0499 | Lifecycle |
| 0500–0599 | Governance |
| 0600–0699 | Security |
| 0700–0799 | Administrative |

---

# General Errors

| Code | Description |
|------|-------------|
| TAG-0001 | Unknown tag error |
| TAG-0002 | Invalid request |
| TAG-0003 | Unsupported operation |
| TAG-0004 | Tag not found |

---

# Tag Definition Errors

| Code | Description |
|------|-------------|
| TAG-0101 | Tag already exists |
| TAG-0102 | Invalid tag name |
| TAG-0103 | Reserved tag name |
| TAG-0104 | Invalid tag color |
| TAG-0105 | Duplicate tag definition |
| TAG-0106 | Tag category not found |

---

# Assignment Errors

| Code | Description |
|------|-------------|
| TAG-0201 | Assignment already exists |
| TAG-0202 | Assignment not found |
| TAG-0203 | Entity does not support tagging |
| TAG-0204 | Maximum tag limit exceeded |
| TAG-0205 | Bulk assignment failed |

---

# Scope & Validation Errors

| Code | Description |
|------|-------------|
| TAG-0301 | Invalid scope |
| TAG-0302 | Cross-workspace assignment prohibited |
| TAG-0303 | Cross-organization assignment prohibited |
| TAG-0304 | Scope mismatch detected |
| TAG-0305 | Validation failed |

---

# Lifecycle Errors

| Code | Description |
|------|-------------|
| TAG-0401 | Invalid tag state |
| TAG-0402 | State transition prohibited |
| TAG-0403 | Tag archived |
| TAG-0404 | Tag deprecated |
| TAG-0405 | Tag deleted |

---

# Governance Errors

| Code | Description |
|------|-------------|
| TAG-0501 | Tag protected by policy |
| TAG-0502 | Tag required by policy |
| TAG-0503 | Deletion prohibited |
| TAG-0504 | Archive prohibited |
| TAG-0505 | Replacement tag required |

---

# Security Errors

| Code | Description |
|------|-------------|
| TAG-0601 | Unauthorized access |
| TAG-0602 | Permission denied |
| TAG-0603 | Cross-tenant access prohibited |
| TAG-0604 | Security policy violation |

---

# Administrative Errors

| Code | Description |
|------|-------------|
| TAG-0701 | Import failed |
| TAG-0702 | Export failed |
| TAG-0703 | Bulk operation failed |
| TAG-0704 | Administrative approval required |

---

# Standard Error Response

Every Tag error response should include:

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
| 404 | Tag not found |
| 409 | Conflict |
| 422 | Validation failed |
| 500 | Internal server error |

---

# Logging

Every Tag error should record:

- Tag ID (if available)
- Entity Type (if applicable)
- Entity ID (if applicable)
- Organization ID
- Workspace ID
- Actor ID
- Correlation ID
- Timestamp (UTC)
- Failure Reason

Sensitive information must never appear in logs.

---

# Localization

Error codes remain constant.

Only localized messages may change.

---

# Related Documents

- README.md
- STATES.md
- EVENTS.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Document:
SECURITY.md