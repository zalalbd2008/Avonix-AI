# ADR-013 — Post-login identity & three product surfaces

**Status:** Accepted · 2026-07-23  
**Amends:** ADR-003 (auth), ADR-006 (organizations), ADR-012 (Platform Owner)  
**Does not amend:** ADR-002 tenancy / RLS

## Context

Operators confused **Platform Owner** with an organization “Super Admin” role.
Public registration must never mint platform privilege. After one shared login,
the product must load the correct surface from identity — not from a menu label.

Avonix also needs fine-grained org permissions later. Building a separate
dashboard per job title (Sales / Marketing / Support / Developer) would multiply
UI with no gain.

## Decision

### 1. Naming (non-negotiable)

| Term | What it is | What it is not |
|------|------------|----------------|
| **Platform Owner** | Install/CLI flag on `platform_accounts` | Not a membership role |
| **Organization Admin** | Org `memberships.role` = `owner` / `admin` | Not platform privilege |
| **Staff / custom Role** | Org membership + future permission set | Not a separate app |
| “Super Admin” | **Forbidden product name** for either | — |

Platform Owner ≠ Organization role. Organization Admin ≠ Platform Owner.

### 2. One login → identity router

```
Login → Authentication → Who is this user?
  ├── Platform Owner (active)     → /platform/*     Platform Dashboard
  ├── Organization Admin          → /dashboard      Organization Workspace
  ├── Staff (member + permissions)→ /dashboard      same Workspace, filtered nav
  └── (future) Client portal user → /portal/*       out of agency shell
```

Implementation: `resolvePostLoginPath()` + `/home` redirect after sign-in.
Platform Owner wins when `platform_accounts.platform_owner` and status is
`active`. Otherwise agency onboarding or `/dashboard`.

### 3. Exactly three primary surfaces (not N role dashboards)

| # | Surface | Audience | Scope |
|---|---------|----------|--------|
| 1 | **Platform Dashboard** (`/platform/*`) | Platform Owners only (≤4) | All orgs, billing ops, health, global settings |
| 2 | **Organization Workspace** (`(app)/*`) | Org Admin | Own org only (RLS) — CRM, sites, billing, team… |
| 3 | **Same Workspace, permission-filtered** | Staff / Role Manager | Same routes & shell; sidebar/actions gated by permissions |

Do **not** ship separate Sales / Support / Marketing dashboards. One workspace
shell; menus and actions filter by permission.

Client portal (end-customer) is a **fourth surface later**, outside the agency
shell — not a staff role dashboard.

### 4. Platform Dashboard IA

```
Platform (Platform Owner)
├── Accounts (Subscription & Billing)
│     Dashboard · Workspaces · Billing · Subscription · Licenses
│     Team · Global Templates · Marketplace · Settings
└── Workspace
      Overview · Websites → Website Workspace (Forms, Popup, Chat AI, …)
      Members · Reports · Settings
```

Cross-tenant modules load via admin DB role over time. Stubs ship with the nav.
Never label this surface “Super Admin” in the UI.

Ordinary org users never see this tree. Public registration never grants it.

### 5. Organization Workspace

Org Admin runs **their company**, not the SaaS. Existing `(app)` shell + RLS.
They cannot list other organizations’ data.

### 6. Permission model (org-scoped) — replace coarse labels over time

Today: `memberships.role` ∈ `owner | admin | member` (coarse).

Target:

```
Organization Admin
  → Create Role (“Sales Manager”)
  → Attach permissions (crm.view, contact.edit, chat.reply, …)
  → Invite staff → assign Role
```

Permissions are strings like `crm.view`, `billing.edit` — not fixed “Editor /
Manager” enums. Sidebar = nav items mapped to required permissions.

**Phase:** document now; schema + enforcement after Platform Owner routing is
stable. Until then, `owner`/`admin` see full org nav; `member` keeps current
access (gradually tighten).

### 7. Registration & creation flows

```
Public Register → verify → (plan) → Organization created
             → membership role=owner  → Organization Admin
             → NEVER platform_owner

Platform Owner only via:
  1. Installer CLI (bootstrap)
  2. Platform panel / add-owner CLI (cap 4, step-up later)
  3. Recovery tooling (password/MFA reset — not minting from signup)
```

```
Platform Owner → Create Organization → Org Admin
Org Admin → Create Roles → Invite Staff → Staff login → filtered Workspace
```

## Rejected

- Calling Platform Owner “Super Admin” as a role name.  
- Public signup → Platform Dashboard.  
- One hard-coded dashboard per job title.  
- Unlimited Platform Owners.  
- Putting platform ops inside `(app)` behind a menu labeled Super Admin.

## Phased delivery

| Phase | Deliverable |
|-------|-------------|
| **P0** | ADR + `/home` identity router; Platform Owners land on `/platform`; signup unchanged (org-only) |
| **P1** | Platform Dashboard sections (orgs list first); coarse nav gate by `memberships.role` |
| **P2** | `roles` + `permissions` tables; Team UI; invite accept; dynamic sidebar |
| **P3** | Client portal surface |

## Acceptance

- [x] Documented: Platform Owner ≠ org role  
- [x] Post-login path prefers Platform Owner → `/platform`  
- [x] Org roles + invitations + permission-filtered nav (Team UI)  
- [ ] Platform Dashboard feature modules (incremental)  
- [ ] Client portal  
