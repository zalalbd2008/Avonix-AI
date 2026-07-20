---
status: Draft
version: 1.0.0
document: SELF_HOSTED_REFERENCE_ARCHITECTURE
owner: Architecture Board
last_updated: 2026-07-19
depends_on:
  - 03-ENTERPRISE_DEPLOYMENT.md
  - ../02-Platform/03-IDENTITY_ACCESS.md
  - ../06-AI/12-AI_GOVERNANCE.md
approval_status: Pending
---

# Self-Hosted Reference Architecture

> "Self-hosted deployments maximize customer control by transferring infrastructure ownership while preserving the platform's architectural integrity."

---

# Purpose

This document defines the canonical Self-Hosted Reference Architecture for Avonix AI.

It provides the standard deployment blueprint for organizations operating Avonix AI within infrastructure they own or directly control.

---

# Philosophy

A self-hosted deployment should prioritize:

- Customer ownership
- Infrastructure control
- Data sovereignty
- Operational independence
- Security
- Configurable deployment

Customers control the environment while Avonix AI preserves a consistent architectural model.

---

# Strategic Objectives

The architecture should:

- Support customer-managed infrastructure
- Maintain architectural consistency
- Enable secure deployment
- Respect organizational security policies
- Support flexible AI deployment
- Preserve upgrade compatibility

---

# Recommended Use Cases

Recommended for:

- Government organizations
- Financial institutions
- Healthcare providers
- Defense environments
- Air-gapped environments
- Private cloud deployments

---

# Deployment Models

Supported deployment environments include:

- On-Premises Data Center
- Private Cloud
- Customer Kubernetes Cluster
- Virtual Machine Infrastructure
- Edge Deployments
- Hybrid Infrastructure

Deployment models may vary without changing the logical architecture.

---

# Architecture Overview

```text
Users

↓

Customer Identity Platform

↓

Ingress / Load Balancer

↓

Application Services

↓

AI Services

↓

Integration Layer

↓

Customer Data Platform

↓

Observability

↓

Customer Infrastructure
```

All infrastructure remains under customer control.

---

# Ownership Model

Customer responsibilities include:

- Infrastructure
- Networking
- Compute
- Storage
- Backups
- Monitoring
- Security operations
- Disaster recovery

Platform responsibilities remain defined by Avonix AI product standards.

---

# Infrastructure Boundaries

Customer-managed resources include:

- Servers
- Virtual Machines
- Kubernetes
- Databases
- Storage
- Networking
- Firewalls
- DNS
- Certificates

Infrastructure boundaries should be clearly documented.

---

# Identity Architecture

Identity services should support:

- Enterprise Identity Providers
- LDAP
- Active Directory
- SAML
- OpenID Connect
- SCIM
- MFA

Identity integration should align with enterprise security policies.

---

# AI Deployment Models

Supported AI deployment options include:

## Local Models

Customer-hosted inference.

---

## External AI Providers

Approved external AI APIs.

---

## Hybrid AI

Combination of local and external AI services.

---

## Dedicated Enterprise Models

Privately managed enterprise AI infrastructure.

The deployment model should be selected according to organizational requirements.

---

# Data Architecture

Customer-managed data may include:

- Primary database
- Object storage
- Search indexes
- Vector databases
- Cache
- Backups
- Archives

Data ownership remains with the customer.

---

# Networking

Networking architecture should define:

- Internal services
- External endpoints
- VPN connectivity
- Firewall rules
- Network segmentation
- Private networking

Security boundaries should remain explicit.

---

# Integration Architecture

Supported integrations include:

- Enterprise APIs
- ERP
- CRM
- IAM
- Email
- Messaging
- Document Management
- Internal business systems

Integrations should remain customer-controlled.

---

# Security Architecture

Security controls should include:

- Zero Trust principles
- Encryption at rest
- Encryption in transit
- Secret management
- Vulnerability management
- Audit logging

Security responsibilities should be clearly assigned.

---

# Compliance

Self-hosted deployments should support:

- Data residency
- Regional compliance
- Internal governance
- Customer audit requirements
- Industry regulations

Compliance remains the responsibility of the operating organization.

---

# Backup Strategy

Customers should define:

- Backup schedules
- Retention policies
- Recovery testing
- Archive strategy
- Storage replication

Recovery objectives should be documented.

---

# Upgrade Strategy

Upgrade planning should include:

- Version compatibility
- Configuration validation
- Backup verification
- Rollback procedures
- Post-upgrade validation

Upgrades should preserve architectural compatibility.

---

# Observability

Customers should operate:

- Metrics
- Logs
- Traces
- Dashboards
- Alerting
- Audit reporting

Observability should integrate with existing operational platforms.

---

# Operations

Operational activities include:

- Infrastructure maintenance
- Capacity planning
- Patch management
- Incident response
- Change management
- Lifecycle management

Operational ownership should be clearly documented.

---

# Scalability

Scaling options include:

- Horizontal application scaling
- Database scaling
- Storage expansion
- AI service scaling
- Search scaling
- Cache scaling

Scaling decisions remain customer-controlled.

---

# Support Model

Support responsibilities should define:

Customer:

- Infrastructure
- Networking
- Security operations
- Monitoring

Avonix AI:

- Product support
- Documentation
- Product updates
- Architectural guidance

Shared ownership should be explicitly documented.

---

# Air-Gapped Deployments

Where required, deployments should support:

- Offline installation
- Offline updates
- Local AI inference
- Internal package repositories
- Restricted networking
- Offline documentation

Air-gapped environments require dedicated operational procedures.

---

# Advantages

Benefits include:

- Full infrastructure ownership
- Data sovereignty
- Enterprise security alignment
- Flexible AI deployment
- Compliance flexibility
- Customer operational control

---

# Trade-Offs

Potential considerations include:

- Higher operational responsibility
- Increased infrastructure management
- Upgrade coordination
- Customer support requirements
- Capacity planning complexity

Trade-offs should be understood before selecting this deployment model.

---

# Migration Paths

Supported migration paths include:

- SaaS → Self-Hosted
- Enterprise → Self-Hosted
- Self-Hosted → Hybrid
- Self-Hosted → Managed SaaS

Migration should preserve data integrity and governance.

---

# Relationship to Other Reference Architectures

Related documents:

- SINGLE_TENANT.md
- MULTI_TENANT.md
- ENTERPRISE_DEPLOYMENT.md
- SAAS_CLOUD.md
- HYBRID_DEPLOYMENT.md

This document defines the canonical customer-managed deployment model for Avonix AI.

---

# Governance

Changes require:

- Architecture Board approval
- Security review
- Operational assessment
- Compatibility validation
- ADR approval for significant architectural changes

---

# Status

Draft

---

# Approval Required

Yes

---

# Next Document

05-SAAS_CLOUD.md