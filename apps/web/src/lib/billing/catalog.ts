/**
 * Plan catalog for Billing UI (compare table, pricing cards).
 * Product ladder: Starter · Professional · Agency · Enterprise.
 */

export type BillingInterval = "month" | "year";

export type PlanKey = "starter" | "professional" | "agency" | "enterprise";

export type PlanFeatureKey =
  | "workspaces"
  | "websites"
  | "users"
  | "aiCredits"
  | "storage"
  | "emailSending"
  | "voiceAi"
  | "automation"
  | "integrations"
  | "whiteLabel"
  | "apiAccess";

export const PLAN_FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  workspaces: "Workspace limit",
  websites: "Website limit",
  users: "User limit",
  aiCredits: "AI credits / month",
  storage: "Storage",
  emailSending: "Email sending",
  voiceAi: "Voice AI",
  automation: "Automation",
  integrations: "Integrations",
  whiteLabel: "White label",
  apiAccess: "API access",
};

export type CatalogPlan = {
  key: PlanKey;
  /** Maps 1:1 to agencies.plan */
  agencyPlan: PlanKey;
  label: string;
  tagline: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  features: Record<PlanFeatureKey, string | boolean>;
  highlighted?: boolean;
  /** Contact sales instead of Stripe checkout */
  contactSales?: boolean;
};

export const CATALOG_PLANS: CatalogPlan[] = [
  {
    key: "starter",
    agencyPlan: "starter",
    label: "Starter",
    tagline: "Get started with one client site",
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: {
      workspaces: "1",
      websites: "1",
      users: "2",
      aiCredits: "100",
      storage: "1 GB",
      emailSending: "Basic",
      voiceAi: false,
      automation: false,
      integrations: "Core",
      whiteLabel: false,
      apiAccess: false,
    },
  },
  {
    key: "professional",
    agencyPlan: "professional",
    label: "Professional",
    tagline: "Growing agencies",
    monthlyPrice: 79,
    yearlyPrice: 790,
    features: {
      workspaces: "5",
      websites: "25",
      users: "10",
      aiCredits: "5,000",
      storage: "50 GB",
      emailSending: "Standard",
      voiceAi: "Limited",
      automation: true,
      integrations: "Standard",
      whiteLabel: false,
      apiAccess: true,
    },
  },
  {
    key: "agency",
    agencyPlan: "agency",
    label: "Agency",
    tagline: "Multi-client at scale",
    monthlyPrice: 149,
    yearlyPrice: 1490,
    highlighted: true,
    features: {
      workspaces: "10",
      websites: "50",
      users: "30",
      aiCredits: "50,000",
      storage: "200 GB",
      emailSending: "High volume",
      voiceAi: true,
      automation: true,
      integrations: "Advanced",
      whiteLabel: true,
      apiAccess: true,
    },
  },
  {
    key: "enterprise",
    agencyPlan: "enterprise",
    label: "Enterprise",
    tagline: "Custom limits & MSA",
    monthlyPrice: null,
    yearlyPrice: null,
    contactSales: true,
    features: {
      workspaces: "Custom",
      websites: "Custom",
      users: "Custom",
      aiCredits: "Custom",
      storage: "Custom",
      emailSending: "Custom",
      voiceAi: true,
      automation: true,
      integrations: "All + custom",
      whiteLabel: true,
      apiAccess: true,
    },
  },
];

export const ADDON_CATALOG = [
  { id: "websites", name: "Extra Website Pack", detail: "+10 websites", status: "v2" as const },
  { id: "workspaces", name: "Extra Workspace Pack", detail: "+5 workspaces", status: "v2" as const },
  { id: "users", name: "Extra Users", detail: "+5 seats", status: "v2" as const },
  { id: "ai", name: "Extra AI Credits", detail: "+10,000 / month", status: "v2" as const },
  { id: "storage", name: "Extra Storage", detail: "+100 GB", status: "v2" as const },
  { id: "voice", name: "Extra Voice Minutes", detail: "+1,000 min", status: "v2" as const },
  { id: "priority", name: "Priority Support", detail: "Business-hours SLA", status: "v2" as const },
  { id: "whitelabel", name: "White Label", detail: "Remove Avonix branding", status: "v2" as const },
  { id: "api", name: "API Extension", detail: "Higher rate limits", status: "v2" as const },
];

export function formatMoney(amount: number | null, interval?: BillingInterval) {
  if (amount === null) return "Custom";
  if (amount === 0) return "Free";
  const suffix = interval === "year" ? "/year" : interval === "month" ? "/month" : "";
  return `$${amount.toLocaleString()}${suffix}`;
}

export function catalogForAgencyPlan(plan: PlanKey): CatalogPlan {
  return CATALOG_PLANS.find((p) => p.agencyPlan === plan) ?? CATALOG_PLANS[0];
}
