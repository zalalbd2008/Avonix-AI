---
status: Draft
version: 1.0.0
document: SERVICE_ACCOUNTS_FAQ
owner: Platform Identity Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
  - STATES.md
  - EVENTS.md
  - SECURITY.md
approval_status: Pending
---

# Service Accounts FAQ

## Purpose

This document answers common questions regarding the design, security, lifecycle, and operational behavior of the Service Accounts module.

---

# General Questions

## What is a Service Account?

A Service Account is a non-human identity used by software rather than a person.

Examples include:

- AI Agents
- Backend Services
- Automation Workflows
- CI/CD Pipelines
- Scheduled Jobs
- Third-party Integrations
- Webhook Processors

---

## Is a Service Account the same as a User?

No.

Users represent people.

Service Accounts represent applications and automated workloads.

They have separate lifecycles, permissions, and authentication methods.

---

## Can a Service Account log into the web application?

No.

Service Accounts are intended for machine-to-machine communication.

Interactive login belongs exclusively to human users.

---

## Does every Service Account belong to an Organization?

Yes.

Every Service Account belongs to exactly one Organization.

Cross-organization ownership is never permitted.

---

## Can a Service Account belong to a Workspace?

Yes.

Workspace assignment is optional and provides additional isolation for machine identities.

---

# Authentication

## How does a Service Account authenticate?

Service Accounts authenticate using one or more API Keys.

The API Keys module validates credentials and establishes the associated Service Account identity.

---

## Can a Service Account have multiple API Keys?

Yes.

Multiple API Keys support:

- Credential rotation
- Environment separation
- Independent integrations
- High availability

All API Keys authenticate the same underlying Service Account identity.

---

## Can API Keys be shared between Service Accounts?

No.

Each API Key belongs to exactly one Service Account.

Credential ownership is exclusive.

---

## Can a disabled Service Account authenticate?

No.

Authentication is denied regardless of the state of any associated API Key.

The Service Account lifecycle always takes precedence.

---

# Authorization

## Does authentication grant permissions?

No.

Authentication establishes identity.

Authorization is evaluated separately by the Permissions module using:

- RBAC
- ABAC
- Policies
- Scopes

---

## Can Service Accounts bypass authorization?

No.

Service Accounts follow the same authorization framework as all other platform identities.

---

# Lifecycle

## What happens when a Service Account is disabled?

The identity remains intact, but:

- Authentication is denied.
- API Keys become unusable.
- Permissions are preserved.
- Audit history remains available.

The Service Account may be reactivated later.

---

## What happens when a Service Account is archived?

Archiving permanently retires the identity.

Archived Service Accounts:

- Cannot authenticate.
- Cannot be reactivated.
- Retain historical records.
- Remain available for compliance and audit purposes.

---

## Can a Service Account be deleted?

Service Accounts should generally be archived rather than deleted.

Archiving preserves audit history and maintains referential integrity across the platform.

---

# Security

## Should different applications share one Service Account?

No.

Each application, workload, or integration should use its own dedicated Service Account.

This improves:

- Least privilege
- Auditability
- Credential isolation
- Incident response

---

## Can AI Agents use Service Accounts?

Yes.

AI Agents should authenticate through dedicated Service Accounts with independently managed API Keys and permissions.

---

## Can Service Accounts access another Organization?

No.

Cross-tenant authentication and authorization are prohibited.

Tenant boundaries are always enforced.

---

## Are credentials stored by the Service Accounts module?

No.

Credential generation, storage, validation, rotation, and revocation are handled exclusively by the API Keys module.

The Service Accounts module stores only identity relationships.

---

# Operations

## Can Service Accounts be monitored?

Yes.

Operational monitoring may include:

- Authentication frequency
- Authentication failures
- Usage history
- Dormant identities
- Security anomalies

Monitoring is integrated with platform-wide observability systems.

---

## Are Service Accounts searchable?

Yes.

They may be searched using:

- Name
- Identifier
- Organization
- Workspace
- Labels
- Tags
- Metadata

Search indexing is handled by the Search module.

---

# Auditing

## Are Service Account activities audited?

Yes.

Lifecycle transitions, identity changes, authentication events, and relationship changes generate immutable audit records.

---

## Does archiving remove audit history?

No.

Audit history is preserved according to platform retention policies regardless of lifecycle state.

---

# Development

## Should Service Account credentials be stored in source code?

No.

API Keys should be stored using an approved secrets management solution.

Credentials must never be hardcoded or committed to version control.

---

## Should frontend applications use Service Accounts?

No.

Service Accounts are intended for trusted server-side environments.

Frontend applications should use user authentication mechanisms appropriate for public clients.

---

# Related Documents

- README.md
- FEATURES.md
- STATES.md
- EVENTS.md
- ERROR_CODES.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

End of Service Accounts Module Documentation.