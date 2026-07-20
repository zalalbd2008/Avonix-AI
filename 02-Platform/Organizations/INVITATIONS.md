---
status: Draft
version: 1.0.0
document: ORGANIZATION_INVITATIONS
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - MEMBERSHIP.md
  - ORGANIZATION_LIFECYCLE.md
approval_status: Pending
---

# Organization Invitations

## Purpose

This document defines how users are invited to join an Organization.

It standardizes invitation creation, delivery, acceptance, expiration, cancellation, and auditing.

Invitations are the preferred onboarding mechanism for adding members to an Organization.

---

# Objectives

The invitation system must:

- Prevent unauthorized organization access.
- Support secure onboarding.
- Allow invitation revocation.
- Support expiration policies.
- Maintain complete audit history.
- Support enterprise identity providers in the future.

---

# Core Principles

An invitation:

- Belongs to exactly one Organization.
- Targets one email address.
- May optionally target an existing User.
- Is single-use.
- Expires automatically.
- Cannot be reused after acceptance.

---

# Invitation Lifecycle

Created

↓

Pending Delivery

↓

Delivered

↓

Opened (Optional)

↓

Accepted

OR

Expired

OR

Cancelled

OR

Rejected

---

# Invitation States

## Created

Invitation has been generated but not yet delivered.

---

## Pending Delivery

Invitation is queued for delivery.

---

## Delivered

Invitation has been successfully delivered.

---

## Opened

Recipient has viewed the invitation.

Optional tracking depending on privacy policy.

---

## Accepted

Invitation has been accepted.

Results:

- Membership created.
- Invitation closed.
- Audit event generated.

---

## Expired

Invitation exceeded its validity period.

Cannot be accepted.

---

## Cancelled

Invitation revoked by an administrator.

Cannot be restored.

---

## Rejected

Recipient explicitly declined the invitation.

---

# Invitation Creation

Required Inputs

- Organization ID
- Recipient Email
- Role (optional)
- Initial Workspace (optional)
- Expiration Date
- Invited By

Validation

- Organization is Active.
- Inviter has permission.
- Recipient is not already a member.
- Duplicate active invitations are not allowed.

---

# Invitation Delivery

Supported Channels

- Email
- Enterprise Identity Provider (future)
- Secure Share Link (future)

Delivery failures should be retried according to platform retry policies.

---

# Invitation Acceptance

When accepted:

1. Validate invitation.
2. Verify expiration.
3. Verify organization status.
4. Authenticate or register the user.
5. Create Membership.
6. Assign initial role (if specified).
7. Generate audit event.
8. Publish ORG.MEMBER.JOINED.

---

# Expiration Policy

Default validity:

- 7 days

Organization settings may define:

- Custom expiration period
- Maximum validity
- Automatic reminders

Expired invitations cannot be reactivated.

A new invitation must be issued.

---

# Cancellation

Authorized users may cancel invitations before acceptance.

Effects:

- Invitation becomes invalid.
- Acceptance link is revoked.
- Audit event recorded.

---

# Duplicate Invitations

The platform should prevent multiple active invitations for the same:

- Organization
- Email Address

Unless organization policy explicitly allows replacements.

---

# Security Requirements

Invitation tokens must:

- Be cryptographically secure.
- Be single-use.
- Have an expiration timestamp.
- Never expose internal identifiers.
- Be invalidated immediately after acceptance or cancellation.

---

# Audit Requirements

Record:

- Invitation Created
- Invitation Sent
- Invitation Delivered
- Invitation Opened
- Invitation Accepted
- Invitation Expired
- Invitation Cancelled
- Invitation Rejected

---

# Related Events

- ORG.MEMBER.INVITED
- ORG.MEMBER.JOINED
- ORG.INVITATION.CANCELLED
- ORG.INVITATION.EXPIRED

---

# Related Documents

- MEMBERSHIP.md
- EVENTS.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Document:
SETTINGS.md