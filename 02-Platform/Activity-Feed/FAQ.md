---
status: Draft
version: 1.0.0
document: ACTIVITY_FEED_FAQ
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
  - STATES.md
  - SECURITY.md
approval_status: Pending
---

# Activity Feed FAQ

## Purpose

This document answers common architectural, operational, and implementation questions about the Activity Feed module.

---

# General

## What is the Activity Feed?

The Activity Feed is the platform's canonical operational timeline.

It converts domain events into human-readable activities that help users understand what has happened across organizations, workspaces, and business modules.

---

## Is Activity Feed the same as Audit Logging?

No.

Activity Feed is designed for user visibility.

Audit Logging is designed for compliance, security investigations, and forensic analysis.

The two modules are independent.

---

## Does Activity Feed own business data?

No.

Business modules remain the source of truth.

Activity Feed stores only normalized activity records derived from domain events.

---

# Activities

## What is an Activity?

An Activity is a human-readable representation of a completed platform or business event.

Example:

```
Sarah Williams uploaded
Marketing_Budget.xlsx
2 minutes ago
```

instead of

```
FILE.UPLOADED
```

---

## Can activities be edited?

No.

Published activities are immutable.

If business data changes later, a new activity should be created instead of modifying an existing one.

---

## Can activities be deleted?

Normally no.

Activities follow platform retention policies.

Administrative archival or expiration may remove activities from active timelines while preserving historical integrity.

---

# Timelines

## What timeline scopes are supported?

Examples include:

- User
- Team
- Workspace
- Organization
- Platform

Additional scopes may be introduced by future modules.

---

## Can one activity appear in multiple timelines?

Yes.

A single activity may be visible in multiple authorized timelines depending on its scope.

For example, a file upload may appear in:

- User Timeline
- Workspace Timeline
- Organization Timeline

without duplicating the underlying activity record.

---

## Are timelines real-time?

They can be.

Supported delivery methods may include:

- REST APIs
- WebSockets
- Server-Sent Events (SSE)

Real-time updates are optional and implementation-specific.

---

# Processing

## How are activities created?

Business modules publish domain events.

The Activity Feed consumes those events, normalizes them, enriches them with display metadata, and publishes activity records.

---

## What happens if processing fails?

The platform retries transient failures.

Persistent failures may be routed to a dead-letter queue and investigated operationally.

Business transactions should not fail because Activity Feed processing fails.

---

## Are duplicate activities possible?

The Activity Feed should be idempotent.

Duplicate source events should not generate duplicate published activities.

---

# Security

## Who controls activity visibility?

The Permissions module.

The Activity Feed consumes authorization decisions and applies visibility filtering before returning timeline data.

---

## Can users view activities from another organization?

No.

Cross-organization activity visibility is prohibited unless explicitly allowed by platform policy.

---

## Can archived activities still be accessed?

Potentially.

Access depends on:

- Retention policy
- Administrative permissions
- Authorization rules

Archived activities are generally excluded from default timelines.

---

# Search & Filtering

## Can activities be searched?

Yes.

Supported search may include:

- Actor
- Entity
- Activity type
- Metadata
- Date range

Search capabilities are provided through the Search module.

---

## Can activities be filtered?

Yes.

Typical filters include:

- Organization
- Workspace
- User
- Team
- Entity Type
- Activity Type
- Date Range

Business modules may introduce additional filters.

---

# Integrations

## Which modules publish activities?

Examples include:

- Authentication
- Organizations
- Teams
- Users
- Permissions
- Workspaces
- Files
- Tags
- Notifications
- Search
- CRM
- Projects
- Forms
- AI
- Automation

Future modules may also publish events.

---

## Does Activity Feed send notifications?

No.

Notifications are owned by the Notifications module.

Activity Feed provides historical visibility, while Notifications deliver actionable messages.

---

## Does Activity Feed index activities?

No.

The Search module owns indexing.

Activity Feed exposes activity records that may optionally be indexed for search.

---

# Retention

## How long are activities retained?

Retention depends on platform policy.

Possible strategies include:

- Permanent retention
- Time-based retention
- Archival
- Automatic expiration

Organizations may configure different retention policies.

---

# Future

## What future capabilities are planned?

Potential enhancements include:

- AI-generated summaries
- Personalized feeds
- Activity subscriptions
- Mentions
- Comments
- Reactions
- Saved filters
- Cross-workspace dashboards

These enhancements extend the module without changing its core responsibilities.

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