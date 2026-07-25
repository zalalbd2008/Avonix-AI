"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import {
  installMarketplaceListing,
  listMarketplaceCatalog,
  listMyMarketplaceInstalls,
  publishTemplateToMarketplace,
  setMarketplaceListingStatus,
} from "@/lib/forms/marketplace-service";

export async function actionListMarketplace(q?: string) {
  const ctx = await requireAgency();
  const [cards, installedIds] = await Promise.all([
    listMarketplaceCatalog(ctx.agencyId, { q }),
    listMyMarketplaceInstalls(ctx.agencyId),
  ]);
  return { cards, installedIds, role: ctx.role };
}

export async function actionPublishTemplateToMarketplace(opts: {
  templateId: string;
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  publish?: boolean;
}) {
  const ctx = await requireAgency();
  const result = await publishTemplateToMarketplace(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    opts,
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
