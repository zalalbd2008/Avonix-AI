---
status: Draft
version: 1.0.0
document: WORKSPACES_ERROR_CODES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - EVENTS.md
approval_status: Pending
---

# Workspace Error Codes

## Purpose

This document defines the standardized error catalog for the Workspaces module.

Workspace error codes provide predictable, machine-readable responses for lifecycle operations, membership management, ownership changes, resource organization, and security validation.

---

# Objectives

Workspace error codes must be:

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

WORKSPACE-XXXX

Example:

WORKSPACE-0001

---

# Error Categories

| Range | Category |
|--------|----------|
| 0000–0099 | General |
| 0100–0199 | Lifecycle |
| 0200–0299 | Membership |
| 0300–0399 | Ownership |
| 0400–0499 | Resources |
| 0500–0599 | Settings |
| 0600–0699 | Visibility |
| 0700–0799 | Security |
| 0800–0899 | Administrative |

---

# General Errors

| Code | Description |
|------|-------------|
| WORKSPACE-0001 | Unknown workspace error |
| WORKSPACE-0002 | Invalid request |
| WORKSPACE-0003 | Unsupported operation |
| WORKSPACE-0004 | Workspace not found |

---

# Lifecycle Errors

| Code | Description |
|------|-------------|
| WORKSPACE-0101 | Workspace already exists |
| WORKSPACE-0102 | Workspace provisioning failed |
| WORKSPACE-0103 | Workspace is archived |
| WORKSPACE-0104 | Workspace scheduled for deletion |
| WORKSPACE-0105 | Workspace already deleted |
| WORKSPACE-0106 | Invalid lifecycle transition |

---

# Membership Errors

| Code | Description |
|------|-------------|
| WORKSPACE-0201 | Member not found |
| WORKSPACE-0202 | Member already exists |
| WORKSPACE-0203 | Organization membership required |
| WORKSPACE-0204 | Workspace membership inactive |
| WORKSPACE-0205 | Membership limit exceeded |

---

# Ownership Errors

| Code | Description |
|------|-------------|
| WORKSPACE-0301 | Owner not found |
| WORKSPACE-0302 | Invalid ownership transfer |
| WORKSPACE-0303 | Last owner protection triggered |
| WORKSPACE-0304 | Ownership assignment prohibited |

---

# Resource Errors

| Code | Description |
|------|-------------|
| WORKSPACE-0401 | Resource not found |
| WORKSPACE-0402 | Resource already assigned |
| WORKSPACE-0403 | Resource assignment prohibited |
| WORKSPACE-0404 | Resource belongs to another Workspace |
| WORKSPACE-0405 | Resource operation not allowed |

---

# Settings Errors

| Code | Description |
|------|-------------|
| WORKSPACE-0501 | Invalid settings |
| WORKSPACE-0502 | Settings validation failed |
| WORKSPACE-0503 | Protected setting |
| WORKSPACE-0504 | Organization policy conflict |

---

# Visibility Errors

| Code | Description |
|------|-------------|
| WORKSPACE-0601 | Invalid visibility |
| WORKSPACE-0602 | Visibility change prohibited |
| WORKSPACE-0603 | Workspace hidden by policy |

---

# Security Errors

| Code | Description |
|------|-------------|
| WORKSPACE-0701 | Unauthorized workspace access |
| WORKSPACE-0702 | Cross-organization access denied |
| WORKSPACE-0703 | Permission denied |
| WORKSPACE-0704 | Sensitive operation requires MFA |
| WORKSPACE-0705 | Workspace security policy violation |

---

# Administrative Errors

| Code | Description |
|------|-------------|
| WORKSPACE-0801 | Workspace export prohibited |
| WORKSPACE-0802 | Workspace import failed |
| WORKSPACE-0803 | Workspace template unavailable |
| WORKSPACE-0804 | Administrative approval required |

---

# Standard Error Response

Every Workspace error response should include:

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
| 404 | Workspace or resource not found |
| 409 | Conflict |
| 422 | Validation failed |
| 500 | Internal server error |

---

# Logging

Every Workspace error should record:

- Error Code
- Organization ID
- Workspace ID
- Actor ID
- Correlation ID
- Timestamp (UTC)
- Failure Reason

Sensitive information must never be exposed to clients.

---

# Localization

Workspace error codes remain constant.

Only the human-readable message may be localized.

---

# Related Documents

- README.md
- STATES.md
- EVENTS.md
- WORKSPACE_LIFECYCLE.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Document:
WORKSPACE_LIFECYCLE.md