---
status: Draft
version: 1.0.0
document: SECURITY_ASSESSMENT_TEMPLATE
owner: Enterprise Security Council
last_updated: 2026-07-19
template_type: Canonical
approval_status: Pending
---

# Enterprise Security Assessment Template

> "Security is not a checklist—it is continuous evidence that enterprise systems remain trustworthy."

---

# Purpose

This template defines the official Enterprise Security Assessment format for Avonix AI.

It standardizes how applications, platforms, cloud infrastructure, AI systems, APIs, third-party integrations, and enterprise services are assessed for security risks, control effectiveness, compliance, and deployment readiness.

---

# Philosophy

Security assessments should be:

- Risk-based
- Evidence-driven
- Independent
- Repeatable
- Transparent
- Governance-aligned
- Continuously improved

Security assessments should provide confidence—not assumptions.

---

# Objectives

This template ensures:

- Consistent security reviews
- Standardized risk evaluation
- Compliance validation
- Executive visibility
- Audit readiness
- Continuous security improvement

---

# Scope

Applicable to:

- Enterprise Applications
- Cloud Infrastructure
- AI Systems
- APIs
- Identity Platforms
- Data Platforms
- Third-party Services
- Vendor Integrations
- Networks
- Business Platforms

---

# Repository Information

| Field | Value |
|--------|-------|
| Assessment ID | |
| Repository Path | |
| Assessment Type | Architecture / Application / Infrastructure / AI / Cloud / Vendor |
| Assessment Owner | |
| Assessment Date | |
| Review Status | Draft / In Review / Approved / Closed |

---

# Executive Summary

Summarize:

- Assessment objective
- Overall security posture
- Critical findings
- Overall recommendation

---

# Business Context

Describe:

- Business capability
- Critical services
- Data sensitivity
- Customer impact
- Regulatory obligations

---

# Assessment Scope

Document:

- Systems included
- Systems excluded
- Assessment boundaries
- Assumptions
- Constraints

---

# Asset Inventory

List critical assets including:

- Applications
- APIs
- Databases
- AI Models
- Infrastructure
- Cloud Resources
- Secrets
- Service Accounts
- External Integrations

---

# Data Classification

Document information types handled:

- Public
- Internal
- Confidential
- Restricted
- Regulated

Record applicable retention and protection requirements.

---

# Trust Boundary Analysis

Identify:

- Internal trust zones
- External trust zones
- Network boundaries
- Identity boundaries
- Third-party boundaries

Document how trust is established and maintained.

---

# Threat Modeling Summary

Record methodology used, such as:

- STRIDE
- PASTA
- Attack Trees
- Kill Chain Analysis
- MITRE ATT&CK Mapping

Summarize identified threat scenarios.

---

# Attack Surface Review

Evaluate exposure including:

- Public endpoints
- Administrative interfaces
- APIs
- Authentication endpoints
- AI interfaces
- Third-party integrations

Document unnecessary exposure and reduction opportunities.

---

# Identity & Access Management

Assess:

- Authentication mechanisms
- Authorization model
- Least privilege
- Role management
- Multi-factor authentication
- Service identities
- Privileged access controls

---

# Cryptography Assessment

Review:

- Encryption at rest
- Encryption in transit
- Key management
- Certificate management
- Digital signatures
- Cryptographic standards compliance

---

# Secrets Management

Evaluate:

- Secret storage
- Secret rotation
- Credential lifecycle
- API key protection
- Token management

---

# Logging & Monitoring

Assess:

- Security logging
- Audit logging
- Alerting
- SIEM integration
- Monitoring coverage
- Log retention

---

# Vulnerability Assessment

Document findings:

| Finding ID | Severity | Description | Status |
|------------|----------|-------------|--------|
| | | | |

Severity may follow:

- Critical
- High
- Medium
- Low
- Informational

---

# Risk Assessment

For each significant risk document:

- Description
- Likelihood
- Impact
- Overall Rating
- Mitigation Strategy
- Risk Owner

---

# Compliance Mapping

Record compliance alignment with applicable frameworks:

- ISO/IEC 27001
- SOC 2
- NIST Cybersecurity Framework
- CIS Controls
- GDPR
- HIPAA (if applicable)
- PCI DSS (if applicable)

Include evidence references where available.

---

# Security Control Assessment

Evaluate effectiveness of:

- Preventive controls
- Detective controls
- Corrective controls
- Administrative controls
- Technical controls
- Physical controls (if applicable)

---

# AI Security Assessment

Where applicable, evaluate:

- Prompt injection resistance
- Model abuse prevention
- Output validation
- Training data protection
- Model access control
- AI monitoring
- Human oversight

---

# Third-Party Security Review

Assess:

- Vendor security posture
- Shared responsibility
- Contractual obligations
- Security certifications
- External dependencies
- Supply chain risks

---

# Remediation Plan

| Action | Owner | Priority | Target Date | Status |
|---------|-------|----------|-------------|--------|
| | | | | |

Each remediation item should have a clearly assigned owner and completion target.

---

# Residual Risk

After remediation document:

- Remaining risks
- Business justification
- Risk acceptance authority
- Review schedule

Residual risks require formal approval.

---

# Final Recommendation

Select one:

- Approved
- Approved with Conditions
- Re-assessment Required
- Rejected

Provide justification supported by assessment findings.

---

# Continuous Monitoring

Define monitoring requirements for:

- Vulnerabilities
- Security events
- Access anomalies
- Configuration drift
- AI behavior
- Compliance changes

---

# Related Documents

Reference:

- Risk Register
- Architecture Decision Records
- Incident Reports
- AI Model Evaluation
- Change Requests
- Disaster Recovery Plans
- Security Governance Standards

---

# Review & Approval

Record approvals from:

- Security Assessor
- Security Architect
- Engineering Lead
- Compliance Lead
- Enterprise Security Council

Deployment approval should not proceed until all mandatory security requirements are satisfied or formally accepted.

---

# Version History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0.0 | 2026-07-19 | | Initial template |

---

# Continuous Improvement

Assessment outcomes should be used to:

- Improve security architecture
- Enhance governance
- Strengthen controls
- Reduce enterprise risk
- Improve future assessments

---

# Relationship to Other Standards

Related documents:

- Security Governance Standards
- AI Model Evaluation Template
- Risk Register Template
- Incident Report Template
- Architecture Decision Record Template
- Disaster Recovery Test Template

This template provides the canonical format for enterprise security assessments across Avonix AI.

---

# Status

Draft

---

# Approval Required

Yes

---

# Next Document

09-DISASTER_RECOVERY_TEST_TEMPLATE.md