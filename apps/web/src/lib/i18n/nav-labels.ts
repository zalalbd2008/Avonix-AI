import type { MessageKey } from "./messages";

/** Maps English nav labels from `nav.ts` to translation keys. */
export const NAV_LABEL_TO_KEY: Record<string, MessageKey> = {
  Dashboard: "nav.dashboard",
  Organizations: "nav.organizations",
  Clients: "nav.clients",
  "Plan & billing": "nav.planBilling",
  "Plan & Subscription": "nav.planSubscription",
  "Billing & Payments": "nav.billingPayments",
  Billing: "nav.billing",
  Subscription: "nav.subscription",
  "Plans & Pricing": "nav.plansPricing",
  "Usage & Limits": "nav.usageLimits",
  "Payment Methods": "nav.paymentMethods",
  "Billing History": "nav.billingHistory",
  Invoices: "nav.invoices",
  "Tax & Business Info": "nav.taxBusiness",
  "Add-ons": "nav.addons",
  Coupons: "nav.coupons",
  "Auto Renewal": "nav.autoRenewal",
  "Billing Settings": "nav.billingSettings",
  Licenses: "nav.licenses",
  Launchpad: "nav.launchpad",
  "Role Management": "nav.roleManagement",
  "Global Templates": "nav.globalTemplates",
  Marketplace: "nav.marketplace",
  Operations: "nav.operations",
  Overview: "nav.overview",
  Websites: "nav.websites",
  Inbox: "nav.inbox",
  Contacts: "nav.contacts",
  Pipeline: "nav.pipeline",
  Reports: "nav.reports",
  Settings: "nav.settings",
  Conversations: "nav.conversations",
  Forms: "nav.forms",
  Popup: "nav.popup",
  Buttons: "nav.buttons",
  "AI Chat": "nav.chatAi",
  "Chat AI": "nav.chatAi",
  Accessibility: "nav.accessibility",
  "Auto Rules": "nav.automation",
  Automation: "nav.automation",
  "SMTP Setup": "nav.email",
  Email: "nav.email",
  Insights: "nav.insights",
  Languages: "nav.languages",
  Integrations: "nav.integrations",
  "Reports & Analytics": "nav.reportsAnalytics",
  Health: "nav.health",
  Uptime: "nav.uptime",
  Updates: "nav.updates",
  Backups: "nav.backups",
  Security: "nav.security",
  "Error Log": "nav.errorLog",
  "Audit Log": "nav.auditLog",
};

export const SECTION_TITLE_TO_KEY: Record<string, MessageKey> = {
  Accounts: "section.accounts",
  "Website Workspace": "section.websiteWorkspace",
  Workspace: "section.workspace",
  Leads: "section.leads",
  Capture: "section.capture",
};

export function translateNavLabel(
  label: string,
  t: (key: MessageKey) => string,
): string {
  const key = NAV_LABEL_TO_KEY[label];
  return key ? t(key) : label;
}

export function translateSectionTitle(
  title: string,
  t: (key: MessageKey) => string,
): string {
  const key = SECTION_TITLE_TO_KEY[title];
  return key ? t(key) : title;
}
