---
status: Draft
version: 1.0.0
document: FORM_DESIGN
owner: Product Design Team
last_updated: 2026-07-19
depends_on:
  - 07-INTERACTION_PATTERNS.md
  - 04-COMPONENT_LIBRARY.md
  - 02-DESIGN_SYSTEM.md
approval_status: Pending
---

# Form Design

> "Forms are conversations. Every field should reduce uncertainty and help users accomplish a goal with confidence."

---

# Purpose

This document defines the canonical form architecture for Avonix AI.

It establishes:

- Form philosophy
- Form architecture
- Field standards
- Validation model
- Submission lifecycle
- Accessibility
- AI-assisted forms
- Governance

Every form in the platform should conform to this specification.

---

# Form Philosophy

Forms exist to help users complete meaningful tasks rather than collect data.

Every form should:

- Guide users
- Minimize effort
- Prevent errors
- Preserve progress
- Build confidence

---

# Form Goals

The form system should:

- Reduce cognitive load
- Increase completion rates
- Prevent invalid submissions
- Encourage accuracy
- Support accessibility
- Scale consistently

---

# Form Architecture

Supported form patterns include:

- Single-step forms
- Multi-step forms
- Wizard flows
- Inline editing
- Drawer forms
- Modal forms
- Embedded forms
- AI-assisted forms

The simplest suitable pattern should always be preferred.

---

# Form Structure

Every form should define:

- Title
- Purpose
- Required information
- Optional information
- Primary action
- Secondary action
- Completion criteria

The purpose of the form should be immediately understandable.

---

# Field Standards

Every field should define:

- Label
- Input control
- Helper text
- Validation rules
- Default value (where appropriate)
- Error messaging

Fields should avoid ambiguity.

---

# Labels

Labels should:

- Be concise
- Describe the expected value
- Remain visible while interacting
- Avoid unnecessary jargon

Placeholders should never replace labels.

---

# Helper Text

Helper text should explain:

- Expected format
- Constraints
- Recommendations
- Examples (when beneficial)

Helper text should disappear only when no longer useful.

---

# Required Fields

Required fields should:

- Be clearly indicated
- Explain why information is needed when appropriate
- Minimize unnecessary data collection

Only essential information should be mandatory.

---

# Default Values

Defaults should:

- Reflect common choices
- Reduce repetitive work
- Remain editable

Defaults should never surprise users.

---

# Field Grouping

Related fields should be grouped logically.

Examples:

- Personal information
- Contact information
- Billing details
- AI configuration
- Automation settings

Grouping should reduce visual complexity.

---

# Conditional Fields

Fields may appear dynamically when relevant.

Conditional logic should:

- Be predictable
- Preserve entered data
- Clearly communicate dependencies

Users should understand why fields appear or disappear.

---

# Validation Philosophy

Validation should help users succeed rather than punish mistakes.

Validation should:

- Prevent errors
- Explain problems
- Suggest corrections
- Preserve entered data

---

# Validation Types

Supported validation includes:

## Client-side Validation

Immediate feedback before submission.

---

## Server-side Validation

Authoritative verification before persistence.

---

## Real-time Validation

Validation while users type.

---

## Deferred Validation

Validation after field completion or submission.

The chosen strategy should balance responsiveness and distraction.

---

# Validation Rules

Validation should check:

- Required values
- Format
- Length
- Range
- Uniqueness
- Relationships between fields
- Business constraints

Validation logic should remain consistent across interfaces.

---

# Error Messages

Error messages should:

- Explain the problem
- Explain how to fix it
- Reference the affected field
- Avoid technical language

Errors should guide recovery rather than assign blame.

---

# Success Indicators

Successful validation should communicate:

- Completed fields
- Accepted values
- Saved progress
- Submission readiness

Success feedback should remain subtle.

---

# Submission Lifecycle

Every submission follows the same lifecycle.

```
Draft

↓

Autosave (optional)

↓

Validation

↓

Submission

↓

Processing

↓

Confirmation

↓

Completion

↓

Recovery (if needed)
```

The current stage should always be visible.

---

# Draft Management

Where appropriate, forms should support:

- Draft saving
- Resume later
- Version history
- Unsaved changes warnings

Users should rarely lose work.

---

# Autosave

Autosave should:

- Preserve progress
- Clearly communicate save status
- Recover gracefully after interruptions

Autosave should never overwrite intentional user choices without notice.

---

# Multi-Step Forms

Multi-step forms should:

- Show progress
- Preserve entered data
- Allow backward navigation
- Minimize repeated information

Each step should have a clear objective.

---

# AI-Assisted Forms

AI may assist through:

- Smart autofill
- Suggested values
- Natural language input
- Field recommendations
- Context-aware defaults

AI suggestions should remain optional and editable.

---

# Accessibility

Forms should support:

- Keyboard-only completion
- Screen readers
- Logical tab order
- Error summaries
- Focus management
- High contrast
- Touch accessibility

Accessibility requirements apply to every field.

---

# Performance

Forms should:

- Load quickly
- Validate efficiently
- Avoid unnecessary network requests
- Preserve responsiveness

Performance contributes directly to completion rates.

---

# Anti-Patterns

Avoid:

- Placeholder-only labels
- Excessive required fields
- Generic error messages
- Hidden validation
- Unexpected resets
- Data loss
- Long unstructured forms

Forms should encourage completion rather than abandonment.

---

# Form Review Checklist

Every form should answer:

- Is the purpose obvious?
- Are required fields minimized?
- Are labels clear?
- Is validation understandable?
- Can users recover easily?
- Is progress preserved?
- Is accessibility complete?
- Does AI assistance remain optional?

---

# Governance

The form system should maintain:

- Form registry
- Validation standards
- Field patterns
- Accessibility reviews
- Analytics
- Version history
- Ownership records

Governance ensures consistency across every product workflow.

---

# Relationship to Other Documents

Related documents:

- INTERACTION_PATTERNS.md
- FEEDBACK_AND_STATES.md
- COMPONENT_LIBRARY.md
- ACCESSIBILITY_SYSTEM.md
- DESIGN_SYSTEM.md
- DESIGN_GOVERNANCE.md

---

Status: Draft

Approval Required: Yes

Next Document:

09-FEEDBACK_AND_STATES.md