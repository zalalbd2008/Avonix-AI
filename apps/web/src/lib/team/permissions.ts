/**
 * Immutable permission catalog for organization workspaces (ADR-013).
 * Keys are stored on `org_role_permissions.permission`.
 */
export type PermissionKey = (typeof ALL_PERMISSIONS)[number]["key"];

export type PermissionDef = {
  key: string;
  label: string;
  group: string;
};

export const ALL_PERMISSIONS = [
  { key: "dashboard.view", label: "Dashboard", group: "Workspace" },
  { key: "inbox.view", label: "Inbox", group: "Workspace" },
  { key: "clients.view", label: "Clients", group: "Workspace" },
  { key: "clients.edit", label: "Edit clients", group: "Workspace" },
  { key: "websites.view", label: "Websites", group: "Workspace" },
  { key: "websites.edit", label: "Edit websites", group: "Workspace" },
  { key: "crm.view", label: "CRM / pipeline", group: "CRM" },
  { key: "crm.edit", label: "Edit CRM", group: "CRM" },
  { key: "contacts.view", label: "Contacts", group: "CRM" },
  { key: "contacts.edit", label: "Edit contacts", group: "CRM" },
  { key: "forms.view", label: "Forms", group: "Capture" },
  { key: "forms.edit", label: "Edit forms", group: "Capture" },
  { key: "chat.view", label: "Live chat", group: "Capture" },
  { key: "chat.reply", label: "Reply in chat", group: "Capture" },
  { key: "templates.view", label: "Templates", group: "Library" },
  { key: "marketplace.view", label: "Marketplace", group: "Library" },
  { key: "billing.view", label: "Billing", group: "Admin" },
  { key: "billing.edit", label: "Manage billing", group: "Admin" },
  { key: "settings.view", label: "Settings", group: "Admin" },
  { key: "settings.edit", label: "Edit settings", group: "Admin" },
  { key: "team.view", label: "View team", group: "Admin" },
  { key: "team.manage", label: "Manage team & roles", group: "Admin" },
  { key: "organizations.view", label: "Organizations list", group: "Admin" },
] as const satisfies readonly PermissionDef[];

export const PERMISSION_KEYS = ALL_PERMISSIONS.map((p) => p.key);

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}

/** Nav href → permission required to see the item. Missing = visible to all members. */
export const NAV_PERMISSION: Record<string, string> = {
  "/dashboard": "dashboard.view",
  "/inbox": "inbox.view",
  "/organizations": "organizations.view",
  "/clients": "clients.view",
  "/websites": "websites.view",
  "/billing": "billing.view",
  "/billing/subscription": "billing.view",
  "/billing/plans": "billing.view",
  "/billing/usage": "billing.view",
  "/billing/addons": "billing.view",
  "/billing/payment-methods": "billing.view",
  "/billing/history": "billing.view",
  "/billing/invoices": "billing.view",
  "/billing/tax": "billing.view",
  "/billing/coupons": "billing.view",
  "/billing/auto-renewal": "billing.view",
  "/billing/settings": "billing.view",
  "/licenses": "billing.view",
  "/templates": "templates.view",
  "/marketplace": "marketplace.view",
  "/settings": "settings.view",
  "/settings/members": "team.view",
  "/settings/branding": "settings.view",
  "/super-admin": "settings.view",
};

export const ROLE_TEMPLATES: {
  name: string;
  description: string;
  permissions: string[];
}[] = [
  {
    name: "Administrator",
    description: "Full workspace access except billing ownership tools",
    permissions: [...PERMISSION_KEYS],
  },
  {
    name: "Manager",
    description: "Clients, websites, CRM, forms, and team view",
    permissions: [
      "dashboard.view",
      "inbox.view",
      "clients.view",
      "clients.edit",
      "websites.view",
      "websites.edit",
      "crm.view",
      "crm.edit",
      "contacts.view",
      "contacts.edit",
      "forms.view",
      "forms.edit",
      "chat.view",
      "chat.reply",
      "templates.view",
      "team.view",
      "settings.view",
    ],
  },
  {
    name: "Website Manager",
    description: "Websites, forms, chat, and templates",
    permissions: [
      "dashboard.view",
      "clients.view",
      "websites.view",
      "websites.edit",
      "forms.view",
      "forms.edit",
      "chat.view",
      "chat.reply",
      "templates.view",
      "marketplace.view",
      "settings.view",
    ],
  },
  {
    name: "SEO Specialist",
    description: "Websites, forms, and reporting views",
    permissions: [
      "dashboard.view",
      "clients.view",
      "websites.view",
      "websites.edit",
      "forms.view",
      "templates.view",
      "marketplace.view",
    ],
  },
  {
    name: "User",
    description: "Day-to-day view access with light edits",
    permissions: [
      "dashboard.view",
      "inbox.view",
      "clients.view",
      "websites.view",
      "crm.view",
      "contacts.view",
      "forms.view",
      "chat.view",
      "templates.view",
    ],
  },
  {
    name: "Sales Manager",
    description: "CRM, contacts, clients, and inbox",
    permissions: [
      "dashboard.view",
      "inbox.view",
      "clients.view",
      "clients.edit",
      "websites.view",
      "crm.view",
      "crm.edit",
      "contacts.view",
      "contacts.edit",
    ],
  },
  {
    name: "Support Agent",
    description: "Inbox, chat, and contacts",
    permissions: [
      "dashboard.view",
      "inbox.view",
      "contacts.view",
      "chat.view",
      "chat.reply",
      "clients.view",
    ],
  },
  {
    name: "Marketing Manager",
    description: "Forms, templates, and websites",
    permissions: [
      "dashboard.view",
      "clients.view",
      "websites.view",
      "websites.edit",
      "forms.view",
      "forms.edit",
      "templates.view",
      "marketplace.view",
    ],
  },
  {
    name: "Developer",
    description: "Websites and settings (read)",
    permissions: [
      "dashboard.view",
      "clients.view",
      "websites.view",
      "websites.edit",
      "settings.view",
    ],
  },
];

/**
 * Seats Platform Owner can assign when provisioning an organization.
 * Coarse `owner` / `admin` bypass custom roles; others use a template role.
 */
export const PLATFORM_ORG_SEATS = [
  {
    id: "owner",
    label: "Organization Owner",
    description: "Full control of the organization (billing + team)",
    memberRole: "owner" as const,
    customRoleName: null,
  },
  {
    id: "admin",
    label: "Admin",
    description: "Full workspace access (coarse admin seat)",
    memberRole: "admin" as const,
    customRoleName: null,
  },
  {
    id: "administrator",
    label: "Administrator",
    description: "Custom role with all permissions",
    memberRole: "member" as const,
    customRoleName: "Administrator",
  },
  {
    id: "manager",
    label: "Manager",
    description: "Operations across clients and CRM",
    memberRole: "member" as const,
    customRoleName: "Manager",
  },
  {
    id: "website",
    label: "Website Manager",
    description: "Sites, forms, and chat",
    memberRole: "member" as const,
    customRoleName: "Website Manager",
  },
  {
    id: "seo",
    label: "SEO Specialist",
    description: "Websites and content capture tools",
    memberRole: "member" as const,
    customRoleName: "SEO Specialist",
  },
  {
    id: "user",
    label: "User",
    description: "Standard day-to-day access",
    memberRole: "member" as const,
    customRoleName: "User",
  },
  {
    id: "sales",
    label: "Sales Manager",
    description: "CRM and pipeline",
    memberRole: "member" as const,
    customRoleName: "Sales Manager",
  },
  {
    id: "support",
    label: "Support Agent",
    description: "Inbox and live chat",
    memberRole: "member" as const,
    customRoleName: "Support Agent",
  },
  {
    id: "marketing",
    label: "Marketing Manager",
    description: "Forms and templates",
    memberRole: "member" as const,
    customRoleName: "Marketing Manager",
  },
  {
    id: "developer",
    label: "Developer",
    description: "Websites and technical settings",
    memberRole: "member" as const,
    customRoleName: "Developer",
  },
] as const;

export type PlatformOrgSeatId = (typeof PLATFORM_ORG_SEATS)[number]["id"];

export function platformOrgSeatById(id: string) {
  return PLATFORM_ORG_SEATS.find((s) => s.id === id) ?? null;
}
