---
status: Draft
version: 1.0.0
document: SEARCH_FAQ
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
  - STATES.md
  - SECURITY.md
approval_status: Pending
---

# Search FAQ

## Purpose

This document answers common architectural, operational, and implementation questions about the Search module.

---

# General

## What is the Search module?

The Search module is the platform's canonical indexing and query service.

It provides secure, scalable, provider-independent search across platform and business modules.

---

## Does the Search module own business data?

No.

Business modules own their data.

The Search module owns only searchable representations (indexes and search documents).

---

## Why separate Search from business modules?

Separating Search provides:

- Centralized indexing
- Consistent search behavior
- Independent scalability
- Faster queries
- Provider independence
- Future AI retrieval support

---

# Search Documents

## What is a Search Document?

A Search Document is a searchable representation of a business entity.

Examples include:

- CRM Lead
- Contact
- Project
- File
- Notification
- User

The Search Document is derived from the authoritative source.

---

## Can Search Documents be edited directly?

No.

Business modules own the source data.

Search Documents are updated through indexing operations.

---

# Indexes

## What is a logical index?

A logical index is the platform-facing abstraction.

Examples:

- users
- files
- projects
- crm_leads

Applications interact with logical indexes.

---

## What is a physical index?

A physical index is the provider-specific implementation.

Example:

```
crm_leads_v3
```

Physical indexes remain hidden behind aliases.

---

## Why use aliases?

Aliases provide:

- Zero-downtime deployments
- Safe index migrations
- Version isolation
- Provider flexibility

Applications never reference physical indexes directly.

---

# Synchronization

## How are indexes updated?

Indexes are synchronized through domain events.

Business modules publish changes.

The Search module consumes those events and updates searchable documents.

---

## Is indexing synchronous?

No.

Indexing is event-driven and eventually consistent.

The Search module does not block business transactions.

---

## Can indexes be rebuilt?

Yes.

The platform supports:

- Incremental indexing
- Full reindexing
- Alias switching
- Background rebuilding

---

# Queries

## Does Search support multiple indexes?

Yes.

Queries may target:

- One logical index
- Multiple logical indexes
- All searchable indexes

---

## Does Search support filtering?

Yes.

Examples include:

- Organization
- Workspace
- Tags
- Status
- Date
- Owner

Business modules may define additional searchable fields.

---

## Does Search support sorting?

Yes.

Examples:

- Relevance
- Created Date
- Updated Date
- Alphabetical
- Custom ranking

---

# Security

## Who controls authorization?

The Permissions module.

The Search module consumes authorization decisions but does not evaluate them independently.

---

## Can users search across organizations?

No.

Cross-organization searches are prohibited unless explicitly supported by platform policy.

---

## Can Search expose hidden records?

No.

Search results, suggestions, autocomplete, facet counts, and total result counts must all respect authorization boundaries.

---

# Providers

## Is the Search provider visible to business modules?

No.

Provider implementations remain hidden behind the Search module.

---

## Can providers be replaced?

Yes.

Supported implementations may include:

- OpenSearch
- Elasticsearch
- Meilisearch
- Typesense

Provider replacement must not change the platform contract.

---

# Analytics

## Does Search collect analytics?

Yes.

Examples include:

- Query volume
- Indexing throughput
- Reindex history
- Failure rates
- Latency

Operational analytics are separate from immutable audit logs.

---

# Audit

## Are indexing operations audited?

Yes.

Administrative operations, security events, and indexing lifecycle events generate audit records according to platform policy.

---

## Are all search queries audited?

No.

Routine search queries are operational telemetry, not compliance audit records.

Security-sensitive or administrative actions may be audited.

---

# AI

## Will Search support semantic search?

Yes.

Future platform capabilities may include:

- Semantic search
- Hybrid keyword/vector search
- Embedding indexes
- Retrieval-Augmented Generation (RAG)
- AI-assisted query rewriting

These capabilities extend the Search module without changing its core contract.

---

# Related Documents

- README.md
- FEATURES.md
- STATES.md
- EVENTS.md
- ERROR_CODES.md
- INDEXES.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Module Status:
Complete