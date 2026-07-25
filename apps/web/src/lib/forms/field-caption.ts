import type {
  FormDescriptionPosition,
  FormField,
  FormFieldAlign,
  FormFieldCaption,
  FormLabelPosition,
  FormPlaceholderMode,
} from "@/lib/db/schema";
import type { FormTheme } from "./theme";

export const LABEL_POSITIONS: {
  id: FormLabelPosition;
  label: string;
  hint: string;
}[] = [
  { id: "inherit", label: "Theme default", hint: "Use appearance settings" },
  { id: "top", label: "Top", hint: "Stacked above control" },
  { id: "left", label: "Left", hint: "Label beside control" },
  { id: "right", label: "Right", hint: "Label after control" },
  { id: "hidden", label: "Hidden", hint: "Accessible name only" },
  { id: "floating", label: "Floating", hint: "On the input border" },
];

export const DESCRIPTION_POSITIONS: {
  id: FormDescriptionPosition;
  label: string;
  hint: string;
}[] = [
  { id: "below", label: "Below", hint: "Under the control" },
  { id: "above", label: "Above", hint: "Between label and control" },
  { id: "tooltip", label: "Tooltip", hint: "Native hover title" },
  { id: "info", label: "Info icon", hint: "ⓘ beside the label" },
  { id: "accordion", label: "Accordion", hint: "Expandable help" },
];

export const PLACEHOLDER_MODES: {
  id: FormPlaceholderMode;
  label: string;
  hint: string;
}[] = [
  { id: "inherit", label: "Theme default", hint: "Use appearance settings" },
  { id: "enabled", label: "Enabled", hint: "Show placeholder text" },
  { id: "disabled", label: "Disabled", hint: "No placeholder" },
  { id: "animated", label: "Animated", hint: "Placeholder floats to border" },
  { id: "floating", label: "Floating", hint: "Force floating label mode" },
];

export const FIELD_ALIGNS: {
  id: FormFieldAlign;
  label: string;
}[] = [
  { id: "stretch", label: "Stretch" },
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
];

export type ResolvedCaption = {
  labelPosition: Exclude<FormLabelPosition, "inherit">;
  descriptionPosition: FormDescriptionPosition;
  placeholderMode: Exclude<FormPlaceholderMode, "inherit">;
  align: FormFieldAlign;
  sticky: boolean;
  description: string;
  showStackedLabel: boolean;
  useFloating: boolean;
  animateFloat: boolean;
  placeholderAttr: string | undefined;
};

/** Map theme label style → concrete position. */
export function themeLabelPosition(
  theme: Pick<FormTheme, "labels">,
): Exclude<FormLabelPosition, "inherit"> {
  if (!theme.labels.show) return "hidden";
  const s = theme.labels.style ?? "stacked";
  if (s === "floating") return "floating";
  if (s === "left" || s === "right" || s === "hidden") return s;
  return "top";
}

export function themePlaceholderMode(
  theme: Pick<FormTheme, "placeholder">,
): Exclude<FormPlaceholderMode, "inherit"> {
  const m = theme.placeholder.mode ?? "enabled";
  if (m === "disabled" || m === "animated" || m === "floating") return m;
  return "enabled";
}

export function resolveCaption(
  field: FormField,
  theme: Pick<FormTheme, "labels" | "placeholder">,
): ResolvedCaption {
  const raw = field.caption ?? {};
  const labelPosition =
    raw.labelPosition && raw.labelPosition !== "inherit"
      ? raw.labelPosition
      : themeLabelPosition(theme);
  const placeholderMode =
    raw.placeholderMode && raw.placeholderMode !== "inherit"
      ? raw.placeholderMode
      : themePlaceholderMode(theme);

  let resolvedLabel = labelPosition;
  if (placeholderMode === "floating") resolvedLabel = "floating";
  if (placeholderMode === "animated" && resolvedLabel === "top") {
    // animated placeholder floats when label is stacked-empty or floating
    if (!(field.label?.trim())) resolvedLabel = "floating";
  }

  const useFloating = resolvedLabel === "floating";
  const animateFloat =
    useFloating &&
    (placeholderMode === "animated" ||
      (!(field.label?.trim()) && Boolean(field.placeholder?.trim())));

  const description = (field.description ?? "").trim().slice(0, 500);
  const descriptionPosition = normalizeDesc(raw.descriptionPosition);
  const align = normalizeAlign(raw.align);
  const sticky = Boolean(raw.sticky);

  const showStackedLabel =
    resolvedLabel === "top" ||
    resolvedLabel === "left" ||
    resolvedLabel === "right";

  let placeholderAttr: string | undefined;
  if (placeholderMode === "disabled") {
    placeholderAttr = undefined;
  } else if (animateFloat) {
    placeholderAttr = " ";
  } else if (useFloating && field.label?.trim()) {
    // title floats on border; keep optional hint placeholder
    placeholderAttr = field.placeholder?.trim() || undefined;
  } else {
    placeholderAttr = field.placeholder?.trim() || undefined;
  }

  return {
    labelPosition: resolvedLabel,
    descriptionPosition,
    placeholderMode,
    align,
    sticky,
    description,
    showStackedLabel,
    useFloating,
    animateFloat,
    placeholderAttr,
  };
}

function normalizeDesc(v?: FormDescriptionPosition): FormDescriptionPosition {
  if (
    v === "above" ||
    v === "tooltip" ||
    v === "info" ||
    v === "accordion"
  ) {
    return v;
  }
  return "below";
}

function normalizeAlign(v?: FormFieldAlign): FormFieldAlign {
  if (v === "start" || v === "center" || v === "end") return v;
  return "stretch";
}

export function normalizeCaption(
  raw?: FormFieldCaption | null,
): FormFieldCaption | undefined {
  if (!raw) return undefined;
  const out: FormFieldCaption = {};
  if (raw.labelPosition && LABEL_POSITIONS.some((p) => p.id === raw.labelPosition)) {
    out.labelPosition = raw.labelPosition;
  }
  if (
    raw.descriptionPosition &&
    DESCRIPTION_POSITIONS.some((p) => p.id === raw.descriptionPosition)
  ) {
    out.descriptionPosition = raw.descriptionPosition;
  }
  if (
    raw.placeholderMode &&
    PLACEHOLDER_MODES.some((p) => p.id === raw.placeholderMode)
  ) {
    out.placeholderMode = raw.placeholderMode;
  }
  if (raw.align && FIELD_ALIGNS.some((a) => a.id === raw.align)) {
    out.align = raw.align;
  }
  if (raw.sticky) out.sticky = true;
  return Object.keys(out).length ? out : undefined;
}

export function captionWrapperClass(cap: ResolvedCaption): string {
  const parts = ["avx-field"];
  parts.push(`avx-label-${cap.labelPosition}`);
  if (cap.useFloating) {
    parts.push(cap.animateFloat ? "avx-float avx-float--animate" : "avx-float");
  }
  if (cap.sticky) parts.push("avx-sticky");
  if (cap.align !== "stretch") parts.push(`avx-align-${cap.align}`);
  return parts.join(" ");
}

/** Description HTML snippets for embed (escaped text expected). */
export function descriptionHtml(
  cap: ResolvedCaption,
  escapedText: string,
  where: "above" | "below" | "info" | "accordion",
): string {
  if (!cap.description) return "";
  if (cap.descriptionPosition === "tooltip") return "";
  if (where === "above" && cap.descriptionPosition === "above") {
    return `<p class="avx-desc avx-desc--above">${escapedText}</p>`;
  }
  if (where === "below" && cap.descriptionPosition === "below") {
    return `<p class="avx-desc avx-desc--below">${escapedText}</p>`;
  }
  if (where === "info" && cap.descriptionPosition === "info") {
    return `<span class="avx-desc-info" title="${escapedText}" tabindex="0" aria-label="${escapedText}">ⓘ</span>`;
  }
  if (where === "accordion" && cap.descriptionPosition === "accordion") {
    return `<details class="avx-desc-acc"><summary>More info</summary><p>${escapedText}</p></details>`;
  }
  return "";
}

export function descriptionTooltipAttr(
  cap: ResolvedCaption,
  escapedText: string,
): string {
  if (!cap.description || cap.descriptionPosition !== "tooltip") return "";
  return ` title="${escapedText}"`;
}
