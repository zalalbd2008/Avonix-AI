---
status: Draft
version: 1.0.0
document: PERMISSIONS_ERROR_CODES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - EVENTS.md
approval_status: Pending
---

# Permission Error Codes

## Purpose

This document defines the standardized error catalog for the Permissions module.

Permission error codes provide consistent, machine-readable responses for authorization failures, policy violations, role management, and permission assignment operations.

---

# Objectives

Permission errors must be:

- Predictable
- Stable
- Machine-readable
- Human-readable
- Localizable
- Backward compatible

Error identifiers are immutable once published.

---

# Error Code Format

Pattern:

PERM-XXXX

Example:

PERM-0001

---

# Error Categories

| Range | Category |
|--------|----------|
| 0000–0099 | General |
| 0100–0199 | Permission Registry |
| 0200–0299 | Roles |
| 0300–0399 | Assignments |
| 0400–0499 | Authorization |
| 0500–0599 | Policies |
| 0600–0699 | Scope |
| 0700–0799 | Security |
| 0800–0899 | Administrative |

---

# General Errors

| Code | Description |
|------|-------------|
| PERM-0001 | Unknown permission error |
| PERM-0002 | Invalid request |
| PERM-0003 | Unsupported operation |

---

# Permission Registry

| Code | Description |
|------|-------------|
| PERM-0101 | Permission not found |
| PERM-0102 | Permission deprecated |
| PERM-0103 | Duplicate permission identifier |
| PERM-0104 | Invalid permission namespace |

---

# Roles

| Code | Description |
|------|-------------|
| PERM-0201 | Role not found |
| PERM-0202 | Duplicate role |
| PERM-0203 | Reserved system role |
| PERM-0204 | Role cannot be deleted |
| PERM-0205 | Invalid role assignment |

---

# Permission Assignments

| Code | Description |
|------|-------------|
| PERM-0301 | Assignment not found |
| PERM-0302 | Assignment already exists |
| PERM-0303 | Assignment inactive |
| PERM-0304 | Assignment expired |
| PERM-0305 | Assignment revoked |
| PERM-0306 | Assignment suspended |

---

# Authorization

| Code | Description |
|------|-------------|
| PERM-0401 | Authorization denied |
| PERM-0402 | Missing required permission |
| PERM-0403 | Resource access denied |
| PERM-0404 | Action not permitted |
| PERM-0405 | Scope mismatch |

---

# Policies

| Code | Description |
|------|-------------|
| PERM-0501 | Policy violation |
| PERM-0502 | Policy evaluation failed |
| PERM-0503 | Policy conflict detected |
| PERM-0504 | Policy disabled |

---

# Scope

| Code | Description |
|------|-------------|
| PERM-0601 | Invalid scope |
| PERM-0602 | Unsupported scope |
| PERM-0603 | Scope inheritance violation |
| PERM-0604 | Resource outside scope |

---

# Security

| Code | Description |
|------|-------------|
| PERM-0701 | Privilege escalation blocked |
| PERM-0702 | Cross-organization access denied |
| PERM-0703 | Sensitive operation requires MFA |
| PERM-0704 | Authorization context invalid |

---

# Administrative

| Code | Description |
|------|-------------|
| PERM-0801 | Access review required |
| PERM-0802 | Approval required |
| PERM-0803 | Administrative action prohibited |

---

# Standard Error Response

Every error response should include:

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
| 403 | Authorization denied |
| 404 | Resource not found |
| 409 | Conflict |
| 422 | Validation failed |
| 500 | Internal server error |

---

# Logging

Every permission error should record:

- Error Code
- Organization ID
- Scope
- Actor ID
- Correlation ID
- Timestamp
- Failure Reason

Sensitive information must never be exposed to clients.

---

# Localization

Error codes remain constant.

Only the human-readable message may be localized.

---

# Related Documents

- README.md
- STATES.md
- EVENTS.md
- RBAC.md
- POLICIES.md
- SECURITY.md

---

Status: Draft

Approval Required: Yes

Next Document:
RBAC.md