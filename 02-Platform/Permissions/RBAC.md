---
status: Draft
version: 1.0.0
document: PERMISSIONS_RBAC
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
  - STATES.md
approval_status: Pending
---

# Role-Based Access Control (RBAC)

## Purpose

This document defines the Role-Based Access Control (RBAC) model for the Avonix AI platform.

RBAC provides a scalable, predictable, and auditable authorization model by assigning permissions to roles instead of directly assigning permissions to users.

---

# Objectives

The RBAC model must:

- Simplify permission management.
- Minimize administrative overhead.
- Support enterprise-scale deployments.
- Enable delegated administration.
- Maintain least-privilege access.
- Integrate with policy-based authorization.

---

# Core Concepts

## Permission

A Permission is the smallest unit of authorization.

Examples:

- organizations.view
- teams.create
- forms.publish
- crm.leads.export

Permissions are immutable platform capabilities.

---

## Role

A Role is a named collection of permissions.

Roles do not own users.

Users receive permissions through role assignments.

---

## Role Assignment

A Role Assignment connects:

User

↓

Role

↓

Scope

Only active assignments participate in authorization.

---

# Role Types

## System Roles

Built-in platform roles maintained by the platform.

Examples:

- Platform Owner
- Platform Administrator
- Organization Owner
- Organization Administrator
- Team Owner
- Team Administrator
- Editor
- Contributor
- Viewer

System roles cannot be modified directly.

---

## Custom Roles

Organizations may create custom roles.

Capabilities:

- Custom name
- Custom description
- Permission selection
- Scope restriction

Custom roles remain Organization-scoped.

---

# Supported Scopes

Roles may be assigned at:

- Platform
- Organization
- Team
- Workspace
- Resource

Assignments never cross Organization boundaries.

---

# Permission Resolution

Authorization evaluates permissions using the following order:

Platform Role

↓

Organization Role

↓

Team Role

↓

Workspace Role

↓

Resource Role

Permissions are combined before policy evaluation.

---

# Effective Permissions

Effective permissions are calculated from:

- Active role assignments
- Active permission assignments
- Current scope
- Organization status
- Team status
- Applicable policies

Only active assignments contribute to the final permission set.

---

# Multiple Role Assignments

A user may receive multiple roles.

The effective permission set is the union of all granted permissions within the evaluated scope.

Example:

Role A:

- forms.view
- forms.update

Role B:

- forms.publish

Effective Permissions:

- forms.view
- forms.update
- forms.publish

---

# Role Constraints

Roles must:

- Have immutable identifiers.
- Use unique names within an Organization.
- Reference valid permissions.
- Respect Organization boundaries.

---

# Reserved Roles

Reserved system roles:

- Platform Owner
- Organization Owner
- Team Owner

Reserved roles cannot be deleted.

Some properties may not be modified.

---

# Delegated Administration

Authorized administrators may:

- Create custom roles
- Update custom roles
- Assign roles
- Remove assignments
- Review access

Administrative authority is enforced through the Permissions module.

---

# Conflict Resolution

When multiple assignments exist:

1. Ignore inactive assignments.
2. Merge granted permissions.
3. Apply scope restrictions.
4. Evaluate authorization policies.
5. Produce the final authorization decision.

No implicit permission escalation is allowed.

---

# Revocation

Revoking a role assignment:

- Removes future authorization.
- Preserves audit history.
- Does not modify historical records.
- Invalidates affected authorization caches.

---

# Audit Requirements

Record:

- Role Created
- Role Updated
- Role Deleted
- Role Assigned
- Role Removed
- Permission Added
- Permission Removed

---

# Related Events

- ROLE.CREATED
- ROLE.UPDATED
- ROLE.DELETED
- ROLE.ASSIGNED
- ROLE.REMOVED

---

# Related Documents

- README.md
- ABAC.md
- POLICIES.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Document:
ABAC.md