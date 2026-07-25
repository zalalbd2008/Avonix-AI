"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import type { LibraryImportStrategy } from "@/lib/forms/library-package";
import { parseLibraryPackageJson } from "@/lib/forms/library-package";
import {
  buildOrgLibraryPackage,
  buildSyncCatalog,
  importOrgLibraryPackage,
  previewLibraryImport,
} from "@/lib/forms/library-transfer";
import { summarizeSyncPlan } from "@/lib/forms/library-sync";

export async function actionExportLibraryPackageJson(opts?: {
  templateIds?: string[];
}) {
  const ctx = await requireAgency();
  const pkg = await buildOrgLibraryPackage(
    ctx.agencyId,
    ctx.userId,
    ctx.agencyName,
    opts?.templateIds?.length
      ? { templateIds: opts.templateIds }
      : { all: true },
  );
  return { ok: true as const, pkg };
}

export async function actionPreviewLibraryImportJson(opts: {
  packageJson: unknown;
  strategy?: LibraryImportStrategy;
}) {
  const ctx = await requireAgency();
  const parsed = parseLibraryPackageJson(opts.packageJson);
  if (!parsed.ok) return { ok: false as const, error: parsed.error };
  const plan = await previewLibraryImport(
    ctx.agencyId,
    ctx.userId,
    parsed.pkg,
    opts.strategy ?? "duplicate",
  );
  return {
    ok: true as const,
    summary: summarizeSyncPlan(plan),
    plan,
    counts: parsed.pkg.manifest.counts,
  };
}

export async function actionImportLibraryPackageJson(opts: {
  packageJson: unknown;
  strategy?: LibraryImportStrategy;
}) {
  const ctx = await requireAgency();
  const parsed = parseLibraryPackageJson(opts.packageJson);
  if (!parsed.ok) return { ok: false as const, error: parsed.error };
  const result = await importOrgLibraryPackage(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    parsed.pkg,
    opts.strategy ?? "duplicate",
  );
  revalidatePath("/templates");
  return {
    ...result,
    summary: summarizeSyncPlan(result.plan),
  };
}

/** Manual sync snapshot — compare local catalog fingerprints (for UI). */
export async function actionManualSyncSnapshot() {
  const ctx = await requireAgency();
  const [pkg, catalog] = await Promise.all([
    buildOrgLibraryPackage(ctx.agencyId, ctx.userId, ctx.agencyName, {
      all: true,
    }),
    buildSyncCatalog(ctx.agencyId, ctx.userId),
  ]);
  return {
    ok: true as const,
    exportedAt: pkg.manifest.exportedAt,
    counts: pkg.manifest.counts,
    catalogSize: catalog.length,
    note: "Manual sync: export a ZIP backup, then re-import with overwrite to restore. Auto-sync cron is not enabled yet.",
  };
}
