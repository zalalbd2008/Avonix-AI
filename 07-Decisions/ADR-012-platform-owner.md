# ADR-012 — Platform Owners & Emergency Recovery

**Status:** Accepted · Amended · 2026-07-23  
**Amends:** ADR-003 (auth), ADR-004 (buy auth), ADR-006 (rejects in-app cross-tenant staff console)  
**Does not amend:** ADR-002 tenancy / RLS for agency data

## Context

Public registration creates ordinary users who then become **Organization
Admins** (agency owners via memberships). That path must never mint a
platform-level operator.

Avonix needs a small set of **Platform Owners** (also called Platform
Administrators) — install-time and invite-only identities that control the
software itself. Naming must not say “Super Admin” for this role: that label
confused the agency-scoped overview with cross-tenant power.

Enterprise recovery needs **multiple owners** and **multiple layers**, so losing
one password or MFA device does not lock the operator out forever.

## Decision

### 1. Naming

| Term | Meaning |
|------|---------|
| **Platform Owner** / **Platform Administrator** | Cross-platform operator (`platform_accounts.platform_owner = true`) — **not** an organization role |
| **Organization Admin** | Agency `memberships.role = owner` / `admin` — org-scoped only |
| **Staff / Role Manager** | Org membership + (future) permissions — same workspace, filtered UI |
| **Organization overview** (`/super-admin` URL kept for now) | Tenant-scoped list of own agency records — **not** platform privilege |

Never call Platform Owner “Super Admin” as a product role. Never create Platform
Owners from public registration. Post-login surfaces: see **ADR-013**.

### 2. Cap: maximum 4 Platform Owners

Global setting (default **4**):

```
platform_settings.max_platform_owners = 4
```

Recommended seats:

| Seat | Purpose |
|------|---------|
| #1 | Primary owner — daily use |
| #2 | Backup owner — different email |
| #3 | Emergency recovery / break-glass — usually **disabled** |
| #4 | Co-founder / trusted technical admin (optional) |

Also: at most **one** `break_glass = true` account (counts toward the 4 if it is
also `platform_owner`, or sits as a disabled platform seat).

If the limit is reached, create fails with:

> Maximum Platform Owners reached.

### 3. How Platform Owners are created

```
Public Registration  →  Organization Admin (agency membership)
Installer CLI        →  first Platform Owner (+ optional break-glass)
Platform panel / CLI →  additional Owners (while count < max)
Recovery CLI         →  password/MFA reset; may enable break-glass
```

**Not** via `/sign-up`.

Creating an additional Owner from the Platform panel (P1) requires step-up:

1. Current Owner password re-entry  
2. MFA verification (when enrolled)  
3. Email OTP to current Owner  
4. Optional recovery code  

Installer / server CLI may create seats without the web step-up (physical
server access is the gate).

### 4. Data model

```
user
platform_accounts          — platform_owner, break_glass, status, purpose label,
                             recovery contacts, emergency_key_hash, mfa flags
platform_recovery_codes    — hashed one-time codes
platform_security_events   — append-only audit
platform_settings          — max_platform_owners (default 4), singleton row
```

`platform_owner` is a **boolean flag**, not a shared password.

### 5. Recovery layers

| Layer | Mechanism | Phase |
|-------|-----------|-------|
| 1 | MFA (TOTP) | P1 |
| 2 | Recovery codes × 10 | P0 |
| 3 | Recovery email | P0 store / P1 reset |
| 4 | Recovery phone OTP | P2 |
| 5 | Emergency recovery key | P0 |
| 6 | Server CLI `platform:recover-owner` | P0 |

### 6. Role inventory (limits)

| Role | Limit |
|------|--------|
| Platform Owners | Max **4** (global setting) |
| Emergency / break-glass | **1**, normally disabled |
| Organization Admins | Unlimited (per organization memberships) |
| Staff / members | Plan-gated (existing billing limits) |

### 7. Surfaces

See ADR-013 for the three-surface model. Summary:

| Surface | Who | Scope |
|---------|-----|--------|
| `/platform/*` | Platform Owner | Platform ops (all orgs) |
| `(app)/*` / `/dashboard` | Organization Admin & Staff | Own tenant only (RLS) |
| `/super-admin` (label: Organization overview) | Organization Admin | Own tenant inventory — not platform |

## Rejected

- Public registration creating Platform Owners.  
- Unlimited Platform Owners.  
- Calling platform privilege “Super Admin”.  
- Hard-coded passwords in source.  
- Agency overview page that bypasses RLS.

## Phased delivery

| Phase | Deliverable |
|-------|-------------|
| **P0** | Schema, settings max=4, bootstrap, add-owner CLI, recover CLI, `/platform`, rename UI |
| **P1** | Panel invite with password + MFA + email OTP step-up; twoFactor plugin |
| **P2** | Phone OTP; break-glass alerts |

## Acceptance

- [x] Public signup never yields `platform_owner`  
- [x] At most `max_platform_owners` (default 4)  
- [x] Bootstrap + add-owner + recover-owner CLI  
- [x] Agency page labeled Organization overview (not Super Admin)  
- [ ] Web invite with step-up auth (P1)  
