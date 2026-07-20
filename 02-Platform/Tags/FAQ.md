---
status: Draft
version: 1.0.0
document: TAGS_FAQ
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
  - STATES.md
  - SECURITY.md
approval_status: Pending
---

# Tags FAQ

## Purpose

This document answers common architectural, operational, and implementation questions about the Tags module.

---

# General

## What is the Tags module?

The Tags module is the platform's canonical classification service.

It provides reusable labels that organize, classify, filter, automate, and analyze business entities across the Avonix AI platform.

---

## Does the Tags module own business entities?

No.

Business modules own their entities.

The Tags module owns only:

- Tag Definitions
- Tag Metadata
- Tag Assignments
- Tag Lifecycle
- Tag Governance

---

## Why separate Tags from business modules?

Keeping Tags independent allows:

- Reuse across modules
- Consistent filtering
- Platform-wide automation
- Unified analytics
- Central governance

---

# Tag Definitions

## What is a Tag Definition?

A Tag Definition describes the reusable tag itself.

Examples:

- VIP
- Urgent
- High Value
- Marketing

A Tag Definition exists independently of any assignment.

---

## What is a Tag Assignment?

A Tag Assignment links:

- Tag ID
- Entity Type
- Entity ID

Assignments connect tags to business entities.

---

## Can one tag be assigned to many entities?

Yes.

A single Tag Definition may be assigned to unlimited supported entities.

---

## Can an entity have multiple tags?

Yes.

Entities may have multiple Tag Assignments unless restricted by business policy.

---

# Scope

## What scopes are supported?

The Tags module supports:

- Organization Scope
- Workspace Scope

Future platform versions may introduce additional scopes if required.

---

## Can Workspace tags be used in another Workspace?

No.

Workspace-scoped tags are isolated.

Cross-workspace assignments are prohibited unless explicitly allowed by platform policy.

---

# Lifecycle

## What happens when a tag is archived?

Existing assignments remain valid.

New assignments are not allowed.

---

## What is a deprecated tag?

Deprecated tags remain available for historical reporting but should not receive new assignments.

Replacement tags may be suggested.

---

## Can archived tags be restored?

Yes.

The original Tag ID is preserved.

Historical assignments remain intact.

---

# Automation

## Can tags trigger automation?

Yes.

Examples include:

- Workflow execution
- Notifications
- AI processing
- CRM automations

The Automation module owns execution logic.

---

## Do tags contain automation rules?

No.

The Tags module publishes events only.

Automation behavior belongs to the Automation module.

---

# Search

## Can entities be filtered by tags?

Yes.

Tags are intended to support filtering, grouping, and segmentation.

Search indexing is handled outside the Tags module.

---

## Does the Tags module own search indexes?

No.

The Search module owns indexing.

The Tags module provides classification metadata only.

---

# Security

## Who controls tag permissions?

The Permissions module.

The Tags module never evaluates authorization independently.

---

## Are cross-organization assignments allowed?

No.

Cross-tenant assignments are prohibited by default.

---

## Can protected tags be deleted?

Generally no.

Platform policy determines whether protected tags can be modified or deleted.

---

# Audit

## Are tag assignments audited?

Yes.

Assignments generate audit records according to platform policy.

---

## Can audit history be deleted?

No.

Audit records are immutable and managed independently from Tag Definitions.

---

# Analytics

## Can analytics use tags?

Yes.

Analytics may use tags for:

- Segmentation
- Reporting
- Trends
- Usage statistics

Analytics consume tag data but do not own it.

---

# Future

## Will AI automatically assign tags?

Potentially.

Future platform capabilities may include:

- AI classification
- Suggested tags
- Automatic tagging
- Smart recommendations

These features consume the Tags module but remain separate platform capabilities.

---

# Related Documents

- README.md
- FEATURES.md
- STATES.md
- EVENTS.md
- ERROR_CODES.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Module Status:
Complete