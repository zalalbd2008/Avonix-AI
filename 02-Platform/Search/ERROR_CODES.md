---
status: Draft
version: 1.0.0
document: SEARCH_ERROR_CODES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
  - STATES.md
approval_status: Pending
---

# Search Error Codes

## Purpose

This document defines the canonical error codes for the Search module.

Search error codes provide a stable and provider-independent mechanism for reporting failures across indexing, querying, synchronization, administration, and platform integrations.

---

# Objectives

Search error codes must:

- Be stable.
- Be machine-readable.
- Be human-readable.
- Support troubleshooting.
- Support monitoring.
- Remain provider-independent.

---

# Error Code Format

```
SEARCH-XXXX
```

Example:

```
SEARCH-0101
```

---

# Error Categories

| Range | Category |
|--------|----------|
| SEARCH-0000–0099 | General |
| SEARCH-0100–0199 | Search Documents |
| SEARCH-0200–0299 | Indexing |
| SEARCH-0300–0399 | Query Execution |
| SEARCH-0400–0499 | Index Management |
| SEARCH-0500–0599 | Filtering & Ranking |
| SEARCH-0600–0699 | Synchronization |
| SEARCH-0700–0799 | Security |
| SEARCH-0800–0899 | Administrative |

---

# General Errors

| Code | Description |
|------|-------------|
| SEARCH-0001 | Unknown search error |
| SEARCH-0002 | Invalid request |
| SEARCH-0003 | Unsupported operation |

---

# Search Document Errors

| Code | Description |
|------|-------------|
| SEARCH-0101 | Search document not found |
| SEARCH-0102 | Invalid search document |
| SEARCH-0103 | Duplicate search document |
| SEARCH-0104 | Unsupported entity type |
| SEARCH-0105 | Missing searchable fields |

---

# Indexing Errors

| Code | Description |
|------|-------------|
| SEARCH-0201 | Indexing failed |
| SEARCH-0202 | Index unavailable |
| SEARCH-0203 | Index write failed |
| SEARCH-0204 | Index timeout |
| SEARCH-0205 | Retry limit exceeded |

---

# Query Errors

| Code | Description |
|------|-------------|
| SEARCH-0301 | Query execution failed |
| SEARCH-0302 | Invalid query syntax |
| SEARCH-0303 | Unsupported filter |
| SEARCH-0304 | Invalid sort field |
| SEARCH-0305 | Query timeout |

---

# Index Management Errors

| Code | Description |
|------|-------------|
| SEARCH-0401 | Index not found |
| SEARCH-0402 | Index already exists |
| SEARCH-0403 | Index rebuild failed |
| SEARCH-0404 | Index version conflict |
| SEARCH-0405 | Alias update failed |

---

# Filtering & Ranking Errors

| Code | Description |
|------|-------------|
| SEARCH-0501 | Invalid ranking configuration |
| SEARCH-0502 | Invalid synonym configuration |
| SEARCH-0503 | Unsupported facet |
| SEARCH-0504 | Invalid searchable field |

---

# Synchronization Errors

| Code | Description |
|------|-------------|
| SEARCH-0601 | Synchronization failed |
| SEARCH-0602 | Event processing failed |
| SEARCH-0603 | Incremental update failed |
| SEARCH-0604 | Reindex required |

---

# Security Errors

| Code | Description |
|------|-------------|
| SEARCH-0701 | Permission denied |
| SEARCH-0702 | Unauthorized search request |
| SEARCH-0703 | Cross-organization search prohibited |
| SEARCH-0704 | Invalid security context |

---

# Administrative Errors

| Code | Description |
|------|-------------|
| SEARCH-0801 | Reindex operation failed |
| SEARCH-0802 | Administrative policy violation |
| SEARCH-0803 | Configuration update failed |

---

# Standard Error Response

Every error response should include:

| Field | Required |
|--------|----------|
| Error Code | ✅ |
| Message | ✅ |
| HTTP Status | ✅ |
| Correlation ID | ✅ |
| Timestamp (UTC) | ✅ |
| Details | Optional |

---

# Design Principles

Search errors must:

- Never expose provider implementation details.
- Never expose internal infrastructure.
- Preserve correlation identifiers.
- Remain stable across platform versions.
- Be safe for API consumers.

---

# Provider Error Translation

Provider-specific errors must be translated into canonical Search errors.

Examples include:

- Index unavailable
- Query timeout
- Write failure
- Version conflict

Business modules must never receive provider-native error codes.

---

# Related Documents

- README.md
- FEATURES.md
- STATES.md
- EVENTS.md
- INDEXES.md
- SECURITY.md
- AUDIT_LOGGING.md
- FAQ.md

---

Status: Draft

Approval Required: Yes

Next Document:
INDEXES.md