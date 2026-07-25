/**
 * Shared Platform Owner types — safe for client components (no DB imports).
 */
import type { BillingOverrides } from "@/lib/billing/profile";
import type { AgencyPlan } from "@/lib/plans";

export type PlatformOrgPlan = AgencyPlan;
export type PlatformOrgStatus = "active" | "past_due" | "canceled";

export type PlatformOrganization = {
  id: string;
  name: string;
  slug: string;
  plan: PlatformOrgPlan;
  status: PlatformOrgStatus;
  createdAt: Date;
  clients: number;
  websites: number;
  members: number;
  ownerEmail: string | null;
  ownerName: string | null;
  overrides: BillingOverrides;
};

export type PlatformOrganizationStats = {
  total: number;
  active: number;
  pastDue: number;
  canceled: number;
  starter: number;
  professional: number;
  agency: number;
  enterprise: number;
};

export type UpdatePlatformOrganizationInput = {
  agencyId: string;
  name?: string;
  plan?: PlatformOrgPlan;
  status?: PlatformOrgStatus;
  suspended?: boolean;
  complimentary?: boolean;
  complimentaryPlan?: PlatformOrgPlan;
  maxClients?: number | null;
  maxWebsites?: number | null;
  maxUsers?: number | null;
  bonusAiCredits?: number | null;
  bonusWebsites?: number | null;
};
