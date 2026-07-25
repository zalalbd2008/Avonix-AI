/**
 * Agency billing profile + owner overrides (stored as jsonb on agencies).
 */

import type { Agency } from "@/lib/db/schema";

export type BillingNotificationPrefs = {
  paymentSucceeded: boolean;
  paymentFailed: boolean;
  upcomingRenewal: boolean;
  invoiceReady: boolean;
  planChanged: boolean;
};

export type BillingProfile = {
  companyName: string;
  billingName: string;
  billingEmail: string;
  country: string;
  state: string;
  city: string;
  zip: string;
  taxId: string;
  taxExemptNote: string;
  taxStatus: string;
  invoiceLanguage: string;
  invoicePrefix: string;
  poNumber: string;
  currencyDisplay: string;
  notifications: BillingNotificationPrefs;
};

export type BillingOverrides = {
  /** Org owner paused access without cancelling Stripe. */
  suspended?: boolean;
  complimentary?: boolean;
  complimentaryPlan?: Agency["plan"];
  maxClients?: number;
  maxWebsites?: number;
  maxUsers?: number;
  bonusAiCredits?: number;
  bonusWebsites?: number;
};

export const DEFAULT_BILLING_PROFILE: BillingProfile = {
  companyName: "",
  billingName: "",
  billingEmail: "",
  country: "United States",
  state: "",
  city: "",
  zip: "",
  taxId: "",
  taxExemptNote: "",
  taxStatus: "Tax-inclusive pricing",
  invoiceLanguage: "English",
  invoicePrefix: "INV-",
  poNumber: "",
  currencyDisplay: "USD",
  notifications: {
    paymentSucceeded: true,
    paymentFailed: true,
    upcomingRenewal: true,
    invoiceReady: true,
    planChanged: true,
  },
};

export function mergeBillingProfile(
  raw: BillingProfile | null | undefined,
  defaults?: Partial<BillingProfile>,
): BillingProfile {
  return {
    ...DEFAULT_BILLING_PROFILE,
    ...defaults,
    ...raw,
    notifications: {
      ...DEFAULT_BILLING_PROFILE.notifications,
      ...defaults?.notifications,
      ...raw?.notifications,
    },
  };
}

export function mergeBillingOverrides(
  raw: BillingOverrides | null | undefined,
): BillingOverrides {
  return { ...(raw ?? {}) };
}
