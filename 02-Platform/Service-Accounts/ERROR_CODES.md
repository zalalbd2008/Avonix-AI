---
status: Draft
version: 1.0.0
document: SERVICE_ACCOUNTS_ERROR_CODES
owner: Platform Identity Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
  - STATES.md
approval_status: Pending
---

# Service Accounts Error Codes

## Purpose

This document defines the canonical error codes for the Service Accounts module.

Service Account error codes provide stable, provider-independent identifiers for lifecycle failures, identity management, authentication context, organizational boundaries, and administrative operations.

---

# Objectives

Error codes must:

- Be stable.
- Be machine-readable.
- Be human-readable.
- Support troubleshooting.
- Support monitoring.
- Preserve backward compatibility.

---

# Error Code Format

```
SERVICE_ACCOUNT-XXXX
```

Example:

```
SERVICE_ACCOUNT-0101
```

---

# Error Categories

| Range | Category |
|--------|----------|
| SERVICE_ACCOUNT-0000–0099 | General |
| SERVICE_ACCOUNT-0100–0199 | Lifecycle |
| SERVICE_ACCOUNT-0200–0299 | Identity |
| SERVICE_ACCOUNT-0300–0399 | Organization & Workspace |
| SERVICE_ACCOUNT-0400–0499 | Authentication |
| SERVICE_ACCOUNT-0500–0599 | Permissions & Relationships |
| SERVICE_ACCOUNT-0600–0699 | Administrative |
| SERVICE_ACCOUNT-0700–0799 | Security |

---

# General Errors

| Code | Description |
|------|-------------|
| SERVICE_ACCOUNT-0001 | Unknown Service Account error |
| SERVICE_ACCOUNT-0002 | Invalid request |
| SERVICE_ACCOUNT-0003 | Unsupported operation |

---

# Lifecycle Errors

| Code | Description |
|------|-------------|
| SERVICE_ACCOUNT-0101 | Service Account not found |
| SERVICE_ACCOUNT-0102 | Service Account already exists |
| SERVICE_ACCOUNT-0103 | Invalid lifecycle state |
| SERVICE_ACCOUNT-0104 | Service Account already archived |
| SERVICE_ACCOUNT-0105 | Service Account disabled |
| SERVICE_ACCOUNT-0106 | Activation failed |
| SERVICE_ACCOUNT-0107 | Archive operation failed |
| SERVICE_ACCOUNT-0108 | Lifecycle transition not allowed |

---

# Identity Errors

| Code | Description |
|------|-------------|
| SERVICE_ACCOUNT-0201 | Invalid Service Account identifier |
| SERVICE_ACCOUNT-0202 | Duplicate display name |
| SERVICE_ACCOUNT-0203 | Invalid metadata |
| SERVICE_ACCOUNT-0204 | Identity update failed |
| SERVICE_ACCOUNT-0205 | Immutable property modification attempted |

---

# Organization & Workspace Errors

| Code | Description |
|------|-------------|
| SERVICE_ACCOUNT-0301 | Organization not found |
| SERVICE_ACCOUNT-0302 | Workspace not found |
| SERVICE_ACCOUNT-0303 | Cross-organization assignment prohibited |
| SERVICE_ACCOUNT-0304 | Invalid workspace assignment |
| SERVICE_ACCOUNT-0305 | Organization mismatch detected |

---

# Authentication Errors

| Code | Description |
|------|-------------|
| SERVICE_ACCOUNT-0401 | Authentication denied |
| SERVICE_ACCOUNT-0402 | Service Account inactive |
| SERVICE_ACCOUNT-0403 | No active API Keys available |
| SERVICE_ACCOUNT-0404 | Authentication context creation failed |
| SERVICE_ACCOUNT-0405 | Identity validation failed |

---

# Permissions & Relationships Errors

| Code | Description |
|------|-------------|
| SERVICE_ACCOUNT-0501 | Permission assignment failed |
| SERVICE_ACCOUNT-0502 | Role assignment failed |
| SERVICE_ACCOUNT-0503 | API Key attachment failed |
| SERVICE_ACCOUNT-0504 | API Key ownership mismatch |
| SERVICE_ACCOUNT-0505 | Relationship constraint violated |

---

# Administrative Errors

| Code | Description |
|------|-------------|
| SERVICE_ACCOUNT-0601 | Metadata update failed |
| SERVICE_ACCOUNT-0602 | Label update failed |
| SERVICE_ACCOUNT-0603 | Tag update failed |
| SERVICE_ACCOUNT-0604 | Administrative policy violation |

---

# Security Errors

| Code | Description |
|------|-------------|
| SERVICE_ACCOUNT-0701 | Unauthorized request |
| SERVICE_ACCOUNT-0702 | Cross-tenant access denied |
| SERVICE_ACCOUNT-0703 | Security policy violation |
| SERVICE_ACCOUNT-0704 | Suspicious identity activity detected |
| SERVICE_ACCOUNT-0705 | Identity integrity validation failed |

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

Service Account errors must:

- Never expose implementation details.
- Never expose API secrets.
- Preserve Correlation IDs.
- Remain stable across platform versions.
- Be safe for external consumers.

---

# Error Translation

Infrastructure, authentication, storage, or provider-specific failures must be translated into canonical `SERVICE_ACCOUNT-XXXX` errors before leaving the module.

Internal implementation details must never be exposed to clients.

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