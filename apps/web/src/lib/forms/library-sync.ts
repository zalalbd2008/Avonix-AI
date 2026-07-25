/**
 * Sync helpers for org library packages (ADR-007 Step 6).
 *
 * Auto-sync cron is not shipped — these helpers power manual sync, conflict
 * detection, and merge planning for import / restore flows.
 */
import {
  fingerprintAsset,
  fingerprintFieldsPiece,
  fingerprintTemplate,
  type LibraryConflict,
  type LibraryImportStrategy,
  type LibraryPackage,
  type PackagedAsset,
  type PackagedComponent,
  type PackagedSection,
  type PackagedTemplate,
} from "./library-package";

export type SyncCatalogItem = {
  id: string;
  kind: "template" | "component" | "section" | "asset";
  name: string;
  sourceId?: string | null;
  fingerprint: string;
  updatedAt?: string;
};

export type SyncPlan = {
  toCreate: Array<{
    kind: SyncCatalogItem["kind"];
    name: string;
    sourceId?: string;
  }>;
  toUpdate: LibraryConflict[];
  unchanged: LibraryConflict[];
  strategyDefault: LibraryImportStrategy;
};

export function catalogFromPackage(pkg: LibraryPackage): SyncCatalogItem[] {
  const items: SyncCatalogItem[] = [];
  for (const t of pkg.templates) {
    items.push({
      id: t.sourceId ?? `tmp:${t.name}`,
      kind: "template",
      name: t.name,
      sourceId: t.sourceId,
      fingerprint: fingerprintTemplate(t),
    });
  }
  for (const t of pkg.components) {
    items.push({
      id: t.sourceId ?? `cmp:${t.name}`,
      kind: "component",
      name: t.name,
      sourceId: t.sourceId,
      fingerprint: fingerprintFieldsPiece(t),
    });
  }
  for (const t of pkg.sections) {
    items.push({
      id: t.sourceId ?? `sec:${t.name}`,
      kind: "section",
      name: t.name,
      sourceId: t.sourceId,
      fingerprint: fingerprintFieldsPiece(t),
    });
  }
  for (const t of pkg.assets) {
    items.push({
      id: t.sourceId ?? `ast:${t.name}`,
      kind: "asset",
      name: t.name,
      sourceId: t.sourceId,
      fingerprint: fingerprintAsset(t),
    });
  }
  return items;
}

/**
 * Compare an incoming package against the current org catalog.
 */
export function planLibrarySync(
  incoming: LibraryPackage,
  existing: SyncCatalogItem[],
  strategyDefault: LibraryImportStrategy = "duplicate",
): SyncPlan {
  const bySource = new Map<string, SyncCatalogItem>();
  const byKindName = new Map<string, SyncCatalogItem>();
  for (const e of existing) {
    if (e.sourceId) bySource.set(`${e.kind}:${e.sourceId}`, e);
    byKindName.set(`${e.kind}:${e.name.toLowerCase()}`, e);
  }

  const toCreate: SyncPlan["toCreate"] = [];
  const toUpdate: LibraryConflict[] = [];
  const unchanged: LibraryConflict[] = [];

  function matchIncoming(
    kind: SyncCatalogItem["kind"],
    name: string,
    sourceId: string | undefined,
    fingerprint: string,
  ) {
    const viaSource = sourceId
      ? bySource.get(`${kind}:${sourceId}`)
      : undefined;
    const viaName = byKindName.get(`${kind}:${name.toLowerCase()}`);
    const hit = viaSource ?? viaName;
    if (!hit) {
      toCreate.push({ kind, name, sourceId });
      return;
    }
    const conflict: LibraryConflict = {
      kind,
      incomingName: name,
      incomingSourceId: sourceId,
      existingId: hit.id,
      existingName: hit.name,
      reason: viaSource ? "source_id" : "name",
      fingerprintMatch: hit.fingerprint === fingerprint,
    };
    if (conflict.fingerprintMatch) unchanged.push(conflict);
    else toUpdate.push(conflict);
  }

  for (const t of incoming.templates) {
    matchIncoming(
      "template",
      t.name,
      t.sourceId,
      fingerprintTemplate(t),
    );
  }
  for (const t of incoming.components) {
    matchIncoming(
      "component",
      t.name,
      t.sourceId,
      fingerprintFieldsPiece(t),
    );
  }
  for (const t of incoming.sections) {
    matchIncoming("section", t.name, t.sourceId, fingerprintFieldsPiece(t));
  }
  for (const t of incoming.assets) {
    matchIncoming("asset", t.name, t.sourceId, fingerprintAsset(t));
  }

  return { toCreate, toUpdate, unchanged, strategyDefault };
}

export function summarizeSyncPlan(plan: SyncPlan): string {
  return [
    `${plan.toCreate.length} new`,
    `${plan.toUpdate.length} changed`,
    `${plan.unchanged.length} identical`,
  ].join(" · ");
}

/** Decide per-item action given a global strategy. */
export function resolveImportAction(
  hasConflict: boolean,
  fingerprintMatch: boolean,
  strategy: LibraryImportStrategy,
): "create" | "skip" | "overwrite" | "duplicate" {
  if (!hasConflict) return "create";
  if (fingerprintMatch) return "skip";
  if (strategy === "skip") return "skip";
  if (strategy === "overwrite") return "overwrite";
  return "duplicate";
}

export type MergePiece =
  | PackagedTemplate
  | PackagedComponent
  | PackagedSection
  | PackagedAsset;
