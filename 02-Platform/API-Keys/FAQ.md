---
status: Draft
version: 1.0.0
document: API_KEYS_FAQ
owner: Platform Security Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
  - STATES.md
  - EVENTS.md
  - SECURITY.md
approval_status: Pending
---

# API Keys FAQ

## Purpose

This document answers common questions regarding the design, security, lifecycle, and operational behavior of the API Keys module.

---

# General Questions

## What is an API Key?

An API Key is a long-lived machine credential that authenticates applications, services, scripts, or integrations with the Avonix AI platform.

API Keys identify **machines**, not human users.

---

## Is an API Key the same as authentication?

No.

API Keys perform **authentication** by establishing a trusted machine identity.

Authorization decisions are made separately by the Permissions module using scopes, RBAC, ABAC, and policy evaluation.

---

## Can an API Key replace user login?

No.

Users authenticate through the Authentication module.

API Keys are intended exclusively for machine-to-machine communication.

---

## Can one API Key be shared across organizations?

No.

Every API Key belongs to exactly one organization.

Cross-organization authentication is never permitted.

---

## Can an API Key belong to a workspace?

An API Key may optionally be scoped to a specific workspace, depending on platform configuration.

Workspace scoping provides additional isolation beyond the organization boundary.

---

# Secret Management

## Why is the secret shown only once?

To minimize credential exposure.

After creation, only the cryptographic hash of the secret is stored.

The original secret cannot be recovered.

---

## Can the platform recover a lost secret?

No.

If a secret is lost, a new API Key or a rotated secret must be generated.

---

## Are API secrets encrypted?

Secrets should not be stored in recoverable form.

Instead, they should be stored as strong cryptographic hashes using approved algorithms.

---

# Lifecycle

## What happens when a key is disabled?

Authentication is denied until the key is reactivated.

Configuration, scopes, and audit history remain intact.

---

## What happens when a key is revoked?

Revocation permanently invalidates the API Key.

A revoked key can never become active again.

---

## What happens when a key expires?

Expired keys cannot authenticate.

A replacement or rotated credential must be created according to organizational policy.

---

## What is key rotation?

Rotation replaces the secret while preserving the logical API Key identity, metadata, usage history, and audit history.

---

# Security

## Are API Keys sufficient for authorization?

No.

Authentication confirms machine identity.

Authorization requires evaluation by the Permissions module.

---

## Can API Keys bypass RBAC or ABAC?

No.

Scopes define the maximum capabilities of an API Key but never override authorization policies.

---

## Are secrets stored in audit logs?

Never.

Secrets, hashes, salts, and cryptographic material are excluded from audit logs, events, and API responses.

---

## How does the platform detect compromised keys?

The platform may monitor:

- Repeated authentication failures
- Geographic anomalies
- Unusual request patterns
- Rate-limit violations
- Suspicious authentication behavior

Detection policies are configured by platform administrators.

---

# Operations

## Can API Keys be rotated without changing integrations?

Yes.

Rotation preserves the logical identity of the API Key while replacing only the underlying secret.

Applications simply update the stored credential.

---

## Can API Keys have expiration dates?

Yes.

Supported policies include:

- Never expires
- Fixed expiration date
- Organization policy
- Workspace policy

---

## Can API Keys be rate-limited?

Yes.

Rate limiting is typically enforced by the API Gateway or platform infrastructure.

---

## Can API Keys be restricted by IP?

Optionally, yes.

Organizations may configure allow lists or CIDR-based restrictions as an additional security control.

---

# Auditing

## Are API Key actions audited?

Yes.

All lifecycle transitions, administrative operations, and security-relevant authentication events generate immutable audit records.

---

## Can deleted or revoked keys lose their audit history?

No.

Audit history is retained according to platform retention policies regardless of the key's lifecycle state.

---

# Development

## Should applications store API secrets?

Applications should store API secrets securely using an approved secrets management solution.

Secrets should never be hardcoded into source code or committed to version control.

---

## Should API Keys be embedded in frontend applications?

No.

API Keys are intended for trusted server-side environments.

Public-facing frontend applications should use user authentication flows or other appropriate mechanisms.

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

End of API Keys Module Documentation.