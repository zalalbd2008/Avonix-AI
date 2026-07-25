/**
 * Google Fonts via CDN link only — never self-hosted font files.
 * Catalog: fonts.google.com/metadata (all open-source families).
 */
import catalog from "./google-fonts-catalog.json";
import type { WebsiteFontSettings } from "@/lib/db/schema/websites";

export type { WebsiteFontSettings };

export type GoogleFontCategory =
  | "Sans Serif"
  | "Serif"
  | "Display"
  | "Handwriting"
  | "Monospace"
  | string;

export type GoogleFontEntry = {
  family: string;
  category: GoogleFontCategory;
};

const DEFAULT_WEIGHTS = [400, 500, 600, 700] as const;

let cached: GoogleFontEntry[] | null = null;

export function listGoogleFonts(): GoogleFontEntry[] {
  if (cached) return cached;
  cached = (catalog.fonts as Array<{ f: string; c: string }>).map((row) => ({
    family: row.f,
    category: row.c,
  }));
  return cached;
}

export function googleFontsUpdatedAt(): string {
  return (catalog as { updatedAt?: string }).updatedAt ?? "";
}

export function searchGoogleFonts(
  query: string,
  limit = 40,
): GoogleFontEntry[] {
  const q = query.trim().toLowerCase();
  const all = listGoogleFonts();
  if (!q) {
    return all.slice(0, limit);
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  const starts: GoogleFontEntry[] = [];
  const contains: GoogleFontEntry[] = [];

  for (const font of all) {
    const name = font.family.toLowerCase();
    const allTokensMatch = tokens.every((t) => name.includes(t));
    if (!allTokensMatch) continue;
    if (name.startsWith(q) || name.startsWith(tokens[0]!)) starts.push(font);
    else contains.push(font);
  }

  return [...starts, ...contains].slice(0, limit);
}

export function isGoogleFontFamily(family: string | undefined | null): boolean {
  if (!family || family === "system") return false;
  const needle = family.trim().toLowerCase();
  return listGoogleFonts().some((f) => f.family.toLowerCase() === needle);
}

/** CSS font-family stack for a Google family (or system). */
export function googleFontStack(family: string | undefined | null): string {
  if (!family || family === "system") {
    return "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  }
  const safe = family.replace(/['"]/g, "").trim();
  return `'${safe}', system-ui, sans-serif`;
}

/**
 * Normalize a stored CSS font-family value (or bare Google family name)
 * into a picker token: "system" | "Inter" | …
 */
export function parseStoredFontFamily(
  value: string | undefined | null,
): string {
  if (!value) return "system";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "system") return "system";

  const first = (
    trimmed.match(/^['"]([^'"]+)['"]/)?.[1] ||
    trimmed.split(",")[0] ||
    ""
  )
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (!first) return "system";

  const systemTokens = new Set([
    "system-ui",
    "ui-sans-serif",
    "ui-monospace",
    "-apple-system",
    "segoe ui",
    "sfmono-regular",
    "menlo",
    "monospace",
    "sans-serif",
    "serif",
  ]);
  if (systemTokens.has(first.toLowerCase())) return "system";

  // Legacy web-safe stacks from FONT_OPTIONS (not Google CDN)
  if (first === "Georgia" || first === "Times New Roman") return "system";

  // Default form theme stack starts with system-ui
  if (/^system-ui\b/i.test(trimmed)) return "system";

  return first;
}

/**
 * Build fonts.googleapis.com/css2 URL — CDN stylesheet, not hosted files.
 * @example https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap
 */
export function googleFontsCssUrl(
  families: Array<string | undefined | null>,
  weights: number[] = [...DEFAULT_WEIGHTS],
): string | null {
  const unique = [
    ...new Set(
      families
        .map((f) => parseStoredFontFamily(f))
        .filter((f) => f && f !== "system"),
    ),
  ];
  if (unique.length === 0) return null;

  const wght = [...new Set(weights.filter((w) => w >= 100 && w <= 900))]
    .sort((a, b) => a - b)
    .join(";");

  const params = unique
    .map((family) => {
      const encoded = encodeURIComponent(family).replace(/%20/g, "+");
      return wght ? `family=${encoded}:wght@${wght}` : `family=${encoded}`;
    })
    .join("&");

  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/** Collect distinct Google CDN URLs for website + popup + form fonts. */
export function collectGoogleFontUrls(input: {
  website?: WebsiteFontSettings | null;
  popups?: Array<{
    design?: { googleFont?: string; headingFont?: string };
    content?: {
      headlineStyle?: { fontFamily?: string };
      descriptionStyle?: { fontFamily?: string };
    };
  }>;
  /** Extra family names / CSS stacks (e.g. Form Builder themes). */
  extraFamilies?: Array<string | undefined | null>;
}): string[] {
  const families: string[] = [];
  const weights = input.website?.weights?.length
    ? input.website.weights
    : [...DEFAULT_WEIGHTS];

  if (input.website?.primaryFamily) families.push(input.website.primaryFamily);
  if (input.website?.headingFamily) families.push(input.website.headingFamily);

  for (const pop of input.popups ?? []) {
    if (pop.design?.googleFont) families.push(pop.design.googleFont);
    if (pop.design?.headingFont) families.push(pop.design.headingFont);
    if (pop.content?.headlineStyle?.fontFamily) {
      families.push(pop.content.headlineStyle.fontFamily);
    }
    if (pop.content?.descriptionStyle?.fontFamily) {
      families.push(pop.content.descriptionStyle.fontFamily);
    }
  }

  for (const f of input.extraFamilies ?? []) {
    if (f) families.push(f);
  }

  const url = googleFontsCssUrl(families, weights);
  return url ? [url] : [];
}
