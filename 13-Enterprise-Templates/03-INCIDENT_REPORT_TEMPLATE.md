---
status: Draft
version: 1.0.0
document: INCIDENT_REPORT_TEMPLATE
owner: Enterprise Operations Council
last_updated: 2026-07-19
template_type: Canonical
approval_status: Pending
---

# Enterprise Incident Report Template

> "Every incident is an opportunity to improve operational resilience through accurate documentation, disciplined response, and measurable learning."

---

# Purpose

This template defines the official Enterprise Incident Report format for Avonix AI.

It standardizes how operational, infrastructure, AI, security, platform, and business incidents are documented, reviewed, and archived across the enterprise.

---

# Philosophy

Incident documentation should be:

- Accurate
- Objective
- Timely
- Traceable
- Action-oriented
- Audit-ready
- Continuously improving

The purpose of an incident report is to document facts, decisions, actions, and outcomes—not assign blame.

---

# Objectives

This template ensures:

- Consistent incident documentation
- Executive visibility
- Governance alignment
- Audit readiness
- Knowledge preservation
- Continuous operational improvement

---

# Scope

Applicable to:

- Production incidents
- Infrastructure failures
- Security incidents
- AI service incidents
- Platform outages
- Customer-impacting events
- Data availability incidents
- Third-party service disruptions

---

# Repository Information

| Field | Value |
|--------|-------|
| Incident ID | |
| Repository Path | |
| Incident Owner | |
| Severity | SEV-1 / SEV-2 / SEV-3 / SEV-4 |
| Status | Open / Investigating / Mitigated / Resolved / Closed |
| Date Reported | |
| Last Updated | |

---

# Executive Summary

Provide a concise summary including:

- Incident overview
- Business impact
- Current status
- Resolution outcome

---

# Business Context

Describe:

- Affected business capability
- Related product or service
- Operational importance
- Strategic relevance

---

# Incident Classification

Record:

- Incident Type
- Detection Source
- Affected Environment
- Business Unit
- Customer Impact
- Regulatory Impact (if applicable)

---

# Incident Description

Describe:

- What happened
- When it happened
- Initial symptoms
- Known scope

This section should focus on verified facts.

---

# Detection Details

Document:

- Detection method
- Detection time
- Reporting source
- Monitoring alerts
- Initial assessment

---

# Impact Assessment

Evaluate impact on:

- Customers
- Services
- Revenue
- Operations
- AI systems
- Security
- Compliance
- Reputation

---

# Affected Assets

Document impacted:

- Applications
- Infrastructure
- Databases
- APIs
- AI Models
- Cloud Services
- Third-party Services

---

# Incident Timeline

Maintain a chronological timeline.

| Time | Event | Owner |
|------|-------|-------|
| | | |

Every major event should be recorded.

---

# Decision Log

Capture key operational decisions.

| Time | Decision | Decision Owner | Reason |
|------|----------|----------------|--------|
| | | | |

---

# Containment Actions

Record:

- Immediate actions
- Service isolation
- Temporary controls
- Risk reduction measures

Containment activities should minimize further impact.

---

# Investigation Summary

Document:

- Findings
- Evidence reviewed
- Technical observations
- Contributing factors

---

# Recovery Actions

Describe:

- Recovery approach
- Service restoration
- Validation activities
- Recovery completion

---

# Resolution Summary

Summarize:

- Final resolution
- Business outcome
- Remaining observations

---

# Root Cause Reference

Record:

- Root Cause Analysis ID
- Root Cause Summary
- Corrective Action Reference

Root Cause Analysis should be documented separately where required.

---

# Corrective Actions

| Action | Owner | Target Date | Status |
|---------|-------|-------------|--------|
| | | | |

Corrective actions should remain tracked until completion.

---

# Customer Communication Summary

Document:

- Communication channels used
- Customer notifications
- Status updates
- Resolution notice

---

# Lessons Learned

Capture:

- What worked well
- What did not work
- Improvement opportunities
- Recommended process changes

Lessons should improve future incident response.

---

# Related Documents

Reference:

- Incident Command Playbook
- Security Breach Playbook
- Disaster Recovery Playbook
- Root Cause Analysis
- Change Requests
- Risk Register
- Architecture Decision Records

---

# Review & Approval

Record approvals from:

- Incident Commander
- Operations Lead
- Security Lead (if applicable)
- Product Owner
- Executive Sponsor (for SEV-1)

---

# Version History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0.0 | 2026-07-19 | | Initial template |

---

# Relationship to Other Standards

Related documents:

- INCIDENT_COMMAND_PLAYBOOK.md
- SECURITY_BREACH_PLAYBOOK.md
- DISASTER_RECOVERY_PLAYBOOK.md
- RISK_REGISTER_TEMPLATE.md
- ROOT_CAUSE_ANALYSIS_TEMPLATE.md
- AUDIT_FRAMEWORK.md

This template provides the canonical format for documenting enterprise incidents across Avonix AI.

---

# Status

Draft

---

# Approval Required

Yes

---

# Next Document

04-ROOT_CAUSE_ANALYSIS_TEMPLATE.md