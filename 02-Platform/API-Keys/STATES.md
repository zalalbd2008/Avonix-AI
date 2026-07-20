---
status: Draft
version: 1.0.0
document: API_KEYS_STATES
owner: Platform Security Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
approval_status: Pending
---

# API Keys States

## Purpose

This document defines the canonical lifecycle states for API Keys within the Avonix AI platform.

API Keys are long-lived machine identities that progress through a secure lifecycle from creation to revocation or expiration. State transitions ensure secure authentication, governance, and operational consistency.

---

# Objectives

The lifecycle must:

- Protect machine identities.
- Support secure activation.
- Enable key rotation.
- Support temporary suspension.
- Prevent unauthorized reuse.
- Preserve audit history.
- Support automated expiration.

---

# Design Principles

API Key states should be:

- Deterministic
- Event-driven
- Auditable
- Replay-safe
- Secure by Default

State transitions must be explicit and validated.

---

# API Key Lifecycle

```
Created

↓

Active

├──────────────┐
│              │
▼              ▼
Disabled     Rotating
│              │
│              ▼
│         Active
│
▼
Revoked

Active

↓

Expired
```

---

# State Definitions

## Created

A new API Key has been generated.

Characteristics:

- Secret generated
- Secret displayed once
- Hash stored
- Awaiting activation

The key cannot authenticate requests.

---

## Active

The API Key is valid and may authenticate requests.

Characteristics:

- Authentication enabled
- Scope validation enabled
- Usage tracking enabled
- Audit enabled

Only Active keys may be used.

---

## Disabled

The API Key has been temporarily suspended.

Characteristics:

- Authentication denied
- Configuration retained
- Re-activation permitted

Suitable for maintenance or temporary suspension.

---

## Rotating

The API Key is undergoing credential rotation.

Operations include:

- Generate new secret
- Validate replacement
- Revoke previous secret
- Preserve logical identity

Rotation should be atomic.

---

## Revoked

The API Key has been permanently invalidated.

Characteristics:

- Authentication denied
- Irreversible
- Historical record preserved

Revoked keys must never become Active again.

---

## Expired

The API Key has reached its expiration date.

Characteristics:

- Authentication denied
- Historical metadata retained
- May require replacement

Expiration occurs automatically according to policy.

---

# Rotation Workflow

```
Active

↓

Rotating

↓

New Secret Generated

↓

Old Secret Invalidated

↓

Active
```

Applications should update credentials before the old secret becomes invalid.

---

# State Transition Rules

| Current State | Allowed Next State |
|---------------|-------------------|
| Created | Active |
| Active | Disabled |
| Active | Rotating |
| Active | Revoked |
| Active | Expired |
| Disabled | Active |
| Disabled | Revoked |
| Rotating | Active |
| Rotating | Revoked |

All other transitions are invalid.

---

# Authentication Rules

Authentication outcomes by state:

| State | Authentication |
|--------|----------------|
| Created | ❌ Denied |
| Active | ✅ Allowed |
| Disabled | ❌ Denied |
| Rotating | ⚠ Provider-defined (grace period optional) |
| Revoked | ❌ Denied |
| Expired | ❌ Denied |

---

# Expiration Policy

Supported policies include:

- Never expires
- Fixed expiration date
- Organization policy
- Workspace policy

Expired keys require replacement rather than reactivation.

---

# Usage Tracking

Usage information should include:

- Last Used At
- Last Authentication
- Authentication Count
- Failed Authentication Count
- Last Source IP (optional)

Usage metrics do not affect lifecycle state.

---

# Immutability

The following properties must never change after creation:

- Key ID
- Creation Timestamp
- Original Owner
- Audit History

The secret itself may only change through a formal rotation process.

---

# Related Documents

- README.md
- FEATURES.md
- EVENTS.md
- ERROR_CODES.md
- SECURITY.md
- AUDIT_LOGGING.md
- FAQ.md

---

Status: Draft

Approval Required: Yes

Next Document:
EVENTS.md