---
status: Draft
version: 1.0.0
document: INVITATIONS_ERROR_CODES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - EVENTS.md
approval_status: Pending
---

# Invitation Error Codes

## Purpose

This document defines the standardized error catalog for the Invitations module.

Invitation error codes provide predictable, machine-readable responses for invitation creation, validation, acceptance, expiration, revocation, and administrative operations.

---

# Objectives

Invitation error codes must be:

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

INV-XXXX

Example:

INV-0001

---

# Error Categories

| Range | Category |
|--------|----------|
| 0000–0099 | General |
| 0100–0199 | Creation |
| 0200–0299 | Token |
| 0300–0399 | Acceptance |
| 0400–0499 | Lifecycle |
| 0500–0599 | Policy |
| 0600–0699 | Resource |
| 0700–0799 | Security |
| 0800–0899 | Administrative |

---

# General Errors

| Code | Description |
|------|-------------|
| INV-0001 | Unknown invitation error |
| INV-0002 | Invalid request |
| INV-0003 | Unsupported operation |
| INV-0004 | Invitation not found |

---

# Creation Errors

| Code | Description |
|------|-------------|
| INV-0101 | Invitation already exists |
| INV-0102 | Invitation creation failed |
| INV-0103 | Invalid recipient |
| INV-0104 | Duplicate active invitation |
| INV-0105 | Invitation quota exceeded |

---

# Token Errors

| Code | Description |
|------|-------------|
| INV-0201 | Invalid invitation token |
| INV-0202 | Invitation token expired |
| INV-0203 | Invitation token revoked |
| INV-0204 | Invitation token already consumed |
| INV-0205 | Invitation token validation failed |

---

# Acceptance Errors

| Code | Description |
|------|-------------|
| INV-0301 | Invitation already accepted |
| INV-0302 | Invitation declined |
| INV-0303 | Invitation cannot be accepted |
| INV-0304 | Recipient identity mismatch |
| INV-0305 | Membership provisioning failed |

Acceptance failures must never consume the token unless acceptance succeeds.

---

# Lifecycle Errors

| Code | Description |
|------|-------------|
| INV-0401 | Invalid invitation state |
| INV-0402 | State transition prohibited |
| INV-0403 | Invitation already completed |
| INV-0404 | Invitation already revoked |
| INV-0405 | Invitation already expired |

---

# Policy Errors

| Code | Description |
|------|-------------|
| INV-0501 | Organization policy violation |
| INV-0502 | Domain restriction violated |
| INV-0503 | Guest invitations prohibited |
| INV-0504 | Administrative approval required |
| INV-0505 | Invitation policy validation failed |

---

# Resource Errors

| Code | Description |
|------|-------------|
| INV-0601 | Target resource not found |
| INV-0602 | Resource unavailable |
| INV-0603 | Resource archived |
| INV-0604 | Resource no longer accepts invitations |

---

# Security Errors

| Code | Description |
|------|-------------|
| INV-0701 | Unauthorized invitation creation |
| INV-0702 | Permission denied |
| INV-0703 | Cross-organization invitation prohibited |
| INV-0704 | Suspicious invitation activity detected |
| INV-0705 | Security policy violation |

---

# Administrative Errors

| Code | Description |
|------|-------------|
| INV-0801 | Invitation export prohibited |
| INV-0802 | Invitation export failed |
| INV-0803 | Invitation resend prohibited |
| INV-0804 | Invitation revocation failed |

---

# Standard Error Response

Every Invitation error response should include:

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
| 404 | Invitation not found |
| 409 | Conflict |
| 410 | Invitation expired or revoked |
| 422 | Validation failed |
| 500 | Internal server error |

---

# Logging

Every Invitation error should record:

- Invitation ID
- Target Resource
- Organization ID
- Actor ID
- Correlation ID
- Timestamp (UTC)
- Failure Reason

Sensitive token values must never appear in logs.

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