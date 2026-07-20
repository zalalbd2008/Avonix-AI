---
status: Draft
version: 1.0.0
document: SEARCH_STATES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
approval_status: Pending
---

# Search States

## Purpose

This document defines the lifecycle of searchable documents and indexes managed by the Avonix AI Search module.

The Search module maintains searchable representations of business data while remaining independent from the systems that own the source records.

---

# Objectives

The Search lifecycle must:

- Support event-driven indexing.
- Preserve consistency.
- Enable incremental updates.
- Support full reindexing.
- Remain provider-independent.
- Preserve auditability.

---

# Design Principles

Search states must be:

- Deterministic
- Event-driven
- Replay-safe
- Provider-independent
- Eventually consistent
- Extensible

---

# Search Document Lifecycle

```
Created
    │
    ▼
Queued
    │
    ▼
Indexing
    │
 ┌──┴──────────────┐
 ▼                 ▼
Indexed         Failed
 │                 │
 │                 ▼
 │           Retry Scheduled
 │                 │
 ▼                 ▼
Updated        Indexing
 │
 ▼
Indexed
 │
 ▼
Deleted
```

---

# State Definitions

## Created

A searchable document has been created from a business entity.

Characteristics:

- Awaiting indexing
- Not searchable
- Immutable identifier assigned

---

## Queued

The document is waiting for indexing.

Characteristics:

- Ready for processing
- Awaiting index worker
- Retry eligible

---

## Indexing

The document is actively being indexed.

Characteristics:

- Search provider request in progress
- Awaiting completion
- Not queryable until successful

---

## Indexed

The document is successfully available for search.

Characteristics:

- Queryable
- Ranked
- Filterable
- Searchable

---

## Updated

The source entity changed.

Characteristics:

- Existing index outdated
- Awaiting synchronization

---

## Failed

Indexing failed.

Characteristics:

- Failure reason recorded
- Retry policy evaluated
- Audit generated

---

## Retry Scheduled

Another indexing attempt has been scheduled.

Characteristics:

- Retry count incremented
- Awaiting processing

---

## Deleted

The searchable document has been removed from the index.

Characteristics:

- No longer searchable
- Historical audit retained

---

# Index Lifecycle

Each search index follows its own lifecycle.

```
Created
    │
    ▼
Building
    │
    ▼
Ready
    │
 ├────────► Rebuilding
 │              │
 │              ▼
 │            Ready
 │
 ▼
Archived
```

---

# Index State Definitions

## Created

Logical index defined.

---

## Building

Initial indexing in progress.

---

## Ready

Available for queries.

---

## Rebuilding

Existing index is being regenerated.

Existing queries may continue using an alternate index or alias.

---

## Archived

Index retired.

No longer receives updates.

---

# Valid State Transitions

## Search Document

| From | To |
|------|----|
| Created | Queued |
| Queued | Indexing |
| Indexing | Indexed |
| Indexing | Failed |
| Failed | Retry Scheduled |
| Retry Scheduled | Queued |
| Indexed | Updated |
| Updated | Indexing |
| Indexed | Deleted |

---

## Search Index

| From | To |
|------|----|
| Created | Building |
| Building | Ready |
| Ready | Rebuilding |
| Rebuilding | Ready |
| Ready | Archived |

---

# Invalid State Transitions

| From | To |
|------|----|
| Deleted | Indexed |
| Archived | Ready |
| Failed | Indexed |
| Created | Indexed |

Terminal states:

- Deleted
- Archived

---

# Synchronization Rules

Index synchronization may occur through:

- Domain events
- Incremental updates
- Scheduled synchronization
- Full rebuild

The Search module must never modify source data.

---

# State Events

Typical lifecycle events include:

- SEARCH.DOCUMENT.CREATED
- SEARCH.DOCUMENT.QUEUED
- SEARCH.DOCUMENT.INDEXING.STARTED
- SEARCH.DOCUMENT.INDEXED
- SEARCH.DOCUMENT.UPDATED
- SEARCH.DOCUMENT.DELETED
- SEARCH.DOCUMENT.FAILED
- SEARCH.RETRY.SCHEDULED
- SEARCH.INDEX.CREATED
- SEARCH.INDEX.READY
- SEARCH.INDEX.REBUILD.STARTED
- SEARCH.INDEX.REBUILD.COMPLETED
- SEARCH.INDEX.ARCHIVED

---

# Persistence

Each state transition should record:

- Search Document ID
- Index ID
- Entity Type
- Entity ID
- Previous State
- New State
- Correlation ID
- Timestamp (UTC)

---

# Related Documents

- README.md
- FEATURES.md
- EVENTS.md
- ERROR_CODES.md
- INDEXES.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Document:
EVENTS.md