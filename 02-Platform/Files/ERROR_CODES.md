---
status: Draft
version: 1.0.0
document: FILES_ERROR_CODES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - EVENTS.md
approval_status: Pending
---

# File Error Codes

## Purpose

This document defines the standardized error catalog for the Files module.

File error codes provide predictable, machine-readable responses for upload, processing, storage, versioning, sharing, retention, and administrative operations.

---

# Objectives

File error codes must be:

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

FILE-XXXX

Example:

FILE-0001

---

# Error Categories

| Range | Category |
|--------|----------|
| 0000–0099 | General |
| 0100–0199 | Upload |
| 0200–0299 | Processing |
| 0300–0399 | Storage |
| 0400–0499 | Versioning |
| 0500–0599 | Sharing |
| 0600–0699 | Lifecycle |
| 0700–0799 | Security |
| 0800–0899 | Administrative |

---

# General Errors

| Code | Description |
|------|-------------|
| FILE-0001 | Unknown file error |
| FILE-0002 | Invalid request |
| FILE-0003 | Unsupported operation |
| FILE-0004 | File not found |

---

# Upload Errors

| Code | Description |
|------|-------------|
| FILE-0101 | Upload failed |
| FILE-0102 | Upload session expired |
| FILE-0103 | File size exceeds allowed limit |
| FILE-0104 | Unsupported file type |
| FILE-0105 | Checksum validation failed |
| FILE-0106 | Upload interrupted |
| FILE-0107 | Multipart upload incomplete |

---

# Processing Errors

| Code | Description |
|------|-------------|
| FILE-0201 | Virus detected |
| FILE-0202 | Metadata extraction failed |
| FILE-0203 | Preview generation failed |
| FILE-0204 | OCR processing failed |
| FILE-0205 | File processing timeout |

Processing failures may prevent the file from becoming available.

---

# Storage Errors

| Code | Description |
|------|-------------|
| FILE-0301 | Storage provider unavailable |
| FILE-0302 | Storage quota exceeded |
| FILE-0303 | Storage write failed |
| FILE-0304 | Storage read failed |
| FILE-0305 | Storage migration failed |

---

# Versioning Errors

| Code | Description |
|------|-------------|
| FILE-0401 | Version not found |
| FILE-0402 | Version creation failed |
| FILE-0403 | Version restore prohibited |
| FILE-0404 | Version conflict detected |

---

# Sharing Errors

| Code | Description |
|------|-------------|
| FILE-0501 | Share link invalid |
| FILE-0502 | Share link expired |
| FILE-0503 | Share link revoked |
| FILE-0504 | Sharing prohibited by policy |

---

# Lifecycle Errors

| Code | Description |
|------|-------------|
| FILE-0601 | Invalid file state |
| FILE-0602 | State transition prohibited |
| FILE-0603 | File archived |
| FILE-0604 | File soft deleted |
| FILE-0605 | File permanently deleted |
| FILE-0606 | Retention policy prevents deletion |

---

# Security Errors

| Code | Description |
|------|-------------|
| FILE-0701 | Unauthorized file access |
| FILE-0702 | Permission denied |
| FILE-0703 | Cross-organization file access prohibited |
| FILE-0704 | File encryption failure |
| FILE-0705 | Security policy violation |

---

# Administrative Errors

| Code | Description |
|------|-------------|
| FILE-0801 | Metadata export failed |
| FILE-0802 | Lifecycle policy execution failed |
| FILE-0803 | Bulk operation failed |
| FILE-0804 | Administrative approval required |

---

# Standard Error Response

Every File error response should include:

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
| 404 | File not found |
| 409 | Conflict |
| 413 | File too large |
| 422 | Validation failed |
| 500 | Internal server error |
| 503 | Storage service unavailable |

---

# Logging

Every File error should record:

- File ID
- Version ID (if applicable)
- Organization ID
- Workspace ID
- Actor ID
- Correlation ID
- Timestamp (UTC)
- Failure Reason

Sensitive storage information must never appear in logs.

---

# Localization

Error codes remain constant.

Only localized messages may change.

---

# Related Documents

- README.md
- STATES.md
- EVENTS.md
- STORAGE.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Document:
STORAGE.md