---
status: Draft
version: 1.0.0
document: FILES_FAQ
owner: Platform Team
last_updated: 2026-07-18
depends_on:
  - README.md
  - FEATURES.md
  - STATES.md
  - STORAGE.md
  - SECURITY.md
approval_status: Pending
---

# Files FAQ

## Purpose

This document answers common architectural, operational, and implementation questions about the Files module.

---

# General

## What is the Files module?

The Files module is the platform's canonical digital asset management service.

It stores, manages, versions, secures, and serves files for every business module.

---

## Does the Files module own business documents?

No.

Business modules own their business relationships.

The Files module owns only:

- Binary content
- File metadata
- Versions
- Storage
- Lifecycle

---

## Can CRM store files directly?

No.

CRM stores File IDs.

The Files module stores the actual file.

---

## Why use File IDs instead of file paths?

File IDs remain stable even when:

- Storage providers change
- Buckets change
- Object keys change
- Files are migrated

Business modules remain unaffected.

---

# Storage

## Can storage providers be changed?

Yes.

Supported providers include:

- Local Storage
- Amazon S3
- Cloudflare R2
- Azure Blob Storage
- Google Cloud Storage

Business modules require no changes.

---

## Can multiple storage providers exist simultaneously?

Yes.

Different deployment strategies may use:

- Primary storage
- Archive storage
- Backup storage
- Regional storage

The Files module abstracts these details.

---

## Where is metadata stored?

Metadata is stored in the platform database.

Examples include:

- Name
- Size
- MIME Type
- Checksum
- Owner
- Version

Binary content is stored separately.

---

# Versioning

## Does uploading a new version create a new File ID?

No.

A logical File keeps the same File ID.

Only the Version ID changes.

---

## Can previous versions be restored?

Yes.

If platform policy allows it, earlier versions can be restored while preserving the File ID.

---

# Security

## Who controls file permissions?

The Permissions module.

The Files module never makes authorization decisions independently.

---

## Are files encrypted?

Yes.

Encryption at rest and encryption in transit are supported.

Implementation depends on deployment configuration.

---

## Are signed URLs permanent?

No.

Signed URLs are temporary and expire automatically.

---

# Deletion

## What is Soft Delete?

Soft Delete hides the file while allowing recovery according to retention policy.

---

## What is Permanent Delete?

Permanent Delete removes binary content and ends the file lifecycle.

Recovery is not possible.

---

## Can retention policies prevent deletion?

Yes.

Retention policies and legal holds override deletion requests.

---

# Audit

## Are downloads audited?

Yes.

Significant file operations should generate audit records according to platform policy.

---

## Can audit history be deleted?

No.

Audit history is immutable and managed independently from the file lifecycle.

---

# Integration

## Which modules use Files?

Examples include:

- CRM
- Projects
- Forms
- AI
- Chat
- Automation
- Reports

---

## Should business modules store file paths?

No.

Business modules store only the canonical File ID.

---

# Performance

## Can large files be uploaded?

Yes.

The Files module supports:

- Multipart uploads
- Chunked uploads
- Resumable uploads

Implementation depends on the configured storage provider.

---

## Does the Files module support CDN integration?

Yes.

CDN integration is an optional deployment capability and does not change the File ID or API contract.

---

# Future

## Can AI process uploaded files?

Yes.

Future platform capabilities may include:

- OCR
- Image classification
- Automatic tagging
- Content extraction
- Embedding generation

These capabilities consume files but are not owned by the Files module.

---

# Related Documents

- README.md
- FEATURES.md
- STATES.md
- EVENTS.md
- ERROR_CODES.md
- STORAGE.md
- SECURITY.md
- AUDIT_LOGGING.md

---

Status: Draft

Approval Required: Yes

Module Status:
Complete