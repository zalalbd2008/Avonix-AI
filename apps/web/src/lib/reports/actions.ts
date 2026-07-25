"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { reportShares, type TrackedEventBranding } from "@/lib/db/schema";
import { ensureShare, getShare } from "./share";

/**
 * Every write here filters by `agencyId` explicitly.
 *
 * `report_shares` is exempt from row-level security so a slug can be resolved
 * with no session (see db/rls.sql). That exemption means the usual safety net
 * is absent from this table and only this table — an UPDATE without the agency
 * filter would reach another tenant's row.
 */
function scoped(agencyId: string, shareId: string) {
  return and(eq(reportShares.id, shareId), eq(reportShares.agencyId, agencyId));
}

export async function createShareLink(clientId: string, websiteId: string) {
  const ctx = await requireAgency();

  const share = await ensureShare(ctx.agencyId, websiteId, ctx.userId);
  if (!share) return { ok: false as const, error: "That website does not exist." };

  revalidatePath(`/clients/${clientId}/websites/${websiteId}/reports`);
  revalidatePath(`/clients/${clientId}/websites/${websiteId}`);
  return { ok: true as const, slug: share.slug };
}

export async function setShareEnabled(
  clientId: string,
  websiteId: string,
  enabled: boolean,
) {
  const ctx = await requireAgency();

  const share = await getShare(ctx.agencyId, websiteId);
  if (!share) return { ok: false as const, error: "No share link to change." };

  await withAgency(ctx.agencyId, (tx) =>
    tx
      .update(reportShares)
      .set({ enabled, updatedAt: new Date() })
      .where(scoped(ctx.agencyId, share.id)),
  );

  revalidatePath(`/clients/${clientId}/websites/${websiteId}/reports`);
  return { ok: true as const };
}

export async function saveBranding(
  clientId: string,
  websiteId: string,
  branding: TrackedEventBranding,
  maskIps: boolean,
) {
  const ctx = await requireAgency();

  const share = await getShare(ctx.agencyId, websiteId);
  if (!share) return { ok: false as const, error: "Create the share link first." };

  const clean: TrackedEventBranding = {
    logoUrl: null, // Upload is not built; the initial is drawn instead.
    footerCredit: branding.footerCredit.trim().slice(0, 200),
    phone: branding.phone.trim().slice(0, 60),
    email: branding.email.trim().slice(0, 200),
  };

  await withAgency(ctx.agencyId, (tx) =>
    tx
      .update(reportShares)
      .set({ branding: clean, maskIps, updatedAt: new Date() })
      .where(scoped(ctx.agencyId, share.id)),
  );

  revalidatePath(`/clients/${clientId}/websites/${websiteId}/reports`);
  return { ok: true as const };
}

/** Clears the branding without touching the link itself (spec §8.5 "delete"). */
export async function clearBranding(clientId: string, websiteId: string) {
  return saveBranding(
    clientId,
    websiteId,
    { logoUrl: null, footerCredit: "", phone: "", email: "" },
    true,
  );
}
