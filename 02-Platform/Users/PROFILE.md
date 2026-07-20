---
status: Draft
version: 1.0.0
document: USER_PROFILE
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - STATES.md
  - ../Authentication/README.md
approval_status: Pending
---

# User Profile

## Purpose

This document defines the canonical User Profile model for the Avonix AI platform.

The User Profile stores platform-specific identity metadata used across all modules while remaining independent from authentication credentials and authorization decisions.

---

# Objectives

The User Profile must:

- Represent platform identity.
- Support personalization.
- Maintain privacy.
- Enable collaboration.
- Remain extensible.
- Preserve auditability.

---

# Design Principles

The User Profile must be:

- Identity-independent
- Authentication-independent
- Privacy-aware
- Organization-aware
- Extensible
- Backward compatible

Authentication verifies identity.

The User Profile represents the person within the platform.

---

# Ownership

Every User Profile belongs to exactly one authenticated User.

A User has exactly one canonical User Profile.

The profile may be referenced by multiple Organizations and Workspaces.

---

# Profile Structure

## Identity

Examples:

- User ID
- Display Name
- Preferred Name
- Pronouns (Optional)

The Authentication module owns login identifiers such as email addresses and usernames.

---

## Visual Identity

Examples:

- Avatar
- Banner Image (Future)
- Profile Color
- Initials

Visual assets are optional.

---

## Professional Information

Examples:

- Job Title
- Department
- Biography
- Skills (Future)

Organizations may extend this information through custom attributes.

---

## Localization

Examples:

- Preferred Language
- Locale
- Time Zone
- Date Format
- Time Format
- Number Format

Localization affects presentation only.

---

## Contact Information

The User Profile may expose limited contact metadata.

Examples:

- Public Email (Optional)
- Public Phone (Optional)
- Public Website (Optional)

Visibility is controlled by privacy settings.

Authentication contact information remains separate.

---

## Workspace Context

Workspace-specific metadata may include:

- Last Active Workspace
- Favorite Workspaces
- Recent Workspaces

Workspace membership remains managed by the Workspaces module.

---

# Visibility

Supported visibility levels:

- Private
- Workspace Members
- Organization Members
- Public (Policy Dependent)

Organization policy may restrict visibility options.

Visibility does not replace authorization.

---

# Profile Completeness

The platform may calculate a profile completeness score.

Example factors:

- Display Name
- Avatar
- Time Zone
- Language
- Biography

Completeness scores are informational only.

---

# Profile Updates

Profile updates must:

- Validate input
- Respect Organization policies
- Publish profile events
- Record audit entries
- Invalidate relevant caches

Updates should be atomic where practical.

---

# Profile References

Business modules should reference the User Profile instead of storing duplicate identity metadata.

Examples:

- CRM
- Forms
- AI Agents
- Files
- Automation
- Reports

Modules should cache profile information only when appropriate.

---

# Privacy

Sensitive information must never appear in the User Profile.

Examples of excluded information:

- Passwords
- Password hashes
- Authentication tokens
- MFA secrets
- Recovery codes
- Session identifiers

These belong exclusively to the Authentication module.

---

# Audit Requirements

Profile changes record:

- User ID
- Actor ID
- Changed Fields
- Previous Values
- New Values
- Timestamp (UTC)
- Correlation ID

Sensitive values should be redacted where appropriate.

---

# Related Events

Typical events include:

- USER.PROFILE.CREATED
- USER.PROFILE.UPDATED
- USER.VISIBILITY.UPDATED

---

# Related Documents

- README.md
- STATES.md
- EVENTS.md
- PREFERENCES.md
- SECURITY.md
- AUDIT_LOGGING.md
- ../Authentication/README.md

---

Status: Draft

Approval Required: Yes

Next Document:
PREFERENCES.md