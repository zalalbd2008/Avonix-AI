/**
 * Build / import org library packages (ADR-007 Step 6).
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  formAssets,
  formComponents,
  formSections,
  formTemplates,
  formTemplateVersions,
  type FormField,
  type FormSettings,
} from "@/lib/db/schema";
import {
  emptyLibraryPackage,
  finalizeManifest,
  fingerprintAsset,
  fingerprintFieldsPiece,
  fingerprintTemplate,
  type LibraryImportStrategy,
  type LibraryPackage,
  type PackagedAsset,
  type PackagedComponent,
  type PackagedSection,
  type PackagedTemplate,
} from "./library-package";
import {
  catalogFromPackage,
  planLibrarySync,
  resolveImportAction,
  type SyncCatalogItem,
  type SyncPlan,
} from "./library-sync";
import { DEFAULT_SETTINGS } from "./fields";

export type ExportLibraryFilter = {
  templateIds?: string[];
  componentIds?: string[];
  sectionIds?: string[];
  assetIds?: string[];
  /** When true (default) and no ids, export everything visible. */
  all?: boolean;
};

export type ImportLibraryResult = {
  ok: true;
  created: number;
  updated: number;
  skipped: number;
  duplicated: number;
  plan: SyncPlan;
  errors: string[];
};

function cloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function shouldExportAll(filter: ExportLibraryFilter): boolean {
  return (
    filter.all !== false &&
    !filter.templateIds?.length &&
    !filter.componentIds?.length &&
    !filter.sectionIds?.length &&
    !filter.assetIds?.length
  );
}

export async function buildOrgLibraryPackage(
  agencyId: string,
  userId: string,
  agencyName: string | undefined,
  filter: ExportLibraryFilter = { all: true },
): Promise<LibraryPackage> {
  return withAgency(agencyId, async (tx) => {
    const pkg = emptyLibraryPackage(agencyName);
    const exportAll = shouldExportAll(filter);

    const templates = await tx
      .select()
      .from(formTemplates)
      .where(isNull(formTemplates.deletedAt))
      .limit(200);
    const wantTemplates = exportAll
      ? templates.filter(
          (t) => t.scope !== "personal" || t.createdBy === userId,
        )
      : filter.templateIds?.length
        ? templates.filter((t) => filter.templateIds!.includes(t.id))
        : [];

    pkg.templates = wantTemplates.map(
      (t): PackagedTemplate => ({
        kind: "template",
        sourceId: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags ?? [],
        fields: cloneJson(t.fields ?? []),
        settings: cloneJson(t.settings ?? { steps: [] }),
        submitLabel: t.submitLabel,
        successMessage: t.successMessage,
        scope: t.scope === "global" ? "organization" : t.scope,
        status: "draft",
        visibility: "organization",
        version: t.version,
      }),
    );

    const components = await tx
      .select()
      .from(formComponents)
      .where(isNull(formComponents.deletedAt))
      .limit(200);
    const wantComponents = exportAll
      ? components.filter(
          (c) => c.scope !== "personal" || c.createdBy === userId,
        )
      : filter.componentIds?.length
        ? components.filter((c) => filter.componentIds!.includes(c.id))
        : [];
    pkg.components = wantComponents.map(
      (c): PackagedComponent => ({
        kind: "component",
        sourceId: c.id,
        name: c.name,
        description: c.description,
        category: c.category,
        tags: c.tags ?? [],
        fields: cloneJson(c.fields ?? []),
        scope: "organization",
        status: "published",
        visibility: "organization",
      }),
    );

    const sections = await tx
      .select()
      .from(formSections)
      .where(isNull(formSections.deletedAt))
      .limit(200);
    const wantSections = exportAll
      ? sections.filter(
          (s) => s.scope !== "personal" || s.createdBy === userId,
        )
      : filter.sectionIds?.length
        ? sections.filter((s) => filter.sectionIds!.includes(s.id))
        : [];
    pkg.sections = wantSections.map(
      (s): PackagedSection => ({
        kind: "section",
        sourceId: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        tags: s.tags ?? [],
        fields: cloneJson(s.fields ?? []),
        scope: "organization",
        status: "published",
        visibility: "organization",
      }),
    );

    const assets = await tx
      .select()
      .from(formAssets)
      .where(isNull(formAssets.deletedAt))
      .limit(200);
    const wantAssets = exportAll
      ? assets.filter(
          (a) => a.scope !== "personal" || a.createdBy === userId,
        )
      : filter.assetIds?.length
        ? assets.filter((a) => filter.assetIds!.includes(a.id))
        : [];
    pkg.assets = wantAssets.map(
      (a): PackagedAsset => ({
        kind: "asset",
        sourceId: a.id,
        name: a.name,
        description: a.description,
        url: a.url,
        kindType: a.kind,
        mimeType: a.mimeType,
        folder: a.folder,
        tags: a.tags ?? [],
        scope: "organization",
        visibility: "organization",
      }),
    );

    return finalizeManifest(pkg);
  });
}

export async function buildSyncCatalog(
  agencyId: string,
  userId: string,
): Promise<SyncCatalogItem[]> {
  const pkg = await buildOrgLibraryPackage(agencyId, userId, undefined, {
    all: true,
  });
  return catalogFromPackage(pkg).map((item) => ({
    ...item,
    id: item.sourceId ?? item.id,
  }));
}

export async function previewLibraryImport(
  agencyId: string,
  userId: string,
  pkg: LibraryPackage,
  strategy: LibraryImportStrategy = "duplicate",
): Promise<SyncPlan> {
  const existing = await buildSyncCatalog(agencyId, userId);
  return planLibrarySync(pkg, existing, strategy);
}

export async function importOrgLibraryPackage(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  pkg: LibraryPackage,
  strategy: LibraryImportStrategy = "duplicate",
): Promise<ImportLibraryResult> {
  const canOverwrite = role === "owner" || role === "admin";
  const effectiveStrategy: LibraryImportStrategy =
    strategy === "overwrite" && !canOverwrite ? "duplicate" : strategy;

  const existing = await buildSyncCatalog(agencyId, userId);
  const plan = planLibrarySync(pkg, existing, effectiveStrategy);
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let duplicated = 0;

  const conflictByKey = new Map<string, (typeof plan.toUpdate)[0]>();
  for (const c of [...plan.toUpdate, ...plan.unchanged]) {
    const key = c.incomingSourceId
      ? `${c.kind}:id:${c.incomingSourceId}`
      : `${c.kind}:name:${c.incomingName.toLowerCase()}`;
    conflictByKey.set(key, c);
  }

  await withAgency(agencyId, async (tx) => {
    for (const t of pkg.templates) {
      if (!Array.isArray(t.fields) || t.fields.length === 0) {
        errors.push(`Template “${t.name}” has no fields.`);
        continue;
      }
      const key = t.sourceId
        ? `template:id:${t.sourceId}`
        : `template:name:${t.name.toLowerCase()}`;
      const conflict = conflictByKey.get(key);
      const action = resolveImportAction(
        Boolean(conflict),
        Boolean(conflict?.fingerprintMatch),
        effectiveStrategy,
      );

      if (action === "skip") {
        skipped += 1;
        continue;
      }

      const fields = cloneJson(t.fields) as FormField[];
      const settings = cloneJson(
        (t.settings ?? DEFAULT_SETTINGS) as FormSettings,
      );
      const nameBase = t.name.trim().slice(0, 100) || "Imported template";
      const name =
        action === "duplicate" && conflict
          ? `${nameBase} (import)`.slice(0, 120)
          : nameBase;

      if (action === "overwrite" && conflict) {
        const [current] = await tx
          .select({ version: formTemplates.version })
          .from(formTemplates)
          .where(eq(formTemplates.id, conflict.existingId))
          .limit(1);
        const nextVersion = (current?.version ?? 1) + 1;
        await tx
          .update(formTemplates)
          .set({
            name,
            description: t.description?.slice(0, 2000) || null,
            category:
              (t.category as typeof formTemplates.$inferInsert.category) ??
              null,
            tags: t.tags?.slice(0, 20) ?? [],
            fields,
            settings,
            submitLabel: (t.submitLabel ?? "Send").slice(0, 80),
            successMessage: (
              t.successMessage ?? "Thanks — we'll be in touch."
            ).slice(0, 500),
            updatedBy: userId,
            updatedAt: sql`now()`,
            version: nextVersion,
          })
          .where(
            and(
              eq(formTemplates.id, conflict.existingId),
              isNull(formTemplates.deletedAt),
            ),
          );
        await tx.insert(formTemplateVersions).values({
          agencyId,
          templateId: conflict.existingId,
          version: nextVersion,
          changelog: "Restored from library package import",
          fields,
          settings,
          submitLabel: (t.submitLabel ?? "Send").slice(0, 80),
          successMessage: (
            t.successMessage ?? "Thanks — we'll be in touch."
          ).slice(0, 500),
          createdBy: userId,
        });
        updated += 1;
        continue;
      }

      const [row] = await tx
        .insert(formTemplates)
        .values({
          agencyId,
          name,
          description: t.description?.slice(0, 2000) || null,
          category:
            (t.category as typeof formTemplates.$inferInsert.category) ?? null,
          tags: t.tags?.slice(0, 20) ?? [],
          fields,
          settings,
          submitLabel: (t.submitLabel ?? "Send").slice(0, 80),
          successMessage: (
            t.successMessage ?? "Thanks — we'll be in touch."
          ).slice(0, 500),
          scope: "organization",
          status: "draft",
          visibility: "organization",
          createdBy: userId,
          updatedBy: userId,
          version: 1,
        })
        .returning({ id: formTemplates.id });
      if (row) {
        await tx.insert(formTemplateVersions).values({
          agencyId,
          templateId: row.id,
          version: 1,
          changelog: "Imported from library package",
          fields,
          settings,
          submitLabel: (t.submitLabel ?? "Send").slice(0, 80),
          successMessage: (
            t.successMessage ?? "Thanks — we'll be in touch."
          ).slice(0, 500),
          createdBy: userId,
        });
        if (action === "duplicate" && conflict) duplicated += 1;
        else created += 1;
      }
    }

    for (const c of pkg.components) {
      if (!Array.isArray(c.fields) || c.fields.length === 0) {
        errors.push(`Component “${c.name}” has no fields.`);
        continue;
      }
      const key = c.sourceId
        ? `component:id:${c.sourceId}`
        : `component:name:${c.name.toLowerCase()}`;
      const conflict = conflictByKey.get(key);
      const action = resolveImportAction(
        Boolean(conflict),
        Boolean(conflict?.fingerprintMatch),
        effectiveStrategy,
      );
      if (action === "skip") {
        skipped += 1;
        continue;
      }
      const fields = cloneJson(c.fields) as FormField[];
      const nameBase = c.name.trim().slice(0, 100) || "Imported component";
      const name =
        action === "duplicate" && conflict
          ? `${nameBase} (import)`.slice(0, 120)
          : nameBase;

      if (action === "overwrite" && conflict) {
        await tx
          .update(formComponents)
          .set({
            name,
            description: c.description?.slice(0, 500) || null,
            category: c.category || null,
            tags: c.tags?.slice(0, 20) ?? [],
            fields,
            updatedBy: userId,
            updatedAt: sql`now()`,
          })
          .where(eq(formComponents.id, conflict.existingId));
        updated += 1;
        continue;
      }

      await tx.insert(formComponents).values({
        agencyId,
        name,
        description: c.description?.slice(0, 500) || null,
        category: c.category || null,
        tags: c.tags?.slice(0, 20) ?? [],
        fields,
        scope: "organization",
        status: "published",
        visibility: "organization",
        createdBy: userId,
        updatedBy: userId,
      });
      if (action === "duplicate" && conflict) duplicated += 1;
      else created += 1;
    }

    for (const s of pkg.sections) {
      if (!Array.isArray(s.fields) || s.fields.length === 0) {
        errors.push(`Section “${s.name}” has no fields.`);
        continue;
      }
      const key = s.sourceId
        ? `section:id:${s.sourceId}`
        : `section:name:${s.name.toLowerCase()}`;
      const conflict = conflictByKey.get(key);
      const action = resolveImportAction(
        Boolean(conflict),
        Boolean(conflict?.fingerprintMatch),
        effectiveStrategy,
      );
      if (action === "skip") {
        skipped += 1;
        continue;
      }
      const fields = cloneJson(s.fields) as FormField[];
      const nameBase = s.name.trim().slice(0, 100) || "Imported section";
      const name =
        action === "duplicate" && conflict
          ? `${nameBase} (import)`.slice(0, 120)
          : nameBase;

      if (action === "overwrite" && conflict) {
        await tx
          .update(formSections)
          .set({
            name,
            description: s.description?.slice(0, 500) || null,
            category: s.category || null,
            tags: s.tags?.slice(0, 20) ?? [],
            fields,
            updatedBy: userId,
            updatedAt: sql`now()`,
          })
          .where(eq(formSections.id, conflict.existingId));
        updated += 1;
        continue;
      }

      await tx.insert(formSections).values({
        agencyId,
        name,
        description: s.description?.slice(0, 500) || null,
        category: s.category || null,
        tags: s.tags?.slice(0, 20) ?? [],
        fields,
        scope: "organization",
        status: "published",
        visibility: "organization",
        createdBy: userId,
        updatedBy: userId,
      });
      if (action === "duplicate" && conflict) duplicated += 1;
      else created += 1;
    }

    for (const a of pkg.assets) {
      if (!a.url?.trim()) {
        errors.push(`Asset “${a.name}” has no URL.`);
        continue;
      }
      const key = a.sourceId
        ? `asset:id:${a.sourceId}`
        : `asset:name:${a.name.toLowerCase()}`;
      const conflict = conflictByKey.get(key);
      const action = resolveImportAction(
        Boolean(conflict),
        Boolean(conflict?.fingerprintMatch),
        effectiveStrategy,
      );
      if (action === "skip") {
        skipped += 1;
        continue;
      }
      const nameBase = a.name.trim().slice(0, 100) || "Imported asset";
      const name =
        action === "duplicate" && conflict
          ? `${nameBase} (import)`.slice(0, 120)
          : nameBase;

      if (action === "overwrite" && conflict) {
        await tx
          .update(formAssets)
          .set({
            name,
            description: a.description?.slice(0, 500) || null,
            url: a.url.slice(0, 2000),
            kind: a.kindType ?? "other",
            mimeType: a.mimeType || null,
            folder: a.folder || null,
            tags: a.tags?.slice(0, 20) ?? [],
            updatedBy: userId,
            updatedAt: sql`now()`,
          })
          .where(eq(formAssets.id, conflict.existingId));
        updated += 1;
        continue;
      }

      await tx.insert(formAssets).values({
        agencyId,
        name,
        description: a.description?.slice(0, 500) || null,
        url: a.url.slice(0, 2000),
        kind: a.kindType ?? "other",
        mimeType: a.mimeType || null,
        folder: a.folder || null,
        tags: a.tags?.slice(0, 20) ?? [],
        scope: "organization",
        visibility: "organization",
        createdBy: userId,
        updatedBy: userId,
      });
      if (action === "duplicate" && conflict) duplicated += 1;
      else created += 1;
    }
  });

  return {
    ok: true,
    created,
    updated,
    skipped,
    duplicated,
    plan,
    errors,
  };
}

export function fingerprintsForPackage(pkg: LibraryPackage) {
  return {
    templates: pkg.templates.map((t) => ({
      name: t.name,
      fp: fingerprintTemplate(t),
    })),
    components: pkg.components.map((t) => ({
      name: t.name,
      fp: fingerprintFieldsPiece(t),
    })),
    sections: pkg.sections.map((t) => ({
      name: t.name,
      fp: fingerprintFieldsPiece(t),
    })),
    assets: pkg.assets.map((t) => ({
      name: t.name,
      fp: fingerprintAsset(t),
    })),
  };
}
