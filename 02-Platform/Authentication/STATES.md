---
status: Draft
version: 1.0.0
document: AUTHENTICATION_STATES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
approval_status: Pending
---

# Authentication States

## Purpose

This document defines the lifecycle states of users, authentication sessions, and account access within Avonix AI.

It serves as the authoritative state model for backend services, frontend UI behavior, API responses, automation workflows, and AI-assisted code generation.

---

# Objectives

The state model must:

- Provide predictable authentication behavior.
- Ensure secure state transitions.
- Prevent invalid state combinations.
- Support enterprise access policies.
- Simplify frontend and backend implementation.

---

# User Authentication Lifecycle

Anonymous

↓

Registering

↓

Email Verification Pending

↓

Active

↓

Authenticating

↓

MFA Required (Optional)

↓

Authenticated

↓

Session Expired

↓

Authenticated Again

↓

Logged Out

---

# User Account States

## ANONYMOUS

Description

No authenticated identity exists.

Allowed Actions

- Register
- Login
- Reset Password

Blocked Actions

- Access protected resources

---

## REGISTERING

Description

Registration has started but is not yet complete.

Entry Conditions

- Registration form submitted

Exit Conditions

- Verification email sent
- Registration cancelled
- Registration failed

---

## EMAIL_VERIFICATION_PENDING

Description

Account exists but email ownership has not yet been verified.

Allowed Actions

- Verify email
- Resend verification email
- Cancel registration

Blocked Actions

- Access protected features (unless organization policy allows limited access)

---

## ACTIVE

Description

The account is verified and available for authentication.

Allowed Actions

- Login
- Change password
- Enable MFA

---

## AUTHENTICATING

Description

The platform is validating user credentials.

Possible Outcomes

- Authenticated
- MFA Required
- Authentication Failed
- Account Locked
- Account Disabled

---

## MFA_REQUIRED

Description

Primary authentication succeeded but secondary verification is required.

Allowed Actions

- Submit MFA code
- Use recovery code
- Cancel login

---

## AUTHENTICATED

Description

The user has an active authenticated session.

Allowed Actions

- Access authorized resources
- Refresh session
- Logout
- Manage devices
- Update security settings

---

## SESSION_EXPIRED

Description

The authenticated session is no longer valid.

Allowed Actions

- Login again
- Refresh session (if supported)

---

## LOCKED

Description

Authentication is temporarily restricted due to policy.

Possible Causes

- Excessive failed login attempts
- Organization policy
- Security event

Exit Conditions

- Lock duration expires
- Administrator unlocks account

---

## DISABLED

Description

The account has been disabled.

Possible Causes

- Administrative action
- Organization removal
- Security violation

Blocked Actions

- All authentication

---

# State Transition Matrix

| Current State | Event | Next State |
|---------------|-------|------------|
| Anonymous | Register | Registering |
| Registering | Verification Email Sent | Email Verification Pending |
| Email Verification Pending | Email Verified | Active |
| Active | Login Requested | Authenticating |
| Authenticating | Login Success | Authenticated |
| Authenticating | MFA Required | MFA Required |
| MFA Required | Verification Success | Authenticated |
| Authenticated | Session Timeout | Session Expired |
| Authenticated | Logout | Anonymous |
| Any Active State | Administrative Disable | Disabled |
| Authenticating | Too Many Failures | Locked |

---

# Invalid State Transitions

The following transitions are prohibited:

- Disabled → Authenticated
- Anonymous → Authenticated
- Locked → Authenticated
- Email Verification Pending → Authenticated
- Session Expired → Authenticated (without re-authentication)

---

# State Persistence

Persist the following state information:

- Account Status
- Email Verification Status
- MFA Status
- Active Session Count
- Device Trust Status
- Failed Login Counter

---

# State Events

Each transition should generate a domain event.

Examples:

- UserRegistered
- EmailVerified
- LoginSucceeded
- LoginFailed
- MFACompleted
- SessionExpired
- AccountLocked
- AccountDisabled

---

# UI Guidelines

The user interface should clearly reflect each state.

Examples:

- Email Verification Pending → Show verification banner.
- MFA Required → Show MFA challenge.
- Session Expired → Redirect to login.
- Locked → Display lock reason and retry guidance.
- Disabled → Contact administrator.

---

# Related Documents

- FEATURES.md
- EVENTS.md
- LOGIN_FLOW.md
- SESSION_MANAGEMENT.md
- SECURITY.md

---

Status: Draft

Approval Required: Yes

Next Document:
EVENTS.md