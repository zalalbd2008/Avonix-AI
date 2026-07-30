/**
 * Every menu in the product, in one file.
 *
 * Add a page: create its `page.tsx`, then add one line here. Nothing else in the
 * app hard-codes a menu, so this file and the route tree are the only two places
 * navigation exists.
 *
 * `status` is enforced socially, not technically — but it keeps deferred work
 * visible instead of quietly creeping into v1.
 */
import type { Route } from "next";

export type NavStatus = "v1" | "v2";

export type NavItem = {
  label: string;
  /**
   * Typed against the real route tree (`typedRoutes` in next.config.ts), so a
   * link to a page that does not exist fails the build instead of 404-ing in
   * production.
   */
  href: Route;
  status: NavStatus;
  /** Org permission key required (ADR-013). Owners/admins always pass. */
  permission?: string;
  /** Line icon key rendered by the sidebar (`nav-icons.tsx`). */
  icon?: string;
  /** Nested items (e.g. Organizations → Overview / Websites / …). */
  children?: NavItem[];
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

/** Public marketing site. */
export const marketingNav: NavItem[] = [
  { label: "Features", href: "/features", status: "v1" },
  { label: "Pricing", href: "/pricing", status: "v1" },
  { label: "Docs", href: "/docs", status: "v2" },
  { label: "Blog", href: "/blog", status: "v2" },
  { label: "Contact", href: "/contact", status: "v1" },
];

/**
 * Platform Owner sidebar (ADR-012 / ADR-013) — cross-tenant.
 * Same IA shape as organization `agencyNav` (Accounts → Operations → Settings).
 */
export const platformNav: NavSection[] = [
  {
    title: "Accounts",
    items: [
      { label: "Dashboard", href: "/platform" as Route, status: "v1", icon: "home" },
      {
        label: "Organizations",
        href: "/platform/workspaces" as Route,
        status: "v1",
        icon: "building",
      },
      {
        label: "Plan & Subscription",
        href: "/platform/subscription" as Route,
        status: "v2",
        icon: "layers",
        children: [
          { label: "Overview", href: "/platform/billing" as Route, status: "v2", icon: "overview" },
          { label: "Subscription", href: "/platform/subscription" as Route, status: "v2", icon: "card" },
          { label: "Licenses", href: "/platform/licenses" as Route, status: "v2", icon: "shield" },
        ],
      },
      {
        label: "Billing & Payments",
        href: "/platform/billing" as Route,
        status: "v2",
        icon: "card",
        children: [
          { label: "Billing", href: "/platform/billing" as Route, status: "v2", icon: "card" },
          { label: "Licenses", href: "/platform/licenses" as Route, status: "v2", icon: "shield" },
        ],
      },
      { label: "Team", href: "/platform/team" as Route, status: "v1", icon: "users" },
      { label: "Global Templates", href: "/platform/templates" as Route, status: "v2", icon: "layout" },
      { label: "Marketplace", href: "/platform/marketplace" as Route, status: "v2", icon: "store" },
      {
        label: "Operations",
        href: "/platform/workspace" as Route,
        status: "v1",
        icon: "layers",
        children: [
          { label: "Overview", href: "/platform/workspace" as Route, status: "v1", icon: "overview" },
          { label: "Websites", href: "/platform/workspace/websites" as Route, status: "v2", icon: "globe" },
          { label: "Reports", href: "/platform/workspace/reports" as Route, status: "v2", icon: "chart" },
        ],
      },
    ],
  },
  {
    items: [
      { label: "Settings", href: "/platform/settings" as Route, status: "v2", icon: "gear" },
    ],
  },
];


/**
 * Organization admin sidebar — same IA shape as Platform, tenant-scoped.
 *
 * Accounts = this org’s subscription surface
 * Operations = day-to-day work (websites open into Website Workspace mode)
 */
export const agencyNav: NavSection[] = [
  {
    title: "Accounts",
    items: [
      { label: "Dashboard", href: "/dashboard", status: "v1", permission: "dashboard.view", icon: "home" },
      { label: "Launchpad", href: "/launchpad" as Route, status: "v1", permission: "dashboard.view", icon: "rocket" },
      { label: "Clients", href: "/clients", status: "v1", permission: "clients.view", icon: "users" },
      { label: "Organizations", href: "/organizations", status: "v1", permission: "organizations.view", icon: "building" },
      {
        label: "Plan & Subscription",
        href: "/billing",
        status: "v1",
        permission: "billing.view",
        icon: "layers",
        children: [
          { label: "Overview", href: "/billing", status: "v1", permission: "billing.view", icon: "overview" },
          { label: "Subscription", href: "/billing/subscription" as Route, status: "v1", permission: "billing.view", icon: "card" },
          { label: "Plans & Pricing", href: "/billing/plans" as Route, status: "v1", permission: "billing.view", icon: "layers" },
          { label: "Usage & Limits", href: "/billing/usage" as Route, status: "v1", permission: "billing.view", icon: "chart" },
          { label: "Add-ons", href: "/billing/addons" as Route, status: "v2", permission: "billing.view", icon: "spark" },
        ],
      },
      {
        label: "Billing & Payments",
        href: "/billing/payment-methods" as Route,
        status: "v1",
        permission: "billing.view",
        icon: "card",
        children: [
          { label: "Payment Methods", href: "/billing/payment-methods" as Route, status: "v1", permission: "billing.view", icon: "card" },
          { label: "Invoices", href: "/billing/invoices" as Route, status: "v1", permission: "billing.view", icon: "form" },
          { label: "Billing History", href: "/billing/history" as Route, status: "v1", permission: "billing.view", icon: "audit" },
          { label: "Tax & Business Info", href: "/billing/tax" as Route, status: "v1", permission: "billing.view", icon: "building" },
          { label: "Coupons", href: "/billing/coupons" as Route, status: "v2", permission: "billing.view", icon: "store" },
          { label: "Auto Renewal", href: "/billing/auto-renewal" as Route, status: "v1", permission: "billing.view", icon: "refresh" },
          { label: "Billing Settings", href: "/billing/settings" as Route, status: "v1", permission: "billing.view", icon: "gear" },
          { label: "Licenses", href: "/licenses", status: "v1", permission: "billing.view", icon: "shield" },
        ],
      },
      { label: "Role Management", href: "/settings/members", status: "v1", permission: "team.view", icon: "users" },
      { label: "Global Templates", href: "/templates", status: "v1", permission: "templates.view", icon: "layout" },
      { label: "Marketplace", href: "/marketplace", status: "v1", permission: "marketplace.view", icon: "store" },
      {
        label: "Operations",
        href: "/super-admin" as Route,
        status: "v1",
        icon: "layers",
        children: [
          { label: "Overview", href: "/super-admin" as Route, status: "v1", permission: "settings.view", icon: "overview" },
          { label: "Websites", href: "/websites", status: "v1", permission: "websites.view", icon: "globe" },
          { label: "Reports", href: "/analytics" as Route, status: "v2", icon: "chart" },
        ],
      },
    ],
  },
  {
    items: [
      { label: "Settings", href: "/settings", status: "v1", permission: "settings.view", icon: "gear" },
    ],
  },
];



function filterItem(item: NavItem, set: Set<string>): NavItem | null {
  if (item.children?.length) {
    const children = item.children
      .map((c) => filterItem(c, set))
      .filter((c): c is NavItem => c != null);
    if (children.length === 0) return null;
    return { ...item, children };
  }
  if (item.permission && !set.has(item.permission)) return null;
  return item;
}

/** Filter agency nav by the caller's permission set (`*` = full). */
export function filterNavByPermissions(
  sections: NavSection[],
  permissions: string[] | "*",
): NavSection[] {
  if (permissions === "*") return sections;
  const set = new Set(permissions);
  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => filterItem(item, set))
        .filter((item): item is NavItem => item != null),
    }))
    .filter((section) => section.items.length > 0);
}

/** Flatten hrefs for active-state precedence (longest match wins). */
export function flattenNavHrefs(sections: NavSection[]): string[] {
  const out: string[] = [];
  function walk(items: NavItem[]) {
    for (const item of items) {
      out.push(item.href);
      if (item.children?.length) walk(item.children);
    }
  }
  for (const section of sections) walk(section.items);
  return out;
}

/** Client-level sidebar — workspace first, then leads, then capture tools. */
export function clientNav(clientId: string): NavSection[] {
  const base = `/clients/${clientId}` as Route;
  return [
    {
      title: "Workspace",
      items: [
        { label: "Overview", href: base, status: "v1", icon: "home" },
        {
          label: "Websites",
          href: `${base}/websites` as Route,
          status: "v1",
          icon: "globe",
        },
      ],
    },
    {
      title: "Leads",
      items: [
        {
          label: "Inbox",
          href: `${base}/inbox` as Route,
          status: "v1",
          icon: "chat",
        },
        {
          label: "Contacts",
          href: `${base}/contacts` as Route,
          status: "v1",
          icon: "users",
        },
        {
          label: "Pipeline",
          href: `${base}/pipeline` as Route,
          status: "v1",
          icon: "chart",
        },
      ],
    },
    {
      title: "Capture",
      items: [
        {
          label: "Forms",
          href: `${base}/forms` as Route,
          status: "v1",
          icon: "form",
        },
      ],
    },
    {
      items: [
        {
          label: "Settings",
          href: `${base}/settings` as Route,
          status: "v1",
          icon: "gear",
        },
      ],
    },
  ];
}

/**
 * Website-level sidebar — “Website Workspace” under Workspace → Websites.
 */
export function websiteNav(clientId: string, websiteId: string): NavSection[] {
  const base = `/clients/${clientId}/websites/${websiteId}` as Route;
  const crm = `${base}/crm` as Route;
  return [
    {
      title: "Website Workspace",
      items: [
        { label: "Dashboard", href: base, status: "v1", icon: "home" },
        { label: "Conversations", href: `${base}/conversations` as Route, status: "v1", icon: "chat" },
        { label: "Forms", href: `${base}/forms` as Route, status: "v1", icon: "form" },
        { label: "Popup", href: `${base}/popup` as Route, status: "v1", icon: "popup" },
        { label: "Buttons", href: `${base}/buttons` as Route, status: "v1", icon: "button" },
        { label: "AI Chat", href: `${base}/chat-ai` as Route, status: "v1", icon: "spark" },
        {
          label: "CRM",
          href: crm,
          status: "v1",
          icon: "heart",
          children: [
            { label: "CRM Home", href: crm, status: "v1", icon: "heart" },
            { label: "Tasks", href: `${crm}/tasks` as Route, status: "v1", icon: "bolt" },
            { label: "Assign", href: `${crm}/assign` as Route, status: "v1", icon: "users" },
            { label: "Notes", href: `${crm}/notes` as Route, status: "v1", icon: "form" },
            { label: "Files", href: `${crm}/files` as Route, status: "v1", icon: "archive" },
            { label: "Lead Score", href: `${crm}/score` as Route, status: "v1", icon: "chart" },
            { label: "Proposals", href: `${crm}/proposals` as Route, status: "v1", icon: "form" },
            { label: "Tickets", href: `${crm}/tickets` as Route, status: "v1", icon: "alert" },
            { label: "Calendar", href: `${crm}/calendar` as Route, status: "v1", icon: "activity" },
            { label: "Copilot", href: `${crm}/copilot` as Route, status: "v1", icon: "spark" },
          ],
        },
        { label: "Accessibility", href: `${base}/accessibility` as Route, status: "v1", icon: "accessibility" },
        { label: "Auto Rules", href: `${base}/automation` as Route, status: "v1", icon: "bolt" },
        { label: "SMTP Setup", href: `${base}/email` as Route, status: "v1", icon: "mail" },
        { label: "Insights", href: `${base}/insights` as Route, status: "v2", icon: "spark" },
        { label: "Languages", href: `${base}/languages` as Route, status: "v1", icon: "language" },
        { label: "Integrations", href: `${base}/integrations` as Route, status: "v2", icon: "plug" },
        { label: "Reports & Analytics", href: `${base}/reports` as Route, status: "v1", icon: "chart" },
        { label: "Health", href: `${base}/health` as Route, status: "v2", icon: "heart" },
        { label: "Uptime", href: `${base}/uptime` as Route, status: "v1", icon: "activity" },
        { label: "Updates", href: `${base}/updates` as Route, status: "v1", icon: "refresh" },
        { label: "Backups", href: `${base}/backups` as Route, status: "v2", icon: "archive" },
        { label: "Security", href: `${base}/security` as Route, status: "v2", icon: "shield" },
        { label: "Error Log", href: `${base}/error-log` as Route, status: "v2", icon: "alert" },
        { label: "Audit Log", href: `${base}/audit-log` as Route, status: "v2", icon: "audit" },
      ],
    },
  ];
}

/** The onboarding wizard. The prototype's "Create Workspace" step is gone — ADR-002. */
export const onboardingSteps: NavItem[] = [
  { label: "Verify email", href: "/onboarding/verify-email", status: "v1" },
  { label: "Your agency", href: "/onboarding/agency", status: "v1" },
  { label: "First client", href: "/onboarding/client", status: "v1" },
  { label: "Their website", href: "/onboarding/website", status: "v1" },
  { label: "Get plugin", href: "/onboarding/plugin" as Route, status: "v1" },
  { label: "Install", href: "/onboarding/connector", status: "v1" },
];
