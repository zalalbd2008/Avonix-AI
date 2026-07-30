"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import {
  confirmMarketplaceCheckoutSession,
  listMyMarketplacePurchases,
  startMarketplaceCheckout,
} from "@/lib/forms/marketplace-billing";
import {
  installMarketplaceListing,
  listMarketplaceCatalog,
  listMyMarketplaceInstalls,
  publishTemplateToMarketplace,
  setMarketplaceListingStatus,
  updateMarketplaceListingPrice,
} from "@/lib/forms/marketplace-service";

export async function actionListMarketplace(q?: string) {
  const ctx = await requireAgency();
  const [cards, installedIds, purchasedIds] = await Promise.all([
    listMarketplaceCatalog(ctx.agencyId, { q }),
    listMyMarketplaceInstalls(ctx.agencyId),
    listMyMarketplacePurchases(ctx.agencyId),
  ]);
  return { cards, installedIds, purchasedIds, role: ctx.role };
}

export async function actionPublishTemplateToMarketplace(opts: {
  templateId: string;
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  publish?: boolean;
  /** Dollars (e.g. 29.99) or cents if ≥ 100 and integer-looking — prefer dollars from UI. */
  priceDollars?: number;
  priceCents?: number;
  currency?: string;
}) {
  const ctx = await requireAgency();
  const priceCents =
    opts.priceCents != null
      ? opts.priceCents
      : opts.priceDollars != null
        ? Math.round(Number(opts.priceDollars) * 100)
        : 0;
  const result = await publishTemplateToMarketplace(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    { ...opts, priceCents },
  );
  if (result.ok) {
    revalidatePath("/marketplace");
    revalidatePath("/templates");
  }
  return result;
}

export async function actionSetMarketplaceListingStatus(opts: {
  listingId: string;
  status: "published" | "draft" | "archived";
}) {
  const ctx = await requireAgency();
  const result = await setMarketplaceListingStatus(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    opts.listingId,
    opts.status,
  );
  if (result.ok) revalidatePath("/marketplace");
  return result;
}

export async function actionUpdateMarketplaceListingPrice(opts: {
  listingId: string;
  priceDollars: number;
}) {
  const ctx = await requireAgency();
  const result = await updateMarketplaceListingPrice(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    opts.listingId,
    Math.round(Number(opts.priceDollars) * 100),
  );
  if (result.ok) revalidatePath("/marketplace");
  return result;
}

export async function actionInstallMarketplaceListing(listingId: string) {
  const ctx = await requireAgency();
  const result = await installMarketplaceListing(
    ctx.agencyId,
    ctx.userId,
    listingId,
  );
  if (result.ok) {
    revalidatePath("/marketplace");
    revalidatePath("/templates");
  }
  return result;
}

export async function actionPurchaseMarketplaceListing(listingId: string) {
  const ctx = await requireAgency();
  const result = await startMarketplaceCheckout({
    agencyId: ctx.agencyId,
    agencyName: ctx.agencyName,
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    listingId,
  });
  return result;
}

export async function actionConfirmMarketplacePurchase(sessionId: string) {
  const ctx = await requireAgency();
  const result = await confirmMarketplaceCheckoutSession(
    ctx.agencyId,
    sessionId,
  );
  if (result.ok) {
    revalidatePath("/marketplace");
    revalidatePath("/templates");
  }
  return result;
}
