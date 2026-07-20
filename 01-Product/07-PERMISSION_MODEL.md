---
status: Draft
version: 1.0.0
document: PERMISSION_MODEL
owner: Platform Security Team
last_updated: 2026-07-19
depends_on:
  - 06-USER_ROLES.md
  - 05-PRODUCT_CAPABILITY_MAP.md
approval_status: Pending
---

# Permission Model

> "Roles define who a user is. Permissions define what a user can do."

---

# Purpose

This document defines the authorization model used throughout Avonix AI.

It establishes a consistent framework for:

- Role-Based Access Control (RBAC)
- Attribute-Based Access Control (ABAC)
- Resource protection
- Feature gating
- AI authorization
- Audit logging
- Enterprise governance

Permission implementation details belong to Engineering. This document defines the product-level authorization model.

---

# Authorization Principles

The permission system should always be:

- Least privileged
- Explicit
- Predictable
- Auditable
- Tenant-aware
- Extensible
- Policy-driven

Permissions are granted intentionally and never assumed.

---

# Authorization Layers

Authorization is evaluated through multiple layers.

```
Identity

↓

Authentication

↓

Role

↓

Permission

↓

Scope

↓

Policy

↓

Subscription

↓

Audit
```

A request must satisfy every applicable layer before it is allowed.

---

# Authorization Components

## Resource

A protected object within the platform.

Examples:

- Website
- Knowledge Base
- AI Assistant
- Conversation
- Contact
- Lead
- Workflow
- Report
- Billing
- Organization

---

## Action

An operation performed against a resource.

Standard actions include:

- View
- Create
- Update
- Delete
- Restore
- Export
- Import
- Configure
- Execute
- Publish
- Approve
- Assign
- Archive
- Manage

Products may introduce resource-specific actions where necessary.

---

## Scope

Determines where an action is valid.

Supported scopes:

- Self
- Assigned
- Team
- Department
- Organization
- Multi-Organization
- Platform

Example:

Support Agent

View Conversations

Scope:

Assigned

Organization Administrator

Manage Users

Scope:

Organization

Platform Administrator

Manage Organizations

Scope:

Platform

---

# Permission Structure

Every permission should follow a consistent format.

```
resource.action.scope
```

Examples:

```
website.view.organization

website.configure.organization

knowledge.publish.organization

workflow.execute.organization

conversation.view.assigned

report.export.organization

billing.manage.organization

organization.manage.platform
```

---

# Permission Categories

Permissions are grouped into logical domains.

- Identity
- Websites
- AI
- Knowledge
- CRM
- Conversations
- Forms
- Automation
- Reports
- Security
- Billing
- Integrations
- Administration

---

# Permission Evaluation

Every authorization request evaluates:

1. Identity
2. Authentication
3. Active Organization
4. Assigned Roles
5. Effective Permissions
6. Scope Validation
7. Policy Rules
8. Subscription Availability
9. Environment Restrictions
10. Final Decision

Permission evaluation should always be deterministic.

---

# Attribute-Based Policies (ABAC)

Certain permissions require contextual evaluation.

Supported attributes may include:

User Attributes

- Department
- Employment Status
- Organization Membership
- Region

Resource Attributes

- Owner
- Organization
- Classification
- Visibility
- Status

Environment Attributes

- Time
- IP Range
- Device Trust
- Session Risk

Example:

A user may export reports only during approved business hours from trusted devices.

---

# Subscription Enforcement

Permissions may also depend on the customer's subscription.

Examples:

Starter

- Basic AI
- Standard Reports
- Limited Automation

Professional

- AI Knowledge
- Advanced Automation
- CRM
- Analytics

Enterprise

- SSO
- SCIM
- Custom Roles
- Audit Policies
- Advanced Security
- API Extensions

Subscription restrictions should be enforced after identity validation but before execution.

---

# Feature Flags

Permissions may be modified by feature flags.

Examples:

- Beta AI Agent
- Experimental Automation
- Voice AI
- Enterprise Search

Feature flags never override security policies.

---

# Delegation

Users may temporarily delegate selected permissions.

Supported scenarios:

- Vacation coverage
- Temporary administration
- Incident response
- Team rotation

Delegation rules:

- Time limited
- Explicit approval
- Fully audited
- Revocable

---

# AI Authorization

AI is treated as a service identity.

AI never inherits unrestricted administrator privileges.

AI may:

- Read approved knowledge
- Summarize conversations
- Recommend actions
- Execute approved workflows

AI may not:

- Change billing
- Modify security policies
- Delete organizations
- Change subscription plans
- Grant permissions

Unless explicitly approved through policy.

---

# Sensitive Operations

Certain operations require elevated protection.

Examples:

- Delete Organization
- Transfer Ownership
- Modify Billing
- Change Security Policies
- Disable Audit Logs
- Rotate Encryption Keys
- Publish AI Policies

These actions may require:

- Multi-step confirmation
- Secondary authentication
- Approval workflow
- Audit recording

---

# Audit Requirements

Every permission-sensitive action should record:

- User
- Effective Role
- Permission Used
- Resource
- Action
- Scope
- Timestamp
- Organization
- IP Address
- Device
- Result

Audit logs should be immutable.

---

# Permission Inheritance

Permissions may be inherited through roles.

```
Platform Administrator

↓

Organization Administrator

↓

Manager

↓

Operational Roles
```

Inheritance should always be explicit and documented.

Deny rules take precedence over inherited allow rules.

---

# Design Principles

Permissions should never depend on:

- UI visibility
- Hidden menu items
- Client-side enforcement

Authorization must always be enforced by the backend.

---

# Relationship to Other Documents

This document defines the authorization model.

Related documents:

- USER_ROLES.md
- PRICING_MODEL.md
- LICENSING_MODEL.md
- MODULE_CATALOG.md

---

Status: Draft

Approval Required: Yes

Next Document:

08-PRICING_MODEL.md