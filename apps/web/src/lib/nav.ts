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

/** Agency-level sidebar — everything above a single client. */
export const agencyNav: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", status: "v1" },
      { label: "Inbox", href: "/inbox", status: "v1" },
    ],
  },
  {
    title: "Manage",
    items: [
      { label: "Clients", href: "/clients", status: "v1" },
      { label: "Websites", href: "/websites", status: "v1" },
    ],
  },
  {
    title: "Agency",
    items: [
      { label: "Billing", href: "/billing", status: "v1" },
      { label: "Settings", href: "/settings", status: "v1" },
      { label: "Team", href: "/settings/members", status: "v2" },
      { label: "Branding", href: "/settings/branding", status: "v2" },
    ],
  },
];

/** Client-level sidebar. `clientId` is substituted at render time. */
export function clientNav(clientId: string): NavSection[] {
  const base = `/clients/${clientId}` as Route;
  return [
    {
      items: [
        { label: "Overview", href: base, status: "v1" },
        { label: "Inbox", href: `${base}/inbox` as Route, status: "v1" },
      ],
    },
    {
      title: "CRM",
      items: [
        { label: "Contacts", href: `${base}/contacts` as Route, status: "v1" },
        { label: "Pipeline", href: `${base}/pipeline` as Route, status: "v1" },
      ],
    },
    {
      title: "Capture",
      items: [
        { label: "Forms", href: `${base}/forms` as Route, status: "v1" },
        { label: "Websites", href: `${base}/websites` as Route, status: "v1" },
      ],
    },
    {
      items: [{ label: "Settings", href: `${base}/settings` as Route, status: "v1" }],
    },
  ];
}

/** Website-level tabs, nested under a client. */
export function websiteNav(clientId: string, websiteId: string): NavItem[] {
  const base = `/clients/${clientId}/websites/${websiteId}` as Route;
  return [
    { label: "Overview", href: base, status: "v1" },
    { label: "Chat AI", href: `${base}/chat-ai` as Route, status: "v1" },
    { label: "Knowledge", href: `${base}/knowledge` as Route, status: "v1" },
    { label: "Settings", href: `${base}/settings` as Route, status: "v1" },
  ];
}

/** The onboarding wizard. The prototype's "Create Workspace" step is gone — ADR-002. */
export const onboardingSteps: NavItem[] = [
  { label: "Verify email", href: "/onboarding/verify-email", status: "v1" },
  { label: "Your agency", href: "/onboarding/agency", status: "v1" },
  { label: "First client", href: "/onboarding/client", status: "v1" },
  { label: "Their website", href: "/onboarding/website", status: "v1" },
  { label: "Install connector", href: "/onboarding/connector", status: "v1" },
];
