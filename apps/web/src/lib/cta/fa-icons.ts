/**
 * Font Awesome 6 Free catalog (solid + regular + brands).
 * Generated from official metadata/icons.json — see scripts/generate-fa-catalog.mjs
 */
import catalog from "./data/fa-catalog.json";

export type FaStyle = "solid" | "regular" | "brands";

export type FaIconEntry = {
  /** FA icon name without `fa-` prefix, e.g. phone */
  name: string;
  label: string;
  style: FaStyle;
  tags?: string[];
};

/** Full Font Awesome 6.5.2 Free catalog (~2045 entries). */
export const FA_ICON_CATALOG = catalog as FaIconEntry[];

export function faPrefix(style: FaStyle): string {
  if (style === "brands") return "fa-brands";
  if (style === "regular") return "fa-regular";
  return "fa-solid";
}

export function faClassName(name: string, style: FaStyle = "solid"): string {
  const slug = name.trim().replace(/^fa-/, "");
  if (!slug || slug === "none") return "";
  return `${faPrefix(style)} fa-${slug}`;
}

export function searchFaIcons(
  query: string,
  limit = 80,
  styleFilter?: FaStyle | "all",
): FaIconEntry[] {
  const q = query.trim().toLowerCase();
  const pool =
    styleFilter && styleFilter !== "all"
      ? FA_ICON_CATALOG.filter((i) => i.style === styleFilter)
      : FA_ICON_CATALOG;

  if (!q) return pool.slice(0, limit);

  const starts: FaIconEntry[] = [];
  const includes: FaIconEntry[] = [];

  for (const i of pool) {
    const name = i.name.toLowerCase();
    const label = i.label.toLowerCase();
    const tags = (i.tags ?? []).join(" ").toLowerCase();
    if (name === q || name.startsWith(q)) {
      starts.push(i);
    } else if (
      name.includes(q) ||
      label.includes(q) ||
      tags.includes(q)
    ) {
      includes.push(i);
    }
  }

  return [...starts, ...includes].slice(0, limit);
}

export function resolveFaStyleForName(
  name: string,
  preferred: FaStyle = "solid",
): FaStyle {
  const hits = FA_ICON_CATALOG.filter((i) => i.name === name);
  if (!hits.length) return preferred;
  if (hits.some((h) => h.style === preferred)) return preferred;
  if (hits.some((h) => h.style === "solid")) return "solid";
  return hits[0]!.style;
}

export const FA_CATALOG_COUNT = FA_ICON_CATALOG.length;
