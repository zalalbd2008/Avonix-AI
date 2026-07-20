---
status: Draft
version: 1.0.0
document: GLOSSARY
owner: Product Team
last_updated: 2026-07-18
depends_on:
  - PROJECT_OVERVIEW.md
  - PRODUCT_SCOPE.md
approval_status: Pending
---

# Glossary

## Purpose

This document defines the official terminology used throughout the Avonix AI platform.

Every document, feature specification, API, database schema, UI label, and AI prompt MUST use these definitions consistently.

This document serves as the single source of truth for product vocabulary.

---

# Organization

The highest-level business entity within Avonix AI.

An Organization owns:

- Users
- Teams
- Workspaces
- Websites
- Billing
- Settings
- Reports

One customer account may contain multiple Organizations.

---

# Workspace

A logical environment inside an Organization.

A Workspace groups related websites, users, automations, reports, and resources.

Examples:

- Marketing
- Client A
- Internal Projects

---

# User

A person who has access to the platform.

A User belongs to one or more Organizations and may have different roles in each.

---

# Team

A collection of users working together.

Teams simplify permission management and collaboration.

Examples:

- Support
- Sales
- Marketing
- Developers

---

# Role

A predefined permission level assigned to a user.

Examples:

- Owner
- Super Admin
- Admin
- Manager
- Support Agent
- Sales Agent
- Viewer

---

# Permission

A specific capability granted to a user or role.

Examples:

- View Reports
- Edit Websites
- Manage Billing
- Delete Forms

---

# Website

A connected website managed through Avonix AI.

A Website may include:

- Monitoring
- Live Chat
- Forms
- Analytics
- AI
- Automation

---

# Visitor

An anonymous or identified person visiting a connected website.

Visitors may later become Leads or Contacts.

---

# Contact

A known individual with identifiable information.

A Contact may originate from:

- Forms
- Live Chat
- API
- Import
- Manual Entry

---

# Lead

A Contact with potential business value.

Leads move through different lifecycle stages until conversion or closure.

---

# Conversation

A communication session between a Visitor and the platform.

Conversations may occur through:

- Live Chat
- AI Chat
- Email
- Future channels

---

# Agent

A human support representative using Avonix AI.

Agents respond to conversations and manage customer interactions.

---

# AI Agent

An artificial intelligence assistant capable of responding to visitors, assisting agents, and automating operational tasks.

AI Agents operate under configurable rules defined by the organization.

---

# Form

A configurable data collection interface embedded into a website.

Forms generate submissions that may create Leads or Contacts.

---

# Submission

A completed form response received from a visitor.

---

# Automation

A workflow executed automatically based on predefined conditions.

Example:

"When a form is submitted, assign the Lead to the Sales Team."

---

# Trigger

The event that starts an automation.

Examples:

- Form Submitted
- Chat Started
- Website Offline
- Lead Created

---

# Condition

A logical rule evaluated before an automation executes.

Example:

Lead Country = United States

---

# Action

A task performed after an automation is triggered.

Examples:

- Send Email
- Assign User
- Notify Team
- Create Lead

---

# Workflow

A sequence of triggers, conditions, and actions working together.

---

# Notification

A message delivered to users informing them about important events.

Notifications may be:

- In-App
- Email
- Push (Future)

---

# Dashboard

The primary interface displaying operational summaries, metrics, widgets, and quick actions.

---

# Module

A self-contained functional area of the platform.

Examples:

- Live Chat
- Forms
- CRM
- Automation
- Analytics

Each module should evolve independently.

---

# Integration

A connection between Avonix AI and an external platform.

Examples:

- WordPress
- Slack
- Zapier
- Google Analytics

---

# API

A programmatic interface allowing secure communication between Avonix AI and external systems.

---

# Audit Log

A chronological record of important platform activities.

Audit Logs support security, compliance, and troubleshooting.

---

# Billing

The subscription and payment management system for Organizations.

---

# Plan

A subscription tier defining available features and usage limits.

---

# Related Documents

- PROJECT_OVERVIEW.md
- PRODUCT_SCOPE.md
- PRODUCT_RULES.md
- PRODUCT_PRINCIPLES.md

---

# Maintenance Rules

When introducing a new platform concept:

1. Add the definition here first.
2. Update related documentation.
3. Ensure terminology remains consistent across the repository.

---

Status: Draft

Approval Required: Yes

Next Document: CHANGELOG.md