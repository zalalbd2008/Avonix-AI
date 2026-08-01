/**
 * Shared page visibility for Live Chat / Languages / Accessibility.
 * Same shape as CTA / Popup pageTarget.
 */

export type WidgetPageSurface =
  | "homepage"
  | "blog"
  | "single_post"
  | "shop"
  | "product"
  | "cart"
  | "checkout"
  | "account"
  | "404";

export type WidgetPageRule = {
  op: "contains" | "equals" | "starts_with" | "ends_with" | "regex";
  value: string;
};

export type WidgetPageTarget = {
  mode: "everywhere" | "include" | "exclude";
  rules?: WidgetPageRule[];
  surfaces?: WidgetPageSurface[];
  /** Always hide when the path contains any of these fragments. */
  excludePaths?: string[];
};

export const DEFAULT_WIDGET_PAGE_TARGET: WidgetPageTarget = {
  mode: "everywhere",
  rules: [],
  surfaces: [],
  excludePaths: [],
};

export const WIDGET_PAGE_SURFACES: {
  value: WidgetPageSurface;
  label: string;
}[] = [
  { value: "homepage", label: "Homepage" },
  { value: "blog", label: "Blog index" },
  { value: "single_post", label: "Single post / page" },
  { value: "shop", label: "Shop" },
  { value: "product", label: "Product" },
  { value: "cart", label: "Cart" },
  { value: "checkout", label: "Checkout" },
  { value: "account", label: "Account" },
  { value: "404", label: "404" },
];

export function normalizeWidgetPageTarget(
  raw?: Partial<WidgetPageTarget> | null,
): WidgetPageTarget {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_WIDGET_PAGE_TARGET };
  }
  const mode =
    raw.mode === "include" || raw.mode === "exclude" || raw.mode === "everywhere"
      ? raw.mode
      : "everywhere";
  return {
    mode,
    rules: Array.isArray(raw.rules)
      ? raw.rules
          .filter((r) => r && typeof r.value === "string" && r.value.trim())
          .map((r) => ({
            op: r.op || "equals",
            value: String(r.value).trim(),
          }))
      : [],
    surfaces: Array.isArray(raw.surfaces)
      ? (raw.surfaces.filter(Boolean) as WidgetPageSurface[])
      : [],
    excludePaths: Array.isArray(raw.excludePaths)
      ? raw.excludePaths.map((p) => String(p).trim()).filter(Boolean)
      : [],
  };
}

/** Newline / comma list of paths or full URLs → path rules. */
export function pathsTextToRules(text: string): WidgetPageRule[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      let path = raw;
      try {
        if (/^https?:\/\//i.test(raw)) {
          path = new URL(raw).pathname || "/";
        }
      } catch {
        /* keep raw */
      }
      if (!path.startsWith("/")) path = `/${path}`;
      if (path.endsWith("/*") || path.endsWith("*")) {
        return {
          op: "starts_with" as const,
          value: path.replace(/\*+$/, "").replace(/\/$/, "") || "/",
        };
      }
      return { op: "equals" as const, value: path };
    });
}

export function rulesToPathsText(rules?: WidgetPageRule[]): string {
  if (!rules?.length) return "";
  return rules
    .map((r) =>
      r.op === "starts_with" ? `${r.value.replace(/\/$/, "")}/*` : r.value,
    )
    .join("\n");
}

/** Legacy newline excludePaths string → always-hide list. */
export function linesToExcludePaths(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 80);
}

export function excludePathsToText(paths?: string[]): string {
  return (paths ?? []).join("\n");
}
