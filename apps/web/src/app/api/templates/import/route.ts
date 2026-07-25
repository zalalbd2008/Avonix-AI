import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import {
  importOrgLibraryPackage,
  previewLibraryImport,
} from "@/lib/forms/library-transfer";
import { unzipLibraryPackage } from "@/lib/forms/library-zip";
import type { LibraryImportStrategy } from "@/lib/forms/library-package";
import { summarizeSyncPlan } from "@/lib/forms/library-sync";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * POST /api/templates/import
 *
 * multipart form:
 *   file — .zip or .json library package
 *   strategy — skip | duplicate | overwrite (default duplicate)
 *   preview — "1" to only return the sync plan
 */
export async function POST(request: Request) {
  const ctx = await requireAgency();

  let file: File | null = null;
  let strategy: LibraryImportStrategy = "duplicate";
  let previewOnly = false;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const f = form.get("file");
    file = f instanceof File ? f : null;
    const s = String(form.get("strategy") ?? "duplicate");
    if (s === "skip" || s === "overwrite" || s === "duplicate") strategy = s;
    previewOnly = String(form.get("preview") ?? "") === "1";
  } else {
    const buf = new Uint8Array(await request.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return Response.json(
        { ok: false, error: "Package too large (max 8 MB)." },
        { status: 413 },
      );
    }
    const parsed = unzipLibraryPackage(buf);
    if (!parsed.ok) {
      return Response.json({ ok: false, error: parsed.error }, { status: 400 });
    }
    const plan = await previewLibraryImport(
      ctx.agencyId,
      ctx.userId,
      parsed.pkg,
      strategy,
    );
    const result = await importOrgLibraryPackage(
      ctx.agencyId,
      ctx.userId,
      ctx.role,
      parsed.pkg,
      strategy,
    );
    revalidatePath("/templates");
    return Response.json({ ...result, summary: summarizeSyncPlan(plan) });
  }

  if (!file) {
    return Response.json(
      { ok: false, error: "Attach a .zip or .json library package." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { ok: false, error: "Package too large (max 8 MB)." },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const parsed = unzipLibraryPackage(bytes);
  if (!parsed.ok) {
    return Response.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const plan = await previewLibraryImport(
    ctx.agencyId,
    ctx.userId,
    parsed.pkg,
    strategy,
  );

  if (previewOnly) {
    return Response.json({
      ok: true,
      preview: true,
      summary: summarizeSyncPlan(plan),
      plan,
      counts: parsed.pkg.manifest.counts,
    });
  }

  const result = await importOrgLibraryPackage(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    parsed.pkg,
    strategy,
  );
  revalidatePath("/templates");
  return Response.json({ ...result, summary: summarizeSyncPlan(plan) });
}
