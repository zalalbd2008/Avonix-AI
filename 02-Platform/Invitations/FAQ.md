---
status: Draft
version: 1.0.0
document: INVITATIONS_FAQ
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
approval_status: Pending
---

# Invitations FAQ

## Purpose

This document answers common architectural and operational questions about the Invitations module.

It clarifies ownership, responsibilities, lifecycle boundaries, security considerations, and integration patterns across the Avonix AI platform.

---

# Frequently Asked Questions

## What is the Invitations module?

The Invitations module manages secure onboarding into Organizations, Teams, and Workspaces.

It coordinates invitation workflows but does not own memberships.

---

## Does accepting an invitation create membership?

Not directly.

Invitation acceptance initiates the onboarding workflow.

The corresponding Membership-owning module creates the actual membership.

---

## Does the Invitations module authenticate users?

No.

Authentication is handled exclusively by the Authentication module.

Invitation acceptance always requires identity verification.

---

## Does the Invitations module authorize access?

No.

Authorization decisions belong to the Permissions module.

The Invitations module validates invitation state and policies only.

---

## Can invitations be sent to users without accounts?

Yes.

Recipients may already exist as Users or may create an account during the onboarding process.

Authentication requirements remain unchanged.

---

## Can an invitation be reused?

No.

Invitation tokens are single-use.

Once consumed, the token becomes permanently invalid.

---

## What happens when an invitation expires?

Expired invitations cannot be accepted.

A new invitation must be created.

Expired invitations remain available for audit purposes.

---

## Can a revoked invitation be restored?

No.

Revoked invitations are terminal.

If access is still required, a new invitation should be created.

---

## Can Organizations restrict invitations?

Yes.

Organizations may define policies such as:

- Allowed email domains
- Guest access
- Approval requirements
- Expiration periods
- Invitation quotas

Policies are enforced before issuance and again during acceptance.

---

## Can invitations cross Organization boundaries?

No.

Each invitation belongs to exactly one Organization context.

Cross-tenant onboarding requires explicit platform support.

---

## Who owns invitation delivery?

The Invitations module requests delivery.

The Notifications module performs delivery.

Supported delivery channels may include:

- Email
- In-App Notifications
- Secure Links

---

## Who owns invitation tokens?

The Invitations module owns invitation token generation, validation, expiration, and consumption.

Authentication tokens remain owned by the Authentication module.

---

## Are invitation operations audited?

Yes.

Security-sensitive operations are recorded as immutable audit records.

Examples include:

- Invitation creation
- Acceptance
- Revocation
- Expiration
- Token validation

---

## Can Business Modules create invitations?

Business modules may request invitation creation through the Invitations module.

They should never implement independent invitation systems.

---

## What happens if membership provisioning fails?

The invitation remains in an accepted onboarding state until recovery succeeds or administrative action is taken.

Membership lifecycle remains independent from invitation lifecycle.

---

# Design Summary

The Invitations module owns:

- Invitation lifecycle
- Invitation tokens
- Validation
- Expiration
- Revocation
- Acceptance workflow

The Invitations module does not own:

- Authentication
- Membership
- Authorization
- Notification delivery
- User profiles

---

# Related Documents

- README.md
- FEATURES.md
- STATES.md
- EVENTS.md
- ERROR_CODES.md
- SECURITY.md
- AUDIT_LOGGING.md
- ../Authentication/README.md
- ../Permissions/README.md
- ../Users/README.md

---

Status: Draft

Approval Required: Yes

End of Invitations Module Documentation