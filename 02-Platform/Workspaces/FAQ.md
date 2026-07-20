---
status: Draft
version: 1.0.0
document: WORKSPACES_FAQ
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - MEMBERSHIP.md
  - SECURITY.md
approval_status: Pending
---

# Workspace FAQ

## Purpose

This document answers common questions about the Workspaces module.

It serves as the canonical reference for developers, administrators, security engineers, QA teams, support teams, and AI-assisted code generation.

---

# General

## What is a Workspace?

A Workspace is the primary operational environment where people, resources, applications, automation, and AI capabilities collaborate.

It is the default business context within an Organization.

---

## Does every Workspace belong to an Organization?

Yes.

Every Workspace belongs to exactly one Organization.

Cross-Organization ownership is not supported.

---

## Can a Workspace exist without an Organization?

No.

Organization ownership is mandatory throughout the Workspace lifecycle.

---

# Membership

## Who can join a Workspace?

Only active Organization Members may become Workspace Members.

Organization Membership is a prerequisite.

---

## Can a user belong to multiple Workspaces?

Yes.

A user may belong to multiple Workspaces within the same Organization, subject to Organization policies and assigned permissions.

---

## Does Workspace Membership automatically create Team Membership?

No.

Workspace Membership and Team Membership are independent.

Organizations may choose to synchronize them through automation or policy.

---

# Permissions

## Does Workspace Membership grant permissions?

No.

Workspace Membership grants access to the Workspace.

Permissions determine which actions a member may perform.

---

## Who evaluates permissions?

The Permissions module.

Workspaces never evaluate authorization independently.

---

## Can Workspace Owners bypass authorization?

No.

Workspace Owners remain subject to RBAC, ABAC, and Organization policies.

---

# Resources

## What kinds of resources belong to a Workspace?

Examples include:

- CRM
- Forms
- AI Agents
- Chatbots
- Automations
- Files
- Knowledge Bases
- Reports
- Dashboards

Individual modules define their own resource models.

---

## Can resources move between Workspaces?

Yes, if explicitly supported by the owning module and Organization policy.

Resource transfers should generate lifecycle events and audit records.

---

# Lifecycle

## What happens when a Workspace is archived?

Typical effects include:

- Resource creation blocked
- Membership changes blocked
- Automation paused
- AI operations suspended by default
- Existing data preserved

Exact behavior may vary according to Organization policy.

---

## Can an archived Workspace be restored?

Yes, if permitted by Organization policy and the Workspace has not entered the Deleted state.

---

## Can deleted Workspaces be recovered?

No.

Deletion is permanent.

Audit records remain subject to retention policies.

---

# Settings

## Can Workspace settings override Organization policies?

No.

Organization policies always take precedence.

Workspace settings may extend but must not weaken mandatory Organization restrictions.

---

## Can each Workspace have different AI settings?

Yes.

Workspace-level AI configuration may differ, provided it complies with Organization policies.

---

# Security

## Is Workspace isolation enforced?

Yes.

Every request must include valid Organization and Workspace context.

Unauthorized cross-Workspace access is prohibited.

---

## Can Workspaces share resources?

Not by default.

Any sharing capability must be explicitly defined by the owning module and approved by Organization policy.

---

## Are Workspace operations audited?

Yes.

Security-sensitive and administrative operations generate immutable audit records.

---

# Development

## Should business modules implement Workspace logic?

Business modules should consume the Workspace context.

Workspace lifecycle, membership, and governance remain the responsibility of the Workspaces module.

---

## Should applications trust the client-selected Workspace?

No.

The server must validate:

- Organization context
- Workspace context
- Membership
- Permissions
- Policies

Client-provided identifiers are never trusted without validation.

---

# Future Enhancements

Potential future capabilities include:

- Nested Workspaces
- Shared Workspaces
- Workspace Templates
- Cross-Workspace Collaboration
- AI Workspace Assistants
- Workspace Snapshots
- Workspace Cloning
- Workspace Federation

---

# Related Documents

- README.md
- FEATURES.md
- STATES.md
- EVENTS.md
- ERROR_CODES.md
- WORKSPACE_LIFECYCLE.md
- MEMBERSHIP.md
- SETTINGS.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Module:
Projects