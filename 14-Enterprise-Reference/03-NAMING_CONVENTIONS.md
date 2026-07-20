---
status: Draft
version: 1.0.0
document: ENTERPRISE_NAMING_CONVENTIONS
owner: Enterprise Architecture Council
last_updated: 2026-07-19
approval_status: Pending
---

# Enterprise Naming Conventions

> "Consistent names create predictable systems. Predictable systems create scalable enterprises."

---

# Purpose

This document defines the official naming conventions used throughout the Avonix AI repository.

It establishes standardized naming rules for repositories, directories, documents, APIs, databases, services, infrastructure, AI assets, governance artifacts, and operational resources.

These standards improve readability, discoverability, automation compatibility, and long-term maintainability.

---

# Philosophy

Enterprise naming should be:

- Consistent
- Human-readable
- Machine-friendly
- Predictable
- Scalable
- Searchable
- Governance-controlled

Names should communicate intent clearly without unnecessary complexity.

---

# Objectives

This standard ensures:

- Repository consistency
- Cross-team alignment
- Easier navigation
- Automation compatibility
- Reduced ambiguity
- Stable identifiers
- Enterprise scalability

---

# Scope

Applicable to:

- Repository structure
- Directories
- Files
- Documents
- APIs
- Services
- Databases
- Infrastructure
- AI resources
- Security artifacts
- Governance records
- Operational assets

---

# General Naming Principles

Every name should be:

- Unique within its scope
- Descriptive
- Stable over time
- Free from unnecessary abbreviations
- Easy to pronounce
- Easy to search
- Easy to sort alphabetically

Avoid names that depend on individuals, temporary initiatives, or dates unless required.

---

# Capitalization Standards

| Artifact | Standard |
|----------|----------|
| Repository | PascalCase or Kebab-Case |
| Folder | Title-Case with numeric prefixes where applicable |
| Markdown File | UPPERCASE_WITH_UNDERSCORES |
| API Endpoint | lowercase-with-hyphens |
| Database Table | snake_case |
| Database Column | snake_case |
| Environment Variable | UPPER_CASE |
| Docker Image | lowercase |
| Kubernetes Resource | lowercase-with-hyphens |

---

# Repository Naming

Preferred format:

```text
organization-product

Example:

avonix-ai
```

Repository names should:

- Remain stable
- Avoid version numbers
- Avoid personal names
- Avoid temporary project names

---

# Folder Naming

Enterprise folders should use:

```text
00-Foundation
01-Product
02-Platform
...
```

Benefits:

- Stable ordering
- Predictable navigation
- Logical grouping

---

# Document Naming

Markdown documents should use:

```text
UPPERCASE_WITH_UNDERSCORES.md
```

Examples:

```text
PROJECT_CHARTER_TEMPLATE.md

SECURITY_ASSESSMENT_TEMPLATE.md

ENTERPRISE_GLOSSARY.md
```

Avoid:

```text
project1.md

new-file.md

temp.md

notes-final-v2.md
```

---

# Versioning Rules

Version numbers belong in metadata—not filenames.

Correct:

```text
PROJECT_CHARTER_TEMPLATE.md

Version: 1.2.0
```

Incorrect:

```text
PROJECT_CHARTER_v2.md
```

---

# Identifier Standards

## Project ID

```text
PRJ-0001
```

---

## Architecture Decision

```text
ADR-0001
```

---

## Risk

```text
RISK-0001
```

---

## Incident

```text
INC-0001
```

---

## Change Request

```text
CR-0001
```

---

## Security Assessment

```text
SEC-0001
```

---

## AI Evaluation

```text
AIE-0001
```

---

## Meeting Decision

```text
MD-0001
```

---

# API Naming

Use:

```text
/api/v1/customers

/api/v1/orders

/api/v1/chat
```

Rules:

- Lowercase
- Hyphen-separated
- Noun-based
- Versioned
- REST-consistent

---

# Database Naming

## Tables

```text
customer_accounts

support_tickets

chat_sessions
```

---

## Columns

```text
created_at

updated_at

owner_id

status
```

---

## Primary Keys

```text
id
```

---

## Foreign Keys

```text
customer_id

project_id
```

---

# Service Naming

Preferred format:

```text
customer-service

notification-service

chat-service

ai-gateway
```

---

# Environment Naming

```text
development

testing

staging

production
```

Avoid inconsistent abbreviations.

---

# Infrastructure Naming

Preferred structure:

```text
region-environment-service-number

Example:

us-east-prod-api-01
```

---

# AI Resource Naming

## Models

```text
customer-support-llm

medical-assistant-llm
```

---

## Prompts

```text
appointment-booking

lead-qualification

faq-response
```

---

## Workflows

```text
lead-routing

email-classification

document-analysis
```

---

# Security Artifact Naming

Examples:

```text
SEC-POLICY-001

SEC-CONTROL-015

SEC-RISK-002
```

Security identifiers should remain immutable.

---

# Documentation Naming

Use descriptive names:

```text
ARCHITECTURE_OVERVIEW.md

ENTERPRISE_GLOSSARY.md

REFERENCE_GUIDE.md
```

Avoid vague filenames.

---

# Prefix Standards

| Prefix | Purpose |
|---------|----------|
| ADR | Architecture Decisions |
| PRJ | Projects |
| INC | Incidents |
| RISK | Risks |
| CR | Change Requests |
| SEC | Security |
| AIE | AI Evaluation |
| MD | Meeting Decisions |

---

# Separator Rules

Preferred separators:

- Hyphen (`-`) for URLs and services
- Underscore (`_`) for document filenames
- No spaces
- No special characters unless required

---

# Reserved Words

Avoid using:

- test
- temp
- new
- final
- latest
- copy
- backup

These names become misleading over time.

---

# Exceptions Policy

Exceptions require:

- Business justification
- Architecture review
- Governance approval
- Documented rationale

Approved exceptions should remain traceable.

---

# Governance

Naming standards are governed by:

- Enterprise Architecture Council
- Documentation Council
- Engineering Leadership
- Enterprise PMO

Changes require formal approval.

---

# Continuous Improvement

Review naming standards when:

- New technologies are adopted
- Repository structure changes
- Enterprise governance evolves
- Automation requirements expand

Backward compatibility should be preserved wherever practical.

---

# Relationship to Other Standards

Related documents:

- Enterprise Glossary
- Enterprise Acronyms
- Technology Catalog
- Document Index
- Traceability Matrix
- Repository Standards

---

# Status

Draft

---

# Approval Required

Yes

---

# Next Document

04-DOCUMENT_INDEX.md

---

# Progress

```text
14-Enterprise-Reference/

✅ 00-README.md
✅ 01-GLOSSARY.md
✅ 02-ACRONYMS.md
✅ 03-NAMING_CONVENTIONS.md
⬜ 04-DOCUMENT_INDEX.md
⬜ 05-TRACEABILITY_MATRIX.md
⬜ 06-ROLE_CATALOG.md
⬜ 07-TECHNOLOGY_CATALOG.md
⬜ 08-DATA_CLASSIFICATION_REFERENCE.md
⬜ 09-COMPLIANCE_CROSSWALK.md
⬜ 10-REFERENCE_GUIDE.md
```

---

# Architecture Recommendation

This Naming Conventions Standard should be treated as a **repository-wide governance standard**. Every new repository, document, API, service, infrastructure resource, AI artifact, and operational asset should comply with these conventions before approval.

Consistent naming enables:

- Faster navigation
- Better automation
- Improved searchability
- Easier onboarding
- Stronger governance
- Long-term scalability across the Avonix AI ecosystem.