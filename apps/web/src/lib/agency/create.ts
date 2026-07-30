"use server";

import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { agencies, memberships } from "@/lib/db/schema";
import type { BillingInterval } from "@/lib/billing/catalog";
import { startCheckoutForAgency } from "@/lib/billing/actions";
import { assertNotPlatformOwnerForOrg } from "@/lib/platform/owner";
import {
  readActiveOrgCookie,
  writeActiveOrgCookie,
} from "@/lib/auth/active-org";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "agency"
  );
}

/** Self-serve purchasable plans (Enterprise is sales-assisted). */
const SELF_SERVE_PLANS = [
  "starter",
  "professional",
  "agency",
] as const;

type SelfServePlan = (typeof SELF_SERVE_PLANS)[number];

type CreateAgencyResult =
  | { ok: true; agencyId: string; checkoutUrl: string }
  | { ok: false; error: string };

/**
 * Create the caller's agency and send them to Stripe Checkout.
 *
 * Self-serve accounts require purchasing a plan — there is no free create path.
 * Platform Owners provision complimentary orgs via `/platform/workspaces/new`.
 *
 * THE BOOTSTRAP PROBLEM: the policy on `agencies` is `id = current_agency_id()`,
 * so an insert with no tenant set fails its WITH CHECK — you cannot create the
 * first agency, because you are not yet a member of one.
 *
 * The fix is not to weaken the policy or reach for the admin role. We mint the
 * uuid here and set it as the tenant *before* inserting, so the new row
 * satisfies the same check every other row does.
 */
export async function createAgency(formData: FormData): Promise<CreateAgencyResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { ok: false, error: "Not signed in." };
  if (!session.user.emailVerified) {
    return {
      ok: false,
      error: "Confirm your email before creating an agency.",
    };
  }

  const platformGate = await assertNotPlatformOwnerForOrg(session.user.id);
  if (!platformGate.ok) return platformGate;

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    return { ok: false, error: "Give your organization a name." };
  }

  const website = String(formData.get("website") ?? "").trim();
  const billingName = String(formData.get("billingName") ?? "").trim();
  const billingEmail = String(formData.get("billingEmail") ?? "").trim();
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim() || "United States";
  const industry = String(formData.get("industry") ?? "").trim();
  const teamSize = String(formData.get("teamSize") ?? "").trim();

  if (billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) {
    return { ok: false, error: "Enter a valid billing email." };
  }

  const planRaw = String(formData.get("plan") ?? "").trim();
  if (!SELF_SERVE_PLANS.includes(planRaw as SelfServePlan)) {
    return {
      ok: false,
      error: "Select a plan to continue. Enterprise accounts are set up by sales.",
    };
  }
  const plan = planRaw as SelfServePlan;

  const intervalRaw = String(formData.get("interval") ?? "month").trim();
  const interval: BillingInterval =
    intervalRaw === "year" ? "year" : "month";

  const agencyId = crypto.randomUUID();
  const base = slugify(name);
  const slug = `${base}-${agencyId.slice(0, 6)}`;

  try {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.agency_id', ${agencyId}, true)`,
      );

      await tx.insert(agencies).values({
        id: agencyId,
        name,
        slug,
        plan,
        status: "active",
        billingProfile: {
          companyName: name,
          billingName,
          billingEmail,
          country,
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
          website,
          industry,
          teamSize,
          contactPhone,
          notifications: {
            paymentSucceeded: true,
            paymentFailed: true,
            upcomingRenewal: true,
            invoiceReady: true,
            planChanged: true,
          },
        },
      });

      await tx.insert(memberships).values({
        agencyId,
        userId: session.user.id,
        role: "owner",
        acceptedAt: new Date(),
      });
    });
  } catch (e) {
    console.error("createAgency failed", e);
    return {
      ok: false,
      error: "Could not create the organization. Try again.",
    };
  }

  // Prefer this tenant for checkout return — but restore the previous
  // cookie if Stripe checkout cannot start, otherwise a paid org user is
  // trapped on the unpaid paywall and it feels like a logout.
  const previousOrg = await readActiveOrgCookie();
  await writeActiveOrgCookie(agencyId);

  const successUrl =
    String(formData.get("successUrl") ?? "").trim() ||
    "/onboarding/billing?upgraded=1";
  const cancelUrl =
    String(formData.get("cancelUrl") ?? "").trim() || "/onboarding/billing";

  const checkout = await startCheckoutForAgency(agencyId, plan, interval, {
    successUrl,
    cancelUrl,
  });

  if (!checkout.ok) {
    if (previousOrg) {
      await writeActiveOrgCookie(previousOrg);
    }
    return {
      ok: false,
      error: checkout.error,
    };
  }

  return { ok: true, agencyId, checkoutUrl: checkout.url };
}
