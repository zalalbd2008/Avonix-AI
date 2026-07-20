---
status: Draft
version: 1.0.0
document: AUTHENTICATION_ERROR_CODES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - FEATURES.md
  - STATES.md
  - EVENTS.md
approval_status: Pending
---

# Authentication Error Codes

## Purpose

This document defines the standardized error codes for the Authentication module.

Error codes provide a consistent contract between backend services, frontend applications, APIs, automation workflows, logging systems, and support teams.

---

# Objectives

Authentication error codes must:

- Be unique.
- Be stable across versions.
- Be human-readable.
- Support localization.
- Be safe for client applications.
- Never expose sensitive security details.

---

# Error Code Format

Pattern:

AUTH-XXXX

Example:

AUTH-0001

AUTH-1005

AUTH-3002

---

# Error Categories

| Range | Category |
|---------|-------------------------|
| AUTH-0001–0099 | General Authentication |
| AUTH-0100–0199 | Registration |
| AUTH-0200–0299 | Login |
| AUTH-0300–0399 | Password |
| AUTH-0400–0499 | MFA |
| AUTH-0500–0599 | Session |
| AUTH-0600–0699 | Device |
| AUTH-0700–0799 | API Authentication |
| AUTH-0800–0899 | Security |
| AUTH-0900–0999 | Administrative |

---

# General Errors

| Code | Description |
|------|-------------|
| AUTH-0001 | Authentication Required |
| AUTH-0002 | Invalid Request |
| AUTH-0003 | Authentication Service Unavailable |
| AUTH-0004 | Unsupported Authentication Method |

---

# Registration Errors

| Code | Description |
|------|-------------|
| AUTH-0101 | Email Already Registered |
| AUTH-0102 | Invalid Email Address |
| AUTH-0103 | Registration Closed |
| AUTH-0104 | Verification Required |
| AUTH-0105 | Verification Link Expired |

---

# Login Errors

| Code | Description |
|------|-------------|
| AUTH-0201 | Invalid Credentials |
| AUTH-0202 | Account Locked |
| AUTH-0203 | Account Disabled |
| AUTH-0204 | Email Not Verified |
| AUTH-0205 | Login Temporarily Blocked |

---

# Password Errors

| Code | Description |
|------|-------------|
| AUTH-0301 | Password Too Weak |
| AUTH-0302 | Password Reuse Not Allowed |
| AUTH-0303 | Password Reset Token Invalid |
| AUTH-0304 | Password Reset Token Expired |

---

# MFA Errors

| Code | Description |
|------|-------------|
| AUTH-0401 | MFA Required |
| AUTH-0402 | Invalid Verification Code |
| AUTH-0403 | Recovery Code Invalid |
| AUTH-0404 | Recovery Code Already Used |

---

# Session Errors

| Code | Description |
|------|-------------|
| AUTH-0501 | Session Expired |
| AUTH-0502 | Session Revoked |
| AUTH-0503 | Invalid Session |
| AUTH-0504 | Concurrent Session Limit Reached |

---

# Device Errors

| Code | Description |
|------|-------------|
| AUTH-0601 | Device Not Trusted |
| AUTH-0602 | Device Revoked |
| AUTH-0603 | Unknown Device |

---

# API Authentication Errors

| Code | Description |
|------|-------------|
| AUTH-0701 | Missing Access Token |
| AUTH-0702 | Invalid Access Token |
| AUTH-0703 | Access Token Expired |
| AUTH-0704 | Refresh Token Invalid |
| AUTH-0705 | Refresh Token Expired |

---

# Security Errors

| Code | Description |
|------|-------------|
| AUTH-0801 | Rate Limit Exceeded |
| AUTH-0802 | Suspicious Activity Detected |
| AUTH-0803 | Authentication Blocked by Policy |
| AUTH-0804 | IP Address Restricted |

---

# Administrative Errors

| Code | Description |
|------|-------------|
| AUTH-0901 | Organization Access Revoked |
| AUTH-0902 | User Disabled by Administrator |
| AUTH-0903 | Organization Policy Violation |

---

# Error Response Structure

Every API error response should include:

| Field | Required |
|--------|----------|
| Error Code | ✅ |
| Message | ✅ |
| HTTP Status | ✅ |
| Timestamp | ✅ |
| Correlation ID | ✅ |
| Details | Optional |

Sensitive implementation details must never be exposed.

---

# Localization

Messages should be localizable.

Applications should rely on:

- Error Code
- Message Key

Instead of hardcoded text.

---

# Logging

All authentication errors should generate:

- Audit Event
- Correlation ID
- Security Classification
- Diagnostic Metadata (Internal Only)

---

# Related Documents

- FEATURES.md
- STATES.md
- EVENTS.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Document:
FAQ.md