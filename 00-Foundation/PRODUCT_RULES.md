# PRODUCT_RULES.md

---
status: Draft
version: 1.0.0
document: PRODUCT_RULES
owner: Product Team
last_updated: 2026-07-18
depends_on:
  - PROJECT_OVERVIEW.md
  - PRODUCT_SCOPE.md
---

# Product Rules

This document defines the mandatory rules that govern every decision, feature, module, workflow, design, API, and future expansion of Avonix AI.

These rules are the foundation of the product and must never be violated without creating an official Product Decision Record.

---

# Rule 01 — Cloud First

Every feature must be designed for the cloud.

The cloud platform is always the primary system.

The WordPress plugin is only a connector.

Business logic must never depend entirely on the plugin.

---

# Rule 02 — Single Dashboard

Users should never need multiple dashboards.

All operations should be accessible from one centralized interface.

---

# Rule 03 — AI First

Every module must be evaluated for AI integration.

If AI can reduce manual work, AI support should be considered during the design phase.

---

# Rule 04 — Automation Before Manual Work

If a repetitive task can be automated safely, automation should be preferred over manual execution.

---

# Rule 05 — Modular Architecture

Every feature must exist as an independent module.

Modules should communicate through clearly defined interfaces.

No module should tightly depend on another module.

---

# Rule 06 — Scalability

Every system must be designed to support:

- Thousands of organizations
- Thousands of users
- Thousands of websites
- Millions of records

No feature should assume a small dataset.

---

# Rule 07 — Security by Default

Security is never optional.

Every feature must include:

- Authentication
- Authorization
- Permission validation
- Activity logging
- Secure communication

---

# Rule 08 — User Experience First

The platform should feel simple regardless of internal complexity.

Advanced functionality must never overwhelm new users.

---

# Rule 09 — Configuration Over Custom Code

Whenever possible, users should configure behavior instead of writing code.

---

# Rule 10 — Data Ownership

Users own their data.

The platform must never lock users into proprietary formats.

Exports should be available whenever practical.

---

# Rule 11 — API First

Everything that can be performed from the dashboard should also be possible through APIs.

The frontend should consume the same APIs available to authorized integrations.

---

# Rule 12 — Consistency

Terminology, naming, icons, colors, workflows, and interactions must remain consistent across all modules.

---

# Rule 13 — Backward Compatibility

Breaking changes should be avoided.

When unavoidable, migration paths and documentation must be provided.

---

# Rule 14 — Documentation First

No major feature enters development without approved documentation.

Required documents include:

- Purpose
- Scope
- User Flow
- Data Requirements
- Permissions
- API Requirements
- Future Considerations

---

# Rule 15 — Scope Control

Features that do not support the core mission of Website Operations should not be included without strategic review.

Avoid unnecessary complexity.

---

# Rule 16 — Accessibility

Every interface should be usable by as many users as possible.

Accessibility must be considered during design, not added later.

---

# Rule 17 — Performance

Performance is a feature.

The platform should remain responsive as data grows.

Heavy processing should be handled asynchronously whenever possible.

---

# Rule 18 — Observability

Every important action should be traceable.

Errors, automations, AI actions, API requests, and system events should generate appropriate logs.

---

# Rule 19 — Future Ready

Every architecture decision should consider future expansion, including:

- Mobile Apps
- Browser Extensions
- Public APIs
- AI Agents
- White Label
- Enterprise Deployments

---

# Rule 20 — Product Integrity

Every new feature must answer the following questions before approval:

1. Does it solve a real user problem?
2. Does it support the product vision?
3. Does it improve operational efficiency?
4. Does it maintain simplicity?
5. Can it scale?
6. Is it secure?
7. Is it maintainable?
8. Does it introduce unnecessary complexity?

If these questions cannot be answered positively, the feature should be reconsidered.

---

# Compliance

Every document, module, API, UI design, and engineering decision must comply with these Product Rules.

---

# Document Status

Status:
Draft

Approval Required:
Yes

Next Document:
PRODUCT_PHILOSOPHY.md