---
status: Draft
version: 1.0.0
document: SERVICE_ACCOUNTS_EVENTS
owner: Platform Identity Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - STATES.md
approval_status: Pending
---

# Service Accounts Events

## Purpose

This document defines the canonical event model for the Service Accounts module.

Service Account events communicate lifecycle changes, administrative operations, authentication activities, and identity management actions across the Avonix AI platform.

These events enable auditing, monitoring, automation, analytics, and reliable event-driven integrations.

---

# Objectives

Service Account events must:

- Represent completed actions.
- Be immutable.
- Support auditing.
- Enable automation.
- Support monitoring.
- Preserve ordering.
- Remain provider-independent.

---

# Design Principles

Events must be:

- Immutable
- Versioned
- Replay-safe
- Idempotent
- Ordered per Service Account
- Security-aware

Each event represents one completed business action.

---

# Standard Event Schema

Every event should include:

| Field | Required |
|--------|----------|
| Event ID | ✅ |
| Event Name | ✅ |
| Event Version | ✅ |
| Service Account ID | ✅ |
| Organization ID | ✅ |
| Workspace ID | Optional |
| Actor ID | Optional |
| Actor Type | Optional |
| Correlation ID | ✅ |
| Timestamp (UTC) | ✅ |
| Metadata | Optional |

---

# Lifecycle Events

- SERVICE_ACCOUNT.CREATED
- SERVICE_ACCOUNT.ACTIVATED
- SERVICE_ACCOUNT.DISABLED
- SERVICE_ACCOUNT.ARCHIVED

Lifecycle events describe identity state transitions.

Each successful transition must publish exactly one lifecycle event.

---

# Identity Events

- SERVICE_ACCOUNT.RENAMED
- SERVICE_ACCOUNT.METADATA.UPDATED
- SERVICE_ACCOUNT.LABELS.UPDATED
- SERVICE_ACCOUNT.TAGS.UPDATED

Identity events describe updates to mutable metadata.

Identity identifiers must never change.

---

# Organization & Workspace Events

- SERVICE_ACCOUNT.ORGANIZATION.ASSIGNED
- SERVICE_ACCOUNT.WORKSPACE.ASSIGNED
- SERVICE_ACCOUNT.WORKSPACE.REMOVED

These events describe administrative placement within the platform hierarchy.

Cross-organization reassignment is not supported.

---

# Permission Events

The Service Accounts module publishes relationship events such as:

- SERVICE_ACCOUNT.PERMISSIONS.ASSIGNED
- SERVICE_ACCOUNT.PERMISSIONS.REMOVED
- SERVICE_ACCOUNT.ROLES.ASSIGNED
- SERVICE_ACCOUNT.ROLES.REMOVED

Authorization decisions remain the responsibility of the Permissions module.

---

# API Key Relationship Events

The module records ownership changes through:

- SERVICE_ACCOUNT.APIKEY.ATTACHED
- SERVICE_ACCOUNT.APIKEY.DETACHED

Credential lifecycle events themselves are owned by the API Keys module.

---

# Authentication Events

Authentication-related events include:

- SERVICE_ACCOUNT.AUTHENTICATION.SUCCEEDED
- SERVICE_ACCOUNT.AUTHENTICATION.FAILED

Authentication always requires a valid API Key and an Active Service Account.

---

# Usage Events

Operational usage events include:

- SERVICE_ACCOUNT.FIRST.USED
- SERVICE_ACCOUNT.LAST.USED.UPDATED
- SERVICE_ACCOUNT.USAGE.UPDATED

These events support reporting and analytics.

---

# Security Events

Security-related events include:

- SERVICE_ACCOUNT.UNAUTHORIZED.ACCESS
- SERVICE_ACCOUNT.DISABLED.AUTHENTICATION
- SERVICE_ACCOUNT.SUSPICIOUS.ACTIVITY
- SERVICE_ACCOUNT.POLICY.VIOLATION

Security events should be prioritized for monitoring and incident response.

---

# Event Ordering

Ordering must be preserved per Service Account.

Example:

SERVICE_ACCOUNT.CREATED

↓

SERVICE_ACCOUNT.ACTIVATED

↓

SERVICE_ACCOUNT.APIKEY.ATTACHED

↓

SERVICE_ACCOUNT.AUTHENTICATION.SUCCEEDED

↓

SERVICE_ACCOUNT.DISABLED

↓

SERVICE_ACCOUNT.ARCHIVED

---

# Event Consumers

Typical consumers include:

- API Keys
- Permissions
- Audit Logging
- Activity Feed
- Search
- Analytics
- Monitoring
- Automation
- Webhooks

Consumers should process events asynchronously.

---

# Correlation

Every Service Account event must include a Correlation ID.

Correlation enables tracing across:

- Authentication
- API Keys
- Permissions
- Audit Logging
- Activity Feed
- Monitoring
- Automation
- Business Modules

---

# Failure Handling

Consumers should:

- Ignore duplicate events.
- Preserve ordering.
- Retry transient failures.
- Reject unsupported versions.
- Record processing failures.

Events must never be silently discarded.

---

# Versioning

Events follow semantic versioning.

Breaking payload changes require new event versions.

Consumers should ignore unknown fields whenever possible.

---

# Privacy

Service Account events must never expose:

- API secrets
- Secret hashes
- Authentication tokens
- Passwords
- Cryptographic material
- Internal implementation details

Only canonical metadata required for processing should be published.

---

# Related Documents

- README.md
- STATES.md
- ERROR_CODES.md
- SECURITY.md
- AUDIT_LOGGING.md
- FAQ.md

---

Status: Draft

Approval Required: Yes

Next Document:
ERROR_CODES.md