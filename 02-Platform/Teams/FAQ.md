---
status: Draft
version: 1.0.0
document: TEAM_FAQ
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
  - STATES.md
  - EVENTS.md
  - SECURITY.md
approval_status: Pending
---

# Team FAQ

## Purpose

This document answers common questions about the Teams module.

It provides a single source of truth for developers, administrators, QA engineers, support teams, and AI-assisted code generation.

---

# General

## What is a Team?

A Team is a logical collaboration group within a single Organization.

Teams help organize members, assign resources, and simplify administration.

---

## Is a Team a tenant?

No.

The Organization is the tenant boundary.

A Team is only a collaboration boundary inside an Organization.

---

## Can a Team belong to multiple Organizations?

No.

Every Team belongs to exactly one Organization.

---

## Can a Team exist without an Organization?

No.

Organization lifecycle always precedes Team lifecycle.

---

# Membership

## Can a user belong to multiple Teams?

Yes.

An Organization Member may belong to multiple Teams.

---

## Can a Team Member exist without Organization Membership?

No.

Every Team Membership depends on an active Organization Membership.

---

## Does removing a Team Member remove them from the Organization?

No.

Removing Team Membership only removes access to that Team.

Organization Membership remains unchanged.

---

## Can the last Team Owner leave?

No.

Ownership must be transferred before the final Owner can leave or be removed.

---

# Ownership

## Can a Team have multiple Owners?

Yes, if Organization policy allows multiple Team Owners.

Otherwise, exactly one Owner is required.

---

## Does changing Team ownership change Organization ownership?

No.

Team ownership and Organization ownership are independent.

---

# Resources

## Does deleting a Team delete its resources?

No.

Resources must either:

- Be reassigned.
- Become unassigned.
- Follow the consuming module's lifecycle policy.

---

## Can resources belong to multiple Teams?

This depends on the consuming module.

The Teams module only defines the ownership contract, not resource-specific behavior.

---

# Lifecycle

## Can an archived Team be restored?

Yes.

If Organization policy permits restoration.

---

## Is Team deletion immediate?

No.

Teams enter a scheduled deletion period before permanent deletion.

---

# Security

## Are Teams security boundaries?

No.

Organizations are security boundaries.

Teams inherit Organization security policies.

---

## Who authorizes Team actions?

The Permissions module.

The Teams module defines relationships, not authorization logic.

---

# Settings

## Can Team settings override Organization policies?

No.

Organization policies always take precedence.

---

## Are Team settings versioned?

Yes.

Every update creates a new configuration version and audit record.

---

# Audit Logging

## Which Team actions are audited?

Examples include:

- Team creation
- Team deletion
- Membership changes
- Ownership transfers
- Settings updates
- Resource assignments
- Security-sensitive actions

---

## Can Team audit logs be modified?

No.

Audit records are immutable.

---

# Development

## Where should permissions be implemented?

Permissions belong exclusively to the Permissions module.

---

## Where should authentication be implemented?

Authentication belongs exclusively to the Authentication module.

---

## Where should Organization rules be implemented?

Organization lifecycle, tenant boundaries, and membership rules belong to the Organizations module.

---

## Which module owns Team resources?

The consuming module owns the resource.

Teams define assignment and collaboration boundaries only.

---

# Future Enhancements

Potential future capabilities include:

- Nested Teams
- Matrix Teams
- Dynamic Teams
- Team Templates
- AI-Generated Teams
- SCIM Team Synchronization
- Cross-Team Collaboration
- Temporary Project Teams

---

# Related Documents

- README.md
- FEATURES.md
- STATES.md
- EVENTS.md
- ERROR_CODES.md
- TEAM_LIFECYCLE.md
- MEMBERSHIP.md
- SETTINGS.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Module:
Permissions