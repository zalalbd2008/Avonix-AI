---
status: Draft
version: 1.0.0
document: TEAMS_ERROR_CODES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - FEATURES.md
  - STATES.md
  - EVENTS.md
approval_status: Pending
---

# Team Error Codes

## Purpose

This document defines the standardized error codes for the Teams module.

These error codes provide a consistent contract between backend services, frontend applications, APIs, automation workflows, and support tools.

---

# Objectives

Team error codes must:

- Be globally unique.
- Remain stable across platform versions.
- Support localization.
- Be safe for client applications.
- Be easy to troubleshoot.
- Never expose internal implementation details.

---

# Error Code Format

Pattern

TEAM-XXXX

Examples

TEAM-0001

TEAM-0203

TEAM-0701

---

# Error Categories

| Range | Category |
|--------|----------|
| TEAM-0001–0099 | General |
| TEAM-0100–0199 | Lifecycle |
| TEAM-0200–0299 | Membership |
| TEAM-0300–0399 | Ownership |
| TEAM-0400–0499 | Resources |
| TEAM-0500–0599 | Settings |
| TEAM-0600–0699 | Visibility |
| TEAM-0700–0799 | Security |
| TEAM-0800–0899 | Administrative |

---

# General Errors

| Code | Description |
|------|-------------|
| TEAM-0001 | Team Not Found |
| TEAM-0002 | Invalid Team Identifier |
| TEAM-0003 | Team Service Unavailable |
| TEAM-0004 | Operation Not Allowed |

---

# Lifecycle Errors

| Code | Description |
|------|-------------|
| TEAM-0101 | Team Already Exists |
| TEAM-0102 | Team Provisioning Failed |
| TEAM-0103 | Team Archived |
| TEAM-0104 | Team Scheduled For Deletion |
| TEAM-0105 | Team Deleted |

---

# Membership Errors

| Code | Description |
|------|-------------|
| TEAM-0201 | Member Not Found |
| TEAM-0202 | User Already Team Member |
| TEAM-0203 | User Is Not Organization Member |
| TEAM-0204 | Team Member Limit Reached |
| TEAM-0205 | Cannot Remove Last Team Owner |

---

# Ownership Errors

| Code | Description |
|------|-------------|
| TEAM-0301 | Ownership Transfer Not Allowed |
| TEAM-0302 | Invalid Team Owner |
| TEAM-0303 | Team Must Have At Least One Owner |
| TEAM-0304 | Ownership Verification Required |

---

# Resource Errors

| Code | Description |
|------|-------------|
| TEAM-0401 | Resource Assignment Failed |
| TEAM-0402 | Resource Already Assigned |
| TEAM-0403 | Resource Not Assigned To Team |
| TEAM-0404 | Resource Ownership Conflict |

---

# Settings Errors

| Code | Description |
|------|-------------|
| TEAM-0501 | Invalid Team Settings |
| TEAM-0502 | Invalid Team Name |
| TEAM-0503 | Team Name Already Exists |
| TEAM-0504 | Invalid Visibility Configuration |

---

# Visibility Errors

| Code | Description |
|------|-------------|
| TEAM-0601 | Invalid Visibility Level |
| TEAM-0602 | Visibility Policy Conflict |
| TEAM-0603 | Visibility Update Not Allowed |

---

# Security Errors

| Code | Description |
|------|-------------|
| TEAM-0701 | Team Access Denied |
| TEAM-0702 | Security Policy Violation |
| TEAM-0703 | Administrative Approval Required |

---

# Administrative Errors

| Code | Description |
|------|-------------|
| TEAM-0801 | Administrative Action Required |
| TEAM-0802 | Insufficient Team Privileges |
| TEAM-0803 | Team Policy Restriction |

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

Implementation details must never be exposed to clients.

---

# Localization

Client applications should localize error messages using:

- Error Code
- Message Key

Avoid hardcoded user-facing text.

---

# Logging

Every Team error should generate:

- Audit Event
- Correlation ID
- Organization ID
- Team ID
- Diagnostic Metadata
- Security Classification

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
TEAM_LIFECYCLE.md