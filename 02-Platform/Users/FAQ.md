---
status: Draft
version: 1.0.0
document: USER_FAQ
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
approval_status: Pending
---

# Users FAQ

## Purpose

This document answers common architectural and operational questions about the Users module.

It clarifies module boundaries, responsibilities, ownership, and integration patterns across the Avonix AI platform.

---

# Frequently Asked Questions

## What is the Users module?

The Users module is the canonical owner of user profile metadata, preferences, privacy settings, and presence information.

It represents the person within the platform.

---

## Does the Users module authenticate users?

No.

Authentication is handled exclusively by the Authentication module.

Authentication verifies identity.

The Users module manages profile information after authentication succeeds.

---

## Does the Users module authorize access?

No.

Authorization belongs to the Permissions module.

The Users module stores profile metadata but never makes authorization decisions.

---

## Can a user belong to multiple Organizations?

Yes.

A single User Profile may participate in multiple Organizations through Organization Membership.

The User Profile remains the same across all Organizations.

---

## Can profile visibility grant resource access?

No.

Profile visibility controls who may view profile information.

Resource access is determined independently by the Permissions module.

---

## Where are passwords stored?

Passwords are never stored in the Users module.

They belong exclusively to the Authentication module.

---

## Where are API keys stored?

API keys belong to the Authentication or API Keys modules.

They are not part of the User Profile.

---

## Can Organizations customize user information?

Yes.

Organizations may extend user information using custom attributes, provided the canonical User Profile remains unchanged.

---

## Are preferences shared across devices?

Yes.

User Preferences are designed to synchronize across supported devices.

Some preferences may vary by Workspace where explicitly supported.

---

## Is presence the same as authentication?

No.

Presence indicates user availability.

Authentication confirms user identity.

A user may be authenticated while appearing offline.

---

## Who owns localization settings?

Localization preferences belong to the Users module.

Organization policies may enforce minimum requirements.

---

## Can Business Modules modify User Profiles?

Business modules should use the Users module for profile updates.

They should not maintain independent copies of canonical profile metadata.

---

## Are profile changes audited?

Yes.

Security-sensitive profile changes are recorded in immutable audit logs.

---

## What happens when a profile is archived?

Archived profiles remain part of historical records.

Platform policy determines whether archival affects visibility, collaboration, or future reactivation.

---

## Can a profile be permanently deleted?

Deletion behavior depends on platform governance, regulatory requirements, and Organization retention policies.

Associated audit records may be retained even when profile data is removed.

---

## Which modules depend on Users?

Examples include:

- Organizations
- Workspaces
- CRM
- Forms
- Files
- AI Agents
- Notifications
- Automation
- Analytics

These modules consume User metadata but do not own it.

---

# Design Summary

The Users module owns:

- User Profile
- Preferences
- Privacy
- Presence
- Personalization

The Users module does not own:

- Authentication
- Authorization
- Sessions
- API Keys
- Passwords

---

# Related Documents

- README.md
- PROFILE.md
- PREFERENCES.md
- SECURITY.md
- AUDIT_LOGGING.md
- ../Authentication/README.md
- ../Permissions/README.md

---

Status: Draft

Approval Required: Yes

End of Users Module Documentation