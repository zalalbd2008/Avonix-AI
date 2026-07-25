/**
 * ZIP encode/decode for org library packages (ADR-007 Step 6).
 */
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import {
  finalizeManifest,
  emptyLibraryPackage,
  parseLibraryPackageJson,
  type LibraryPackage,
  type PackagedAsset,
  type PackagedComponent,
  type PackagedSection,
  type PackagedTemplate,
  LIBRARY_PACKAGE_FORMAT,
  LIBRARY_PACKAGE_VERSION,
} from "./library-package";

function slug(name: string, fallback: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return s || fallback;
}

/** Build a .zip Uint8Array from a library package. */
export function zipLibraryPackage(pkg: LibraryPackage): Uint8Array {
  const ready = finalizeManifest(pkg);
  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(ready.manifest, null, 2)),
  };

  ready.templates.forEach((t, i) => {
    const path = `templates/${String(i + 1).padStart(3, "0")}-${slug(t.name, "template")}.json`;
    files[path] = strToU8(JSON.stringify({ ...t, kind: "template" }, null, 2));
  });
  ready.components.forEach((t, i) => {
    const path = `components/${String(i + 1).padStart(3, "0")}-${slug(t.name, "component")}.json`;
    files[path] = strToU8(JSON.stringify({ ...t, kind: "component" }, null, 2));
  });
  ready.sections.forEach((t, i) => {
    const path = `sections/${String(i + 1).padStart(3, "0")}-${slug(t.name, "section")}.json`;
    files[path] = strToU8(JSON.stringify({ ...t, kind: "section" }, null, 2));
  });
  ready.assets.forEach((t, i) => {
    const path = `assets/${String(i + 1).padStart(3, "0")}-${slug(t.name, "asset")}.json`;
    files[path] = strToU8(JSON.stringify({ ...t, kind: "asset" }, null, 2));
  });

  // Also include a flat package.json for tools that prefer a single file.
  files["package.json"] = strToU8(
    JSON.stringify(
      {
        format: LIBRARY_PACKAGE_FORMAT,
        version: LIBRARY_PACKAGE_VERSION,
        ...ready,
      },
      null,
      2,
    ),
  );

  return zipSync(files, { level: 6 });
}

/** Parse a .zip or JSON buffer into a library package. */
export function unzipLibraryPackage(
  bytes: Uint8Array,
): { ok: true; pkg: LibraryPackage } | { ok: false; error: string } {
  // Try JSON first (plain .json download / paste).
  try {
    const text = strFromU8(bytes);
    if (text.trimStart().startsWith("{")) {
      return parseLibraryPackageJson(JSON.parse(text));
    }
  } catch {
    // not JSON — try ZIP
  }

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    return { ok: false, error: "Could not read ZIP archive." };
  }

  const names = Object.keys(entries);
  if (names.includes("package.json")) {
    try {
      const raw = JSON.parse(strFromU8(entries["package.json"]!));
      return parseLibraryPackageJson(raw);
    } catch {
      return { ok: false, error: "package.json inside ZIP is invalid." };
    }
  }

  const pkg = emptyLibraryPackage();
  if (names.includes("manifest.json")) {
    try {
      const m = JSON.parse(strFromU8(entries["manifest.json"]!)) as Record<
        string,
        unknown
      >;
      if (m.format && m.format !== LIBRARY_PACKAGE_FORMAT) {
        return { ok: false, error: "ZIP manifest is not an Avonix library." };
      }
      pkg.manifest.exportedAt =
        typeof m.exportedAt === "string"
          ? m.exportedAt
          : pkg.manifest.exportedAt;
      pkg.manifest.agencyName =
        typeof m.agencyName === "string" ? m.agencyName : undefined;
    } catch {
      return { ok: false, error: "manifest.json is invalid." };
    }
  }

  for (const [path, data] of Object.entries(entries)) {
    if (!path.endsWith(".json")) continue;
    if (path === "manifest.json" || path === "package.json") continue;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(strFromU8(data)) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (path.startsWith("templates/") || parsed.kind === "template") {
      if (!Array.isArray(parsed.fields)) continue;
      pkg.templates.push(parsed as unknown as PackagedTemplate);
    } else if (path.startsWith("components/") || parsed.kind === "component") {
      if (!Array.isArray(parsed.fields)) continue;
      pkg.components.push(parsed as unknown as PackagedComponent);
    } else if (path.startsWith("sections/") || parsed.kind === "section") {
      if (!Array.isArray(parsed.fields)) continue;
      pkg.sections.push(parsed as unknown as PackagedSection);
    } else if (path.startsWith("assets/") || parsed.kind === "asset") {
      if (typeof parsed.url !== "string") continue;
      pkg.assets.push(parsed as unknown as PackagedAsset);
    }
  }

  if (
    pkg.templates.length +
      pkg.components.length +
      pkg.sections.length +
      pkg.assets.length ===
    0
  ) {
    return { ok: false, error: "ZIP has no templates, components, sections, or assets." };
  }

  return { ok: true, pkg: finalizeManifest(pkg) };
}

export function downloadBytes(filename: string, bytes: Uint8Array, mime: string) {
  const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], {
    type: mime,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
