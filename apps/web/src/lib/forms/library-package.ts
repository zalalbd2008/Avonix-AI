/**
 * Avonix org library package format (ADR-007 Step 6).
 * Browser-safe types — ZIP bytes live in library-zip.ts.
 */
import type {
  FormAssetKind,
  FormField,
  FormLibraryScope,
  FormLibraryStatus,
  FormLibraryVisibility,
  FormSettings,
  FormTemplateCategory,
  FormTemplateScope,
  FormTemplateStatus,
  FormTemplateVisibility,
} from "@/lib/db/schema";

export const LIBRARY_PACKAGE_FORMAT = "avonix-org-library" as const;
export const LIBRARY_PACKAGE_VERSION = 1 as const;

export type LibraryPackageManifest = {
  format: typeof LIBRARY_PACKAGE_FORMAT;
  version: typeof LIBRARY_PACKAGE_VERSION;
  exportedAt: string;
  agencyName?: string;
  counts: {
    templates: number;
    components: number;
    sections: number;
    assets: number;
  };
};

export type PackagedTemplate = {
  kind: "template";
  /** Original id for conflict / sync matching. */
  sourceId?: string;
  name: string;
  description?: string | null;
  category?: FormTemplateCategory | string | null;
  tags?: string[];
  fields: FormField[];
  settings: FormSettings;
  submitLabel?: string;
  successMessage?: string;
  scope?: FormTemplateScope;
  status?: FormTemplateStatus;
  visibility?: FormTemplateVisibility;
  version?: number;
};

export type PackagedComponent = {
  kind: "component";
  sourceId?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  tags?: string[];
  fields: FormField[];
  scope?: FormLibraryScope;
  status?: FormLibraryStatus;
  visibility?: FormLibraryVisibility;
};

export type PackagedSection = {
  kind: "section";
  sourceId?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  tags?: string[];
  fields: FormField[];
  scope?: FormLibraryScope;
  status?: FormLibraryStatus;
  visibility?: FormLibraryVisibility;
};

export type PackagedAsset = {
  kind: "asset";
  sourceId?: string;
  name: string;
  description?: string | null;
  url: string;
  kindType?: FormAssetKind;
  mimeType?: string | null;
  folder?: string | null;
  tags?: string[];
  scope?: FormLibraryScope;
  visibility?: FormLibraryVisibility;
};

export type LibraryPackage = {
  manifest: LibraryPackageManifest;
  templates: PackagedTemplate[];
  components: PackagedComponent[];
  sections: PackagedSection[];
  assets: PackagedAsset[];
};

export type LibraryImportStrategy = "skip" | "duplicate" | "overwrite";

export type LibraryConflict = {
  kind: "template" | "component" | "section" | "asset";
  incomingName: string;
  incomingSourceId?: string;
  existingId: string;
  existingName: string;
  reason: "source_id" | "name";
  fingerprintMatch: boolean;
};

export function emptyLibraryPackage(
  agencyName?: string,
): LibraryPackage {
  return {
    manifest: {
      format: LIBRARY_PACKAGE_FORMAT,
      version: LIBRARY_PACKAGE_VERSION,
      exportedAt: new Date().toISOString(),
      agencyName,
      counts: {
        templates: 0,
        components: 0,
        sections: 0,
        assets: 0,
      },
    },
    templates: [],
    components: [],
    sections: [],
    assets: [],
  };
}

export function finalizeManifest(pkg: LibraryPackage): LibraryPackage {
  return {
    ...pkg,
    manifest: {
      ...pkg.manifest,
      format: LIBRARY_PACKAGE_FORMAT,
      version: LIBRARY_PACKAGE_VERSION,
      exportedAt: pkg.manifest.exportedAt || new Date().toISOString(),
      counts: {
        templates: pkg.templates.length,
        components: pkg.components.length,
        sections: pkg.sections.length,
        assets: pkg.assets.length,
      },
    },
  };
}

/** Stable content fingerprint for conflict / sync detection. */
export function fingerprintPayload(parts: unknown[]): string {
  const raw = JSON.stringify(parts);
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function fingerprintTemplate(t: {
  name: string;
  fields: FormField[];
  settings: FormSettings;
  submitLabel?: string | null;
  successMessage?: string | null;
}): string {
  return fingerprintPayload([
    t.name,
    t.fields,
    t.settings,
    t.submitLabel ?? "",
    t.successMessage ?? "",
  ]);
}

export function fingerprintFieldsPiece(t: {
  name: string;
  fields: FormField[];
}): string {
  return fingerprintPayload([t.name, t.fields]);
}

export function fingerprintAsset(t: {
  name: string;
  url: string;
}): string {
  return fingerprintPayload([t.name, t.url]);
}

export function parseLibraryPackageJson(
  raw: unknown,
): { ok: true; pkg: LibraryPackage } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Invalid package JSON." };
  }
  const o = raw as Record<string, unknown>;

  // Flat package shape
  if (o.format === LIBRARY_PACKAGE_FORMAT || o.manifest) {
    const manifest = (o.manifest ?? o) as Record<string, unknown>;
    if (
      manifest.format !== LIBRARY_PACKAGE_FORMAT &&
      o.format !== LIBRARY_PACKAGE_FORMAT
    ) {
      return { ok: false, error: "Not an Avonix org library package." };
    }
    const templates = Array.isArray(o.templates) ? o.templates : [];
    const components = Array.isArray(o.components) ? o.components : [];
    const sections = Array.isArray(o.sections) ? o.sections : [];
    const assets = Array.isArray(o.assets) ? o.assets : [];
    return {
      ok: true,
      pkg: finalizeManifest({
        manifest: {
          format: LIBRARY_PACKAGE_FORMAT,
          version: LIBRARY_PACKAGE_VERSION,
          exportedAt:
            typeof manifest.exportedAt === "string"
              ? manifest.exportedAt
              : new Date().toISOString(),
          agencyName:
            typeof manifest.agencyName === "string"
              ? manifest.agencyName
              : undefined,
          counts: {
            templates: templates.length,
            components: components.length,
            sections: sections.length,
            assets: assets.length,
          },
        },
        templates: templates as PackagedTemplate[],
        components: components as PackagedComponent[],
        sections: sections as PackagedSection[],
        assets: assets as PackagedAsset[],
      }),
    };
  }

  // Single-form enterprise bundle → one template
  if (Array.isArray(o.fields) && o.settings && typeof o.settings === "object") {
    const name =
      typeof o.name === "string" && o.name.trim() ? o.name.trim() : "Imported form";
    const tpl: PackagedTemplate = {
      kind: "template",
      name: name.slice(0, 120),
      fields: o.fields as FormField[],
      settings: o.settings as FormSettings,
      submitLabel: typeof o.submitLabel === "string" ? o.submitLabel : undefined,
      successMessage:
        typeof o.successMessage === "string" ? o.successMessage : undefined,
      status: "draft",
      scope: "organization",
      visibility: "organization",
    };
    return {
      ok: true,
      pkg: finalizeManifest({
        ...emptyLibraryPackage(),
        templates: [tpl],
      }),
    };
  }

  return {
    ok: false,
    error: "Unrecognized package. Use an Avonix library ZIP/JSON export.",
  };
}
