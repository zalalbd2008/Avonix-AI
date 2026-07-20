---
status: Draft
version: 1.0.0
document: ORGANIZATION_ERROR_CODES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - FEATURES.md
  - STATES.md
  - EVENTS.md
approval_status: Pending
---

# Organization Error Codes

## Purpose

This document defines the standardized error codes for the Organizations module.

Organization error codes provide a consistent contract between backend services, frontend applications, APIs, automation workflows, support teams, and audit systems.

---

# Objectives

Organization error codes must:

- Be globally unique.
- Remain stable across versions.
- Be safe for client applications.
- Support localization.
- Avoid exposing sensitive implementation details.
- Be easy to trace through logs and audit records.

---

# Error Code Format

Pattern:

ORG-XXXX

Examples:

ORG-0001

ORG-0105

ORG-0702

---

# Error Categories

| Range | Category |
|--------|----------|
| ORG-0001–0099 | General |
| ORG-0100–0199 | Organization Lifecycle |
| ORG-0200–0299 | Membership |
| ORG-0300–0399 | Invitations |
| ORG-0400–0499 | Ownership |
| ORG-0500–0599 | Settings |
| ORG-0600–0699 | Policies |
| ORG-0700–0799 | Security |
| ORG-0800–0899 | Billing |
| ORG-0900–0999 | Administrative |

---

# General Errors

| Code | Description |
|------|-------------|
| ORG-0001 | Organization Not Found |
| ORG-0002 | Invalid Organization Identifier |
| ORG-0003 | Organization Service Unavailable |
| ORG-0004 | Operation Not Allowed |

---

# Organization Lifecycle Errors

| Code | Description |
|------|-------------|
| ORG-0101 | Organization Already Exists |
| ORG-0102 | Organization Provisioning Failed |
| ORG-0103 | Organization Archived |
| ORG-0104 | Organization Suspended |
| ORG-0105 | Organization Scheduled For Deletion |
| ORG-0106 | Organization Deleted |

---

# Membership Errors

| Code | Description |
|------|-------------|
| ORG-0201 | Member Not Found |
| ORG-0202 | User Already Member |
| ORG-0203 | Maximum Member Limit Reached |
| ORG-0204 | Member Suspended |
| ORG-0205 | Cannot Remove Organization Owner |

---

# Invitation Errors

| Code | Description |
|------|-------------|
| ORG-0301 | Invitation Not Found |
| ORG-0302 | Invitation Expired |
| ORG-0303 | Invitation Already Accepted |
| ORG-0304 | Invitation Cancelled |
| ORG-0305 | Invitation Already Sent |

---

# Ownership Errors

| Code | Description |
|------|-------------|
| ORG-0401 | Ownership Transfer Not Allowed |
| ORG-0402 | Invalid New Owner |
| ORG-0403 | Owner Cannot Remove Self |
| ORG-0404 | Ownership Verification Required |

---

# Settings Errors

| Code | Description |
|------|-------------|
| ORG-0501 | Invalid Organization Settings |
| ORG-0502 | Unsupported Time Zone |
| ORG-0503 | Unsupported Language |
| ORG-0504 | Branding Configuration Invalid |

---

# Policy Errors

| Code | Description |
|------|-------------|
| ORG-0601 | Invalid Organization Policy |
| ORG-0602 | Policy Conflict Detected |
| ORG-0603 | Policy Update Not Allowed |

---

# Security Errors

| Code | Description |
|------|-------------|
| ORG-0701 | Organization Access Denied |
| ORG-0702 | Security Policy Violation |
| ORG-0703 | Organization Locked |
| ORG-0704 | Administrative Approval Required |

---

# Billing Errors

| Code | Description |
|------|-------------|
| ORG-0801 | Subscription Required |
| ORG-0802 | Subscription Expired |
| ORG-0803 | Plan Limit Exceeded |
| ORG-0804 | Billing Account Not Configured |

---

# Administrative Errors

| Code | Description |
|------|-------------|
| ORG-0901 | Administrative Action Required |
| ORG-0902 | Insufficient Organization Privileges |
| ORG-0903 | Organization Policy Restriction |

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

Internal implementation details must never be exposed to clients.

---

# Localization

Client applications should display localized messages using:

- Error Code
- Message Key

Instead of relying on hardcoded strings.

---

# Logging

Every organization error should generate:

- Audit Event
- Correlation ID
- Organization ID
- Security Classification
- Internal Diagnostic Metadata

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
ORGANIZATION_LIFECYCLE.md