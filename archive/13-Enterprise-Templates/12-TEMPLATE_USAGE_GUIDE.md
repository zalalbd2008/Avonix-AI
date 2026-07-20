---
status: Draft
version: 1.0.0
document: TEMPLATE_USAGE_GUIDE
owner: Enterprise Documentation Council
last_updated: 2026-07-19
approval_status: Pending
---

# Enterprise Template Usage Guide

> "A template creates consistency. Consistent documentation creates a predictable, governable enterprise."

---

# Purpose

This guide defines the official standards for selecting, completing, reviewing, approving, maintaining, and retiring every enterprise template within Avonix AI.

It serves as the single source of truth for template governance across the entire repository.

---

# Philosophy

Enterprise templates should be:

- Consistent
- Simple
- Reusable
- Traceable
- Governed
- Audit-ready
- Continuously improved

Templates exist to standardize enterprise knowledge, not to increase documentation overhead.

---

# Objectives

This guide ensures:

- Consistent template usage
- Enterprise-wide documentation quality
- Governance alignment
- Knowledge reuse
- Traceability
- Audit readiness
- Continuous improvement

---

# Scope

This guide applies to every template contained within:

```text
13-Enterprise-Templates/
```

and all future enterprise templates introduced into the Avonix AI repository.

---

# Enterprise Template Lifecycle

```text
Need Identified
        │
        ▼
Template Selection
        │
        ▼
Document Creation
        │
        ▼
Technical Review
        │
        ▼
Business Review
        │
        ▼
Approval
        │
        ▼
Operational Use
        │
        ▼
Periodic Review
        │
        ▼
Archive / Replace
```

Each stage should produce documented evidence where appropriate.

---

# Template Selection Matrix

| Situation | Required Template |
|-----------|-------------------|
| Major architecture decision | Architecture Decision Record |
| Enterprise risk identified | Risk Register |
| Operational incident | Incident Report |
| Root cause investigation | Root Cause Analysis |
| Planned production change | Change Request |
| Change validation | Post-Implementation Review |
| AI deployment review | AI Model Evaluation |
| Security review | Security Assessment |
| Disaster recovery exercise | Disaster Recovery Test |
| Project initiation | Project Charter |
| Governance meeting | Meeting Decision |

---

# Template Dependency Map

```text
Project Charter
      │
      ▼
Architecture Decision Record
      │
      ▼
Change Request
      │
      ▼
Security Assessment
      │
      ▼
AI Model Evaluation
      │
      ▼
Implementation
      │
      ▼
Incident Report
      │
      ▼
Root Cause Analysis
      │
      ▼
Risk Register Update
      │
      ▼
Post-Implementation Review
```

Not every initiative follows every path, but dependencies should be documented whenever applicable.

---

# Document Metadata Standards

Every template should include:

- YAML Front Matter
- Document Owner
- Version
- Status
- Approval Status
- Last Updated
- Repository Path

Metadata should remain consistent across the repository.

---

# Naming Standards

Use:

- Uppercase filenames
- Underscore separators
- Descriptive names
- Stable document identifiers

Examples:

```text
ARCHITECTURE_DECISION_RECORD_TEMPLATE.md

SECURITY_ASSESSMENT_TEMPLATE.md

PROJECT_CHARTER_TEMPLATE.md
```

---

# Versioning Standard

Use semantic versioning.

Examples:

```text
1.0.0 Initial Release

1.1.0 Minor Enhancement

1.2.0 Additional Sections

2.0.0 Major Structural Revision
```

Historical versions should remain traceable.

---

# Ownership

Each template should have:

- Business Owner
- Technical Owner (where applicable)
- Governance Owner
- Review Owner

Ownership should remain current throughout the document lifecycle.

---

# Approval Authority

Depending on template type, approval may involve:

- Enterprise Architecture Council
- Enterprise Security Council
- AI Governance Council
- Enterprise Risk Council
- Change Advisory Board
- Executive Sponsor
- Enterprise PMO
- Documentation Council

Approval should be recorded before official adoption.

---

# Review Frequency

Recommended review intervals:

| Template Type | Suggested Review |
|---------------|------------------|
| ADR | Annually or after significant architectural change |
| Risk Register | Quarterly |
| Incident Report | After incident closure |
| Root Cause Analysis | Upon completion and follow-up |
| Change Request | Before and after implementation |
| Post-Implementation Review | Immediately after implementation |
| AI Model Evaluation | Before deployment and periodically thereafter |
| Security Assessment | At least annually or after major changes |
| Disaster Recovery Test | After each test exercise |
| Project Charter | At project phase gates |
| Meeting Decision | Before next governance meeting |

---

# Writing Guidelines

Enterprise documentation should be:

- Clear
- Objective
- Evidence-based
- Concise
- Measurable
- Free from unnecessary jargon
- Easy to review

Avoid ambiguity wherever possible.

---

# Documentation Quality Checklist

Before approval verify:

- Required sections completed
- Metadata accurate
- Ownership assigned
- Risks documented
- Related documents linked
- Version updated
- Approval recorded
- References validated

---

# Cross-Reference Rules

Templates should reference related documentation where applicable:

- Architecture Decision Records
- Risk Register
- Incident Reports
- Root Cause Analysis
- Change Requests
- Security Assessments
- AI Evaluations
- Project Charters
- Enterprise Playbooks

Cross-references improve traceability and organizational learning.

---

# Traceability Requirements

Every significant enterprise decision should be traceable through related documentation.

Example chain:

```text
Project Charter
      ↓
Architecture Decision
      ↓
Change Request
      ↓
Security Assessment
      ↓
Implementation
      ↓
Incident Report (if applicable)
      ↓
Root Cause Analysis (if applicable)
      ↓
Post-Implementation Review
```

Traceability should enable end-to-end understanding of enterprise decisions.

---

# Audit Readiness

Templates should support:

- Evidence collection
- Decision history
- Approval records
- Version history
- Ownership tracking
- Compliance verification

Documentation should remain reviewable throughout its lifecycle.

---

# Continuous Improvement

Template improvements should be driven by:

- Audit findings
- Incident reviews
- User feedback
- Governance reviews
- Process maturity assessments
- Regulatory changes
- Technology evolution

Changes should follow the established document governance process.

---

# Relationship to Repository Layers

This layer supports:

- Foundation
- Product
- Platform
- Engineering
- Design
- Business
- AI
- Decisions
- Reference Architectures
- Implementation Standards
- Operations
- Governance
- Enterprise Playbooks

Enterprise Templates provide the standardized documentation structure used throughout every repository layer.

---

# Status

Draft

---

# Approval Required

Yes

---

# Next Document

Repository Complete

---

# Progress

```text
Layers Completed

00 Foundation
01 Product
02 Platform
03 Engineering
04 Design
05 Business
06 AI
07 Decisions
08 Reference Architectures
09 Implementation Standards
10 Operations
11 Governance
12 Enterprise Playbooks
13 Enterprise Templates

Progress:
██████████████░
14 / 16 Major Layers Complete
```

---

# Architecture Recommendation

The **Enterprise Templates** layer should now be designated as the **canonical documentation standard** for Avonix AI.

Going forward:

- Every new enterprise document should originate from an approved template.
- Template changes should follow formal governance and version control.
- Cross-references between templates, playbooks, governance documents, and operational artifacts should be maintained to preserve end-to-end traceability.
- New templates should be introduced only when a recurring enterprise need cannot be addressed by an existing template, ensuring the repository remains consistent, maintainable, and audit-ready.