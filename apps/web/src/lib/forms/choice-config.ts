import type {
  FormChoiceConfig,
  FormChoiceLayout,
  FormChoiceStyle,
  FormField,
  FormFieldType,
  FormOptionItem,
  FormSelectVariant,
} from "@/lib/db/schema";

export const CHOICE_LAYOUTS: {
  id: FormChoiceLayout;
  label: string;
  hint: string;
  types: FormFieldType[];
}[] = [
  { id: "vertical", label: "Vertical", hint: "Stacked list", types: ["radio", "multiselect", "checkbox"] },
  { id: "horizontal", label: "Horizontal", hint: "Single row", types: ["radio", "multiselect", "checkbox"] },
  { id: "inline", label: "Inline", hint: "Compact row", types: ["radio", "multiselect"] },
  { id: "wrap", label: "Auto wrap", hint: "Flow to next line", types: ["radio", "multiselect", "checkbox"] },
  { id: "grid", label: "Grid", hint: "Equal columns", types: ["radio", "multiselect"] },
  { id: "masonry", label: "Masonry", hint: "Uneven tiles", types: ["radio", "multiselect"] },
];

export const CHOICE_STYLES: {
  id: FormChoiceStyle;
  label: string;
  hint: string;
  types: FormFieldType[];
}[] = [
  { id: "default", label: "Default", hint: "Native control + label", types: ["radio", "multiselect", "checkbox"] },
  { id: "button", label: "Button", hint: "Toggle buttons", types: ["radio", "multiselect"] },
  { id: "tile", label: "Tile", hint: "Filled tiles", types: ["radio", "multiselect"] },
  { id: "card", label: "Card", hint: "Bordered cards", types: ["radio", "multiselect"] },
  { id: "image", label: "Image", hint: "Image + title", types: ["radio", "multiselect"] },
  { id: "icon", label: "Icon", hint: "Emoji / icon + label", types: ["radio", "multiselect"] },
  { id: "pricing", label: "Pricing card", hint: "Price highlight", types: ["radio", "multiselect"] },
  { id: "service", label: "Service card", hint: "Title + description", types: ["radio", "multiselect"] },
  { id: "product", label: "Product card", hint: "Image + price", types: ["radio", "multiselect"] },
];

export const SELECT_VARIANTS: {
  id: FormSelectVariant;
  label: string;
  hint: string;
}[] = [
  { id: "standard", label: "Standard", hint: "Native dropdown" },
  { id: "searchable", label: "Searchable", hint: "Filter options" },
  { id: "chips", label: "Chips", hint: "Single-select chips" },
  { id: "tags", label: "Tag style", hint: "Pill tags" },
];

export const DEFAULT_CHOICE_CONFIG: Required<
  Pick<FormChoiceConfig, "layout" | "style" | "selectVariant" | "columns" | "gap">
> = {
  layout: "vertical",
  style: "default",
  selectVariant: "standard",
  columns: 2,
  gap: 8,
};

export function resolveChoiceConfig(
  type: FormFieldType,
  raw?: FormChoiceConfig | null,
): Required<typeof DEFAULT_CHOICE_CONFIG> {
  const layout = normalizeLayout(type, raw?.layout);
  const style = normalizeStyle(type, raw?.style);
  const selectVariant = normalizeSelectVariant(raw?.selectVariant);
  const columns = clampCols(raw?.columns);
  const gap = clampGap(raw?.gap);
  return { layout, style, selectVariant, columns, gap };
}

function normalizeLayout(
  type: FormFieldType,
  v?: FormChoiceLayout,
): FormChoiceLayout {
  const allowed = CHOICE_LAYOUTS.filter((l) => l.types.includes(type)).map(
    (l) => l.id,
  );
  if (v && (allowed.includes(v) || type === "select")) return v;
  if (type === "radio") return "vertical";
  return "vertical";
}

function normalizeStyle(
  type: FormFieldType,
  v?: FormChoiceStyle,
): FormChoiceStyle {
  const allowed = CHOICE_STYLES.filter((s) => s.types.includes(type)).map(
    (s) => s.id,
  );
  if (v && allowed.includes(v)) return v;
  return "default";
}

function normalizeSelectVariant(v?: FormSelectVariant): FormSelectVariant {
  if (v && SELECT_VARIANTS.some((s) => s.id === v)) return v;
  return "standard";
}

function clampCols(v?: number): 2 | 3 | 4 {
  if (v === 3 || v === 4) return v;
  return 2;
}

function clampGap(v?: number): number {
  if (typeof v !== "number" || Number.isNaN(v)) return 8;
  return Math.min(32, Math.max(4, Math.round(v)));
}

export function resolveOptionItems(field: FormField): FormOptionItem[] {
  if (field.optionItems?.length) {
    return field.optionItems
      .map(normalizeOptionItem)
      .filter((o): o is FormOptionItem => Boolean(o));
  }
  return (field.options ?? []).map((o) => ({
    value: o,
    label: o,
  }));
}

export function normalizeOptionItem(
  raw: Partial<FormOptionItem> | string | null | undefined,
): FormOptionItem | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const v = raw.trim();
    return v ? { value: v, label: v } : null;
  }
  const label = (raw.label ?? raw.value ?? "").trim();
  const value = (raw.value ?? label).trim();
  if (!value) return null;
  return {
    value: value.slice(0, 120),
    label: (label || value).slice(0, 120),
    ...(raw.description?.trim()
      ? { description: raw.description.trim().slice(0, 280) }
      : {}),
    ...(raw.imageUrl?.trim()
      ? { imageUrl: raw.imageUrl.trim().slice(0, 500) }
      : {}),
    ...(raw.icon?.trim() ? { icon: raw.icon.trim().slice(0, 40) } : {}),
    ...(raw.price?.trim() ? { price: raw.price.trim().slice(0, 40) } : {}),
    ...(typeof raw.score === "number" && !Number.isNaN(raw.score)
      ? { score: Math.min(10000, Math.max(-10000, Math.round(raw.score * 100) / 100)) }
      : {}),
    ...(typeof raw.amount === "number" && !Number.isNaN(raw.amount)
      ? { amount: Math.min(1_000_000, Math.max(0, Math.round(raw.amount * 100) / 100)) }
      : {}),
  };
}

/** Persist both rich items and flat options for older readers. */
export function syncFieldOptions(
  items: FormOptionItem[],
): Pick<FormField, "options" | "optionItems"> {
  const cleaned = items
    .map(normalizeOptionItem)
    .filter((o): o is FormOptionItem => Boolean(o))
    .slice(0, 40);
  return {
    optionItems: cleaned,
    options: cleaned.map((o) => o.value),
  };
}

export function choiceCssClass(
  type: FormFieldType,
  cfg: ReturnType<typeof resolveChoiceConfig>,
): string {
  const parts = ["avx-choices", `avx-choices--${cfg.layout}`, `avx-choices--${cfg.style}`];
  if (type === "select") {
    parts.push(`avx-choices--select-${cfg.selectVariant}`);
  }
  if (type === "multiselect") parts.push("avx-multiselect");
  return parts.join(" ");
}

export function usesRichChoiceMedia(
  style: FormChoiceStyle,
): boolean {
  return (
    style === "image" ||
    style === "icon" ||
    style === "card" ||
    style === "pricing" ||
    style === "service" ||
    style === "product"
  );
}

export function sampleImageChoiceItems(): FormOptionItem[] {
  return [
    {
      value: "branding",
      label: "Branding",
      description: "Logo, colors, guidelines",
      imageUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&q=80",
      icon: "✦",
      price: "",
    },
    {
      value: "website",
      label: "Website",
      description: "Marketing site or store",
      imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80",
      icon: "◈",
      price: "",
    },
    {
      value: "app",
      label: "Product",
      description: "App or SaaS UI",
      imageUrl: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&q=80",
      icon: "◆",
      price: "",
    },
  ];
}

export function sampleIconChoiceItems(): FormOptionItem[] {
  return [
    {
      value: "email",
      label: "Email",
      icon: "email",
      description: "Asynchronous",
    },
    {
      value: "phone",
      label: "Phone",
      icon: "phone",
      description: "Call me",
    },
    {
      value: "whatsapp",
      label: "WhatsApp",
      icon: "whatsapp",
      description: "Chat",
    },
    {
      value: "meet",
      label: "Video",
      icon: "video",
      description: "Meet / Zoom",
    },
  ];
}

export function sampleCardChoiceItems(): FormOptionItem[] {
  return [
    {
      value: "starter",
      label: "Starter",
      description: "Landing page + basic SEO",
      price: "$1.2k",
      icon: "1",
    },
    {
      value: "growth",
      label: "Growth",
      description: "Site + CRM + forms",
      price: "$3.5k",
      icon: "2",
    },
    {
      value: "scale",
      label: "Scale",
      description: "Full funnel + automation",
      price: "$7k+",
      icon: "3",
    },
  ];
}
