---
status: Draft
version: 1.0.0
document: PERMISSIONS_FAQ
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - RBAC.md
  - ABAC.md
  - POLICIES.md
approval_status: Pending
---

# Permissions FAQ

## Purpose

This document answers common questions about the Permissions module.

It provides a canonical reference for developers, security engineers, administrators, QA teams, support teams, and AI-assisted code generation.

---

# General

## What is the purpose of the Permissions module?

The Permissions module determines whether an authenticated subject is authorized to perform a requested action.

Authentication identifies the subject.

Permissions authorize the action.

---

## Does the Permissions module authenticate users?

No.

Authentication belongs exclusively to the Authentication module.

---

## Does the Permissions module own users?

No.

Users are managed by the Authentication and Organization modules.

---

# Permissions

## What is a Permission?

A Permission is the smallest immutable authorization capability.

Example:

- forms.create
- crm.leads.view
- chatbot.publish

Permissions never contain business logic.

---

## Can Permissions be assigned directly to users?

The platform should prefer Role Assignments.

Direct Permission Assignments should only exist if explicitly supported by platform policy.

---

## Are Permission identifiers mutable?

No.

Permission identifiers are immutable.

Display names may change.

---

# Roles

## What is a Role?

A Role is a reusable collection of permissions.

Roles simplify authorization management.

---

## Can users have multiple Roles?

Yes.

Users may receive multiple active Role Assignments.

Effective permissions are calculated from all applicable assignments.

---

## Can System Roles be modified?

No.

System Roles are platform-managed.

Organizations may create Custom Roles instead.

---

## Can Custom Roles replace System Roles?

No.

Custom Roles complement System Roles.

Reserved platform roles remain protected.

---

# RBAC

## Does RBAC make the final authorization decision?

No.

RBAC resolves potential permissions.

The Policy Engine makes the final authorization decision after evaluating applicable policies.

---

## Does RBAC support inheritance?

Yes.

Role Assignments may be evaluated according to supported authorization scopes.

---

# ABAC

## Why is ABAC required if RBAC already exists?

RBAC answers:

"What permissions does the user have?"

ABAC answers:

"Can those permissions be exercised under the current conditions?"

---

## What attributes can ABAC evaluate?

Examples include:

- User attributes
- Team attributes
- Resource attributes
- Environment attributes
- Session attributes

---

# Policies

## Can Policies grant permissions?

No.

Policies may only restrict, condition, or validate permissions already resolved through RBAC.

---

## Can Policies deny access?

Yes.

Explicit Deny always overrides Allow.

---

## What happens if no Policy matches?

If no policy grants or modifies access, the authorization result follows the configured evaluation strategy.

When no explicit allow exists, the platform should deny access by default.

---

# Authorization

## What is the authorization order?

1. Authentication
2. Organization Validation
3. Membership Validation
4. RBAC Resolution
5. Attribute Collection
6. Policy Evaluation
7. Authorization Decision
8. Audit Logging

---

## Can authorization results be cached?

Yes.

Permission caches must be invalidated after:

- Role changes
- Policy changes
- Membership changes
- Organization status changes

---

# Security

## Can authorization cross Organization boundaries?

No.

Organizations are tenant boundaries.

Cross-Organization authorization is prohibited.

---

## Can users elevate their own permissions?

No.

Privilege escalation protection is mandatory.

---

## Are sensitive operations treated differently?

Yes.

Organizations may require:

- MFA
- Approval workflows
- Additional policy evaluation

---

# Audit Logging

## Are authorization decisions audited?

Yes.

Security-sensitive authorization decisions must generate immutable audit records.

---

## Can audit logs be modified?

No.

Audit records are append-only and immutable.

---

# Development

## Where should business rules be implemented?

Business rules belong to the consuming modules.

The Permissions module only evaluates authorization.

---

## Should applications bypass the Permissions module?

No.

All authorization decisions should pass through the centralized authorization engine.

---

## Should UI visibility replace authorization?

No.

UI visibility improves user experience but never replaces server-side authorization.

---

# Future Enhancements

Potential future capabilities include:

- Just-In-Time Access
- Delegated Administration
- Dynamic Policies
- External Policy Providers
- Risk-Based Authorization
- AI-Assisted Policy Recommendations

---

# Related Documents

- README.md
- FEATURES.md
- STATES.md
- EVENTS.md
- ERROR_CODES.md
- RBAC.md
- ABAC.md
- POLICIES.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Module:
Workspaces