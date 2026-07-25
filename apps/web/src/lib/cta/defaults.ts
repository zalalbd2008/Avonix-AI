import type { CtaGroupSettings, CtaPageTarget } from "@/lib/db/schema";

export function defaultGroupSettings(): CtaGroupSettings {
  return {
    placement: {
      mobile: "footer_mobile",
      tablet: "footer_tablet",
      desktop: "floating",
    },
    pageTarget: { mode: "everywhere" },
    priority: "medium",
    frequency: "always",
    maxVisible: 0,
    collapseToFab: true,
    safeArea: true,
    hideOnKeyboard: true,
    styleTheme: "dock",
    exclusive: false,
  };
}

/** Merge stored jsonb group settings with defaults. */
export function mergeGroupSettings(raw?: unknown): CtaGroupSettings {
  const base = defaultGroupSettings();
  if (!raw || typeof raw !== "object") return base;
  const s = raw as Partial<CtaGroupSettings>;
  const pt = (s.pageTarget ?? {}) as Partial<CtaPageTarget>;
  return {
    ...base,
    ...s,
    placement: {
      ...base.placement,
      ...(s.placement ?? {}),
    },
    pageTarget: {
      mode: pt.mode ?? base.pageTarget.mode,
      rules: Array.isArray(pt.rules) ? pt.rules : [],
      surfaces: Array.isArray(pt.surfaces) ? pt.surfaces : [],
      excludePaths: Array.isArray(pt.excludePaths) ? pt.excludePaths : [],
    },
    // Legacy default was 4 and silently hid buttons — treat 4 as “no cap”
    // unless the user has explicitly saved a different positive limit.
    maxVisible:
      typeof s.maxVisible === "number"
        ? s.maxVisible === 4
          ? 0
          : s.maxVisible
        : base.maxVisible,
    exclusive: Boolean(s.exclusive),
  };
}

export const PAGE_SURFACES: {
  value: NonNullable<CtaPageTarget["surfaces"]>[number];
  label: string;
}[] = [
  { value: "homepage", label: "Homepage" },
  { value: "blog", label: "Blog index" },
  { value: "single_post", label: "Single post" },
  { value: "shop", label: "Shop" },
  { value: "product", label: "Product" },
  { value: "cart", label: "Cart" },
  { value: "checkout", label: "Checkout" },
  { value: "account", label: "Account" },
  { value: "404", label: "404" },
];

export const PATH_RULE_OPS: {
  value: NonNullable<CtaPageTarget["rules"]>[number]["op"];
  label: string;
}[] = [
  { value: "equals", label: "Equals" },
  { value: "starts_with", label: "Starts with" },
  { value: "ends_with", label: "Ends with" },
  { value: "contains", label: "Contains" },
  { value: "regex", label: "Regex" },
];

export function summarizePageTarget(target: CtaPageTarget): string {
  if (!target || target.mode === "everywhere") return "All pages";
  const parts: string[] = [];
  if (target.surfaces?.length) parts.push(target.surfaces.join(", "));
  if (target.rules?.length) {
    parts.push(target.rules.map((r) => `${r.op} “${r.value}”`).join(" · "));
  }
  const body = parts.length ? parts.join(" · ") : "no rules yet";
  return target.mode === "include"
    ? `Only: ${body}`
    : `Everywhere except: ${body}`;
}
