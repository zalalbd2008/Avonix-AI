/**
 * 12-column field width system for the form builder.
 * Legacy `"full"` / `"half"` map to 12 / 6.
 */

export type ColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type FieldWidthValue = "full" | "half" | "third" | "fourth" | "fifth" | "sixth" | ColSpan;

export type FieldWidthBreakpoint = "desktop" | "tablet" | "mobile";

export const CANVAS_BREAKPOINTS: {
  id: FieldWidthBreakpoint;
  label: string;
  hint: string;
  /** Approximate canvas frame width while editing. */
  frameMax: string;
}[] = [
  { id: "desktop", label: "Desktop", hint: "Default width", frameMax: "100%" },
  { id: "tablet", label: "Tablet", hint: "≤960px", frameMax: "768px" },
  { id: "mobile", label: "Mobile", hint: "≤640px", frameMax: "390px" },
];

/** Named presets shown in the builder. */
export const WIDTH_PRESETS: {
  id: FieldWidthValue;
  label: string;
  hint: string;
  span: ColSpan;
}[] = [
  { id: "full", label: "Full", hint: "100%", span: 12 },
  { id: "half", label: "Half", hint: "50%", span: 6 },
  { id: "third", label: "⅓", hint: "33%", span: 4 },
  { id: "fourth", label: "¼", hint: "25%", span: 3 },
  { id: "fifth", label: "⅕", hint: "~20%", span: 2 },
  { id: "sixth", label: "⅙", hint: "~17%", span: 2 },
];

/** Custom % chips → nearest 12-col span. */
export const WIDTH_PERCENT_OPTIONS: { pct: number; span: ColSpan }[] = [
  { pct: 10, span: 1 },
  { pct: 20, span: 2 },
  { pct: 25, span: 3 },
  { pct: 30, span: 4 },
  { pct: 33, span: 4 },
  { pct: 40, span: 5 },
  { pct: 50, span: 6 },
  { pct: 60, span: 7 },
  { pct: 66, span: 8 },
  { pct: 70, span: 8 },
  { pct: 75, span: 9 },
  { pct: 80, span: 10 },
  { pct: 90, span: 11 },
  { pct: 100, span: 12 },
];

const NAMED: Record<string, ColSpan> = {
  full: 12,
  half: 6,
  third: 4,
  fourth: 3,
  fifth: 2,
  sixth: 2,
};

export function isColSpan(v: unknown): v is ColSpan {
  return (
    typeof v === "number" &&
    Number.isInteger(v) &&
    v >= 1 &&
    v <= 12
  );
}

/** Resolve any stored width value to a 1–12 column span. */
export function toColSpan(width?: FieldWidthValue | null): ColSpan {
  if (width == null) return 12;
  if (typeof width === "number" && isColSpan(width)) return width;
  if (typeof width === "string" && width in NAMED) return NAMED[width]!;
  // Numeric string from older JSON
  const n = Number(width);
  if (isColSpan(n)) return n;
  return 12;
}

/** Normalize inbound width for persistence (prefer named when it matches). */
export function normalizeFieldWidth(
  raw?: FieldWidthValue | string | number | null,
): FieldWidthValue {
  if (raw === "full" || raw === "half" || raw === "third" || raw === "fourth" || raw === "fifth" || raw === "sixth") {
    return raw;
  }
  const span = toColSpan(raw as FieldWidthValue);
  const named = WIDTH_PRESETS.find((p) => p.span === span && p.id !== "fifth");
  // Prefer half/full/third/fourth/sixth labels when exact; else store span number.
  if (span === 12) return "full";
  if (span === 6) return "half";
  if (span === 4) return "third";
  if (span === 3) return "fourth";
  if (span === 2) return "sixth";
  return span;
}

export function spanLabel(span: ColSpan): string {
  const pct = Math.round((span / 12) * 100);
  return `${span}/12 · ${pct}%`;
}

/** Clamp + round a continuous column count to 1–12. */
export function snapColSpan(raw: number): ColSpan {
  const n = Math.round(raw);
  if (n <= 1) return 1;
  if (n >= 12) return 12;
  return n as ColSpan;
}

/**
 * Snap a pixel width to the 12-col grid given the grid track width.
 * `startX` = field left edge, `pointerX` = drag x, `trackWidth` ≈ one column.
 */
export function snapSpanFromPointer(opts: {
  startX: number;
  pointerX: number;
  trackWidth: number;
  min?: ColSpan;
  max?: ColSpan;
}): ColSpan {
  const track = Math.max(opts.trackWidth, 1);
  const span = snapColSpan((opts.pointerX - opts.startX) / track);
  const min = opts.min ?? 1;
  const max = opts.max ?? 12;
  return Math.min(max, Math.max(min, span)) as ColSpan;
}

/** Prefer named width tokens when the span matches a preset. */
export function widthFromSpan(span: ColSpan): FieldWidthValue {
  return normalizeFieldWidth(span);
}

/**
 * Spans of other fields that make useful alignment guides while resizing.
 * Prefer common splits (6, 4, 3) plus live neighbor spans.
 */
export function alignmentGuideSpans(
  neighborSpans: ColSpan[],
  activeSpan: ColSpan,
): ColSpan[] {
  const set = new Set<ColSpan>([3, 4, 6, 8, 9, 12, activeSpan, ...neighborSpans]);
  return [...set].sort((a, b) => a - b);
}

export function widthEquals(a: FieldWidthValue | undefined, span: ColSpan): boolean {
  return toColSpan(a) === span;
}

/** Effective column span for a breakpoint (with tablet/mobile fallbacks). */
export function spanForBreakpoint(
  field: {
    type: string;
    width?: FieldWidthValue | null;
    widthTablet?: FieldWidthValue | null;
    widthMobile?: FieldWidthValue | null;
  },
  bp: FieldWidthBreakpoint,
): ColSpan {
  if (forcesFullWidth(field.type)) return 12;
  const desk = toColSpan(field.width);
  if (bp === "desktop") return desk;
  if (bp === "tablet") {
    return field.widthTablet != null ? toColSpan(field.widthTablet) : desk;
  }
  return field.widthMobile != null ? toColSpan(field.widthMobile) : 12;
}

/** Whether this breakpoint has an explicit override (not inherited). */
export function hasBreakpointOverride(
  field: {
    widthTablet?: FieldWidthValue | null;
    widthMobile?: FieldWidthValue | null;
  },
  bp: FieldWidthBreakpoint,
): boolean {
  if (bp === "tablet") return field.widthTablet != null;
  if (bp === "mobile") return field.widthMobile != null;
  return true;
}

/** Patch object to set width for the active canvas breakpoint. */
export function widthPatchForBreakpoint(
  bp: FieldWidthBreakpoint,
  span: ColSpan,
): { width: FieldWidthValue } | { widthTablet: FieldWidthValue } | { widthMobile: FieldWidthValue } {
  const value = widthFromSpan(span);
  if (bp === "tablet") return { widthTablet: value };
  if (bp === "mobile") return { widthMobile: value };
  return { width: value };
}

/**
 * Types that always force full width (cannot sit half beside another field).
 */
export function forcesFullWidth(type: string): boolean {
  return (
    type === "textarea" ||
    type === "section" ||
    type === "checkbox" ||
    type === "multiselect" ||
    type === "radio" ||
    type === "file" ||
    type === "appointment" ||
    type === "signature" ||
    type === "rating" ||
    type === "recaptcha" ||
    type === "range" ||
    type === "toggle"
  );
}

/** CSS class + data attrs for embed / preview. */
export function fieldWidthAttrs(opts: {
  width?: FieldWidthValue;
  widthTablet?: FieldWidthValue;
  widthMobile?: FieldWidthValue;
  forceFull?: boolean;
}): { className: string; style: string; data: string } {
  const desk = opts.forceFull ? 12 : toColSpan(opts.width);
  const tab = opts.forceFull
    ? 12
    : opts.widthTablet != null
      ? toColSpan(opts.widthTablet)
      : desk;
  const mob = opts.forceFull
    ? 12
    : opts.widthMobile != null
      ? toColSpan(opts.widthMobile)
      : 12;

  const className = desk === 12 ? "avx-col avx-full" : "avx-col";
  const style = `--avx-span:${desk};--avx-span-md:${tab};--avx-span-sm:${mob}`;
  const data = `data-span="${desk}" data-span-md="${tab}" data-span-sm="${mob}"`;
  return { className, style, data };
}
