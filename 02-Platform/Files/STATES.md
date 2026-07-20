---
status: Draft
version: 1.0.0
document: FILES_STATES
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
approval_status: Pending
---

# File States

## Purpose

This document defines the lifecycle of files managed by the Avonix AI Files module.

The file lifecycle governs how digital assets move from creation through archival or permanent deletion while remaining independent from business modules that reference them.

---

# Objectives

The file lifecycle must:

- Ensure data integrity.
- Support secure uploads.
- Prevent invalid transitions.
- Enable auditability.
- Support retention policies.
- Remain storage-provider independent.

---

# Design Principles

File states must be:

- Deterministic
- Auditable
- Version-aware
- Policy-driven
- Recoverable where appropriate
- Independent from storage implementation

---

# State Machine

```
Pending Upload
        │
        ▼
Uploading
        │
        ▼
Processing
        │
        ▼
Available
        │
        ├────────► Archived
        │
        ├────────► Soft Deleted
        │
        ▼
Version Updated
        │
        ▼
Available

Archived
        │
        ▼
Restored

Soft Deleted
        │
        ├────────► Restored
        │
        ▼
Permanently Deleted
```

---

# State Definitions

## Pending Upload

The file record exists but content upload has not started.

Characteristics:

- Metadata may be editable.
- Binary content absent.
- Upload not initiated.

---

## Uploading

Binary data is currently being transferred.

Characteristics:

- Upload session active.
- Not accessible.
- Integrity not yet verified.

---

## Processing

The upload has completed and post-processing is underway.

Examples:

- Virus scanning
- Checksum verification
- Metadata extraction
- Thumbnail generation
- Preview generation

The file is not yet available to consumers.

---

## Available

The file has passed validation and is available for authorized access.

Characteristics:

- Fully indexed.
- Downloadable.
- Searchable by metadata.
- Referencable by business modules.

---

## Version Updated

A new version of the logical file has been uploaded.

Characteristics:

- Logical File ID unchanged.
- Previous versions retained.
- Latest version becomes active after validation.

---

## Archived

The file has been moved to long-term storage.

Characteristics:

- Not normally editable.
- Download behavior may vary by policy.
- Recoverable.

---

## Soft Deleted

The file has been marked for deletion.

Characteristics:

- Hidden from normal users.
- Recoverable.
- Retention policy applies.

Business references should treat the file as unavailable.

---

## Permanently Deleted

The file and associated binary content have been permanently removed.

Characteristics:

- Terminal state.
- Not recoverable.
- Subject to legal and retention policies.

Metadata retention depends on compliance requirements.

---

## Restored

A previously archived or soft-deleted file has been returned to the Available state.

Characteristics:

- Original File ID preserved.
- References remain valid.
- Audit history preserved.

---

# Valid State Transitions

| From | To |
|------|----|
| Pending Upload | Uploading |
| Uploading | Processing |
| Processing | Available |
| Available | Version Updated |
| Version Updated | Available |
| Available | Archived |
| Archived | Restored |
| Available | Soft Deleted |
| Soft Deleted | Restored |
| Soft Deleted | Permanently Deleted |
| Restored | Available |

---

# Invalid State Transitions

The following transitions are prohibited:

| From | To |
|------|----|
| Permanently Deleted | Any |
| Uploading | Archived |
| Pending Upload | Available |
| Archived | Uploading |
| Soft Deleted | Uploading |

Terminal states cannot transition to another state.

---

# Versioning Rules

File versions:

- Preserve the logical File ID.
- Maintain historical revisions.
- Support rollback where permitted.
- Record complete version history.

Business modules continue referencing the same logical File ID.

---

# Retention Rules

Retention policies may:

- Archive inactive files.
- Delay permanent deletion.
- Apply legal holds.
- Prevent deletion during investigations.

Retention policies override deletion requests where required.

---

# State Events

Typical lifecycle events include:

- FILE.CREATED
- FILE.UPLOAD.STARTED
- FILE.UPLOAD.COMPLETED
- FILE.PROCESSING.COMPLETED
- FILE.AVAILABLE
- FILE.VERSION.CREATED
- FILE.ARCHIVED
- FILE.RESTORED
- FILE.SOFT_DELETED
- FILE.PERMANENTLY_DELETED

---

# Persistence

Each state transition should record:

- File ID
- Previous State
- New State
- Actor ID
- Timestamp (UTC)
- Correlation ID

---

# Related Documents

- README.md
- FEATURES.md
- EVENTS.md
- STORAGE.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Next Document:
EVENTS.md