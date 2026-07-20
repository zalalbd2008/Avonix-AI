---
status: Draft
version: 1.0.0
document: API_KEYS_ERROR_CODES
owner: Platform Security Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
  - STATES.md
approval_status: Pending
---

# API Keys Error Codes

## Purpose

This document defines the canonical error codes for the API Keys module.

API Key error codes provide stable, provider-independent identifiers for failures related to key lifecycle management, authentication, secret protection, scope validation, and administrative operations.

---

# Objectives

API Key error codes must:

- Be stable.
- Be machine-readable.
- Be human-readable.
- Support troubleshooting.
- Support monitoring.
- Remain provider-independent.

---

# Error Code Format

```
APIKEY-XXXX
```

Example:

```
APIKEY-0101
```

---

# Error Categories

| Range | Category |
|--------|----------|
| APIKEY-0000–0099 | General |
| APIKEY-0100–0199 | Key Lifecycle |
| APIKEY-0200–0299 | Authentication |
| APIKEY-0300–0399 | Scope & Authorization |
| APIKEY-0400–0499 | Secret Management |
| APIKEY-0500–0599 | Usage & Rate Limits |
| APIKEY-0600–0699 | Administrative |
| APIKEY-0700–0799 | Security |

---

# General Errors

| Code | Description |
|------|-------------|
| APIKEY-0001 | Unknown API Key error |
| APIKEY-0002 | Invalid request |
| APIKEY-0003 | Unsupported operation |

---

# Key Lifecycle Errors

| Code | Description |
|------|-------------|
| APIKEY-0101 | API Key not found |
| APIKEY-0102 | API Key already exists |
| APIKEY-0103 | Invalid API Key state |
| APIKEY-0104 | API Key already revoked |
| APIKEY-0105 | API Key expired |
| APIKEY-0106 | API Key disabled |
| APIKEY-0107 | API Key activation failed |
| APIKEY-0108 | API Key rotation failed |

---

# Authentication Errors

| Code | Description |
|------|-------------|
| APIKEY-0201 | Authentication failed |
| APIKEY-0202 | Invalid API Key |
| APIKEY-0203 | Invalid secret |
| APIKEY-0204 | Secret verification failed |
| APIKEY-0205 | Authentication timeout |

---

# Scope & Authorization Errors

| Code | Description |
|------|-------------|
| APIKEY-0301 | Required scope missing |
| APIKEY-0302 | Invalid scope |
| APIKEY-0303 | Scope assignment failed |
| APIKEY-0304 | Cross-organization access prohibited |
| APIKEY-0305 | Workspace restriction violated |

---

# Secret Management Errors

| Code | Description |
|------|-------------|
| APIKEY-0401 | Secret generation failed |
| APIKEY-0402 | Secret storage failed |
| APIKEY-0403 | Secret already rotated |
| APIKEY-0404 | Secret display unavailable |
| APIKEY-0405 | Secret integrity validation failed |

---

# Usage & Rate Limit Errors

| Code | Description |
|------|-------------|
| APIKEY-0501 | Rate limit exceeded |
| APIKEY-0502 | Usage quota exceeded |
| APIKEY-0503 | Too many failed authentication attempts |
| APIKEY-0504 | Usage tracking unavailable |

---

# Administrative Errors

| Code | Description |
|------|-------------|
| APIKEY-0601 | Configuration update failed |
| APIKEY-0602 | Metadata update failed |
| APIKEY-0603 | Expiration policy violation |
| APIKEY-0604 | Administrative policy violation |

---

# Security Errors

| Code | Description |
|------|-------------|
| APIKEY-0701 | Unauthorized request |
| APIKEY-0702 | Invalid security context |
| APIKEY-0703 | API Key compromised |
| APIKEY-0704 | Cryptographic validation failed |
| APIKEY-0705 | Suspicious authentication detected |

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

API Key errors must:

- Never expose secrets.
- Never expose secret hashes.
- Never expose cryptographic implementation details.
- Preserve Correlation IDs.
- Remain stable across platform versions.
- Be safe for API consumers.

---

# Error Translation

Internal cryptographic, storage, authentication, or infrastructure errors must always be translated into canonical APIKEY-XXXX errors.

Business modules and external clients must never receive implementation-specific errors.

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