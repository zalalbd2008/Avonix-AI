---
status: Draft
version: 1.0.0
document: ROOT_CAUSE_ANALYSIS_TEMPLATE
owner: Enterprise Excellence Council
last_updated: 2026-07-19
template_type: Canonical
approval_status: Pending
---

# Enterprise Root Cause Analysis (RCA) Template

> "Fixing symptoms restores operations. Understanding root causes prevents recurrence."

---

# Purpose

This template provides the official Enterprise Root Cause Analysis (RCA) format for Avonix AI.

It establishes a standardized, evidence-based approach for identifying the underlying causes of incidents, failures, defects, outages, security events, AI issues, operational disruptions, and governance gaps.

---

# Philosophy

Root Cause Analysis should be:

- Objective
- Evidence-based
- System-focused
- Repeatable
- Action-oriented
- Blame-free
- Continuously improving

The objective is to improve systems and processes—not assign personal fault.

---

# Objectives

This template ensures:

- Consistent RCA documentation
- Reliable identification of root causes
- Sustainable corrective actions
- Enterprise knowledge preservation
- Governance alignment
- Audit readiness

---

# Scope

Applicable to:

- Production incidents
- Security breaches
- AI failures
- Platform outages
- Infrastructure failures
- Change failures
- Customer-impacting events
- Compliance findings
- Audit observations
- High-risk operational events

---

# Repository Information

| Field | Value |
|--------|-------|
| RCA ID | |
| Repository Path | |
| Related Incident ID | |
| RCA Owner | |
| Date Initiated | |
| Date Completed | |
| Status | Draft / In Progress / Completed / Approved |

---

# Executive Summary

Provide:

- Brief description
- Business impact
- Confirmed root cause
- Recommended actions

This section should summarize the investigation for executive stakeholders.

---

# Business Context

Describe:

- Business capability involved
- Affected services
- Strategic importance
- Customer impact

---

# Problem Statement

Clearly define:

- What happened
- Expected behavior
- Actual outcome
- Scope of impact

The problem statement should be factual and measurable.

---

# Impact Summary

Evaluate impact on:

- Customers
- Operations
- Revenue
- Security
- AI Services
- Compliance
- Reputation
- Business continuity

---

# Investigation Team

Record participants:

- Investigation Lead
- Technical Lead
- Operations Representative
- Security Representative
- Product Owner
- Compliance Representative
- Subject Matter Experts

Roles should be documented before analysis begins.

---

# Evidence Summary

Document supporting evidence:

- System logs
- Monitoring data
- Audit records
- Incident reports
- Configuration history
- Change history
- Customer reports
- AI telemetry (where applicable)

Evidence should remain verifiable and traceable.

---

# Incident Timeline

Maintain a factual sequence of events.

| Time | Event | Evidence Reference |
|------|-------|--------------------|
| | | |

---

# Root Cause Analysis Method

Record the investigation technique used.

Examples:

- Five Whys
- Fishbone (Ishikawa)
- Fault Tree Analysis
- Timeline Analysis
- Barrier Analysis
- Process Mapping

The chosen method should be appropriate for the complexity of the issue.

---

# Root Cause Identification

Document:

- Confirmed root cause
- Supporting evidence
- Validation performed
- Confidence level

Root causes should be supported by objective evidence.

---

# Contributing Factors

Identify contributing elements such as:

- Human factors
- Process weaknesses
- Technology limitations
- Configuration issues
- Monitoring gaps
- Documentation deficiencies
- Vendor dependencies

Contributing factors should not be confused with the root cause.

---

# Control Gap Assessment

Evaluate whether existing controls:

- Prevented the issue
- Detected the issue
- Delayed the issue
- Failed entirely

Identify opportunities for strengthening preventive and detective controls.

---

# Risk Assessment

Assess:

- Current risk level
- Future recurrence likelihood
- Potential business impact
- Residual risk after corrective actions

---

# Corrective Actions

| Action | Owner | Target Date | Priority | Status |
|---------|-------|-------------|----------|--------|
| | | | | |

Corrective actions eliminate the confirmed root cause.

---

# Preventive Actions (CAPA)

Document preventive improvements including:

- Process improvements
- Architecture enhancements
- Monitoring enhancements
- Documentation updates
- Training initiatives
- Governance improvements

Preventive actions reduce the likelihood of recurrence.

---

# Validation Criteria

Before closure verify:

- Root cause resolved
- Corrective actions completed
- Preventive actions implemented
- Operational stability confirmed
- Monitoring effectiveness validated

Validation should be evidence-based.

---

# Lessons Learned

Capture:

- Successful practices
- Improvement opportunities
- Process recommendations
- Governance recommendations
- Knowledge to share

Lessons learned should improve future operational maturity.

---

# Related Documents

Reference:

- Incident Report
- Risk Register
- Change Request
- Architecture Decision Record
- Security Assessment
- Enterprise Playbooks
- Audit Findings

---

# Review & Approval

Record approvals from:

- RCA Owner
- Technical Lead
- Operations Lead
- Security Lead (if applicable)
- Enterprise Excellence Council

Formal approval confirms acceptance of findings and actions.

---

# Version History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0.0 | 2026-07-19 | | Initial template |

---

# Relationship to Other Standards

Related documents:

- INCIDENT_REPORT_TEMPLATE.md
- RISK_REGISTER_TEMPLATE.md
- INCIDENT_COMMAND_PLAYBOOK.md
- CONTINUOUS_IMPROVEMENT_PLAYBOOK.md
- AUDIT_FRAMEWORK.md
- GOVERNANCE_STANDARDS.md

This template provides the canonical format for conducting Root Cause Analysis across Avonix AI.

---

# Status

Draft

---

# Approval Required

Yes

---

# Next Document

05-CHANGE_REQUEST_TEMPLATE.md