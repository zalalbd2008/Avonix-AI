/**
 * Button Design Studio — design tokens (Avonix design system).
 * Stored on `cta_buttons.payload.style` (jsonb). Legacy flat fields still read.
 */
import type { CSSProperties } from "react";
import type { CtaActionType } from "@/lib/db/schema";

export type DesignPresetId =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "soft"
  | "gradient"
  | "glass"
  | "neon"
  | "dark"
  | "light"
  | "custom";

export type WidthMode = "full" | "auto" | "fixed" | "custom";
export type AlignX = "left" | "center" | "right" | "justify";
export type AlignY = "top" | "middle" | "bottom";
export type IconPosition = "before" | "after" | "top" | "bottom";
export type IconPack =
  | "lucide"
  | "fa"
  | "material"
  | "bootstrap"
  | "hero"
  | "phosphor"
  | "remix"
  | "custom";

export type HoverFx =
  | "none"
  | "grow"
  | "shrink"
  | "pulse"
  | "bounce"
  | "rotate"
  | "flip"
  | "lift"
  | "tilt"
  | "float"
  | "glow"
  | "gradientShift"
  | "magnetic"
  | "liquid"
  | "morph"
  | "scale"
  | "shake"
  | "darken";

export type DeviceVisibility = {
  desktop: boolean;
  tablet: boolean;
  mobile: boolean;
};

export type DeviceNumber = {
  desktop: number;
  tablet: number;
  mobile: number;
};

export type ColorState = {
  bg: string;
  text: string;
  border: string;
  icon: string;
  shadow?: string;
};

export type ButtonDesign = {
  presetId: DesignPresetId;
  layout: {
    widthMode: WidthMode;
    widthPx: number;
    heightPx: number | null;
    minWidth: number;
    maxWidth: number | null;
    paddingX: number;
    paddingY: number;
    marginX: number;
    marginY: number;
    radius: number;
    radiusTL?: number;
    radiusTR?: number;
    radiusBR?: number;
    radiusBL?: number;
    individualRadius: boolean;
    alignX: AlignX;
    alignY: AlignY;
    gap: number;
  };
  typography: {
    fontFamily: string;
    weight: number;
    size: DeviceNumber;
    lineHeight: number;
    letterSpacing: number;
    transform: "none" | "uppercase" | "lowercase" | "capitalize";
    decoration: "none" | "underline" | "overline" | "line-through";
    style: "normal" | "italic";
  };
  icon: {
    pack: IconPack;
    key: string;
    position: IconPosition;
    gap: number;
    size: DeviceNumber;
    rotation: number;
    flipX: boolean;
    flipY: boolean;
    /** FA style: solid | regular | brands */
    faStyle?: "solid" | "regular" | "brands";
    /** Custom SVG / image URL when pack is custom */
    customUrl?: string;
  };
  colors: {
    normal: ColorState;
    hover: ColorState;
    active?: Partial<ColorState>;
    focus?: Partial<ColorState>;
    disabled?: Partial<ColorState>;
    bgMode: "solid" | "gradient" | "glass";
    gradient?: string;
  };
  border: {
    width: number;
    style: "none" | "solid" | "dashed" | "dotted" | "double";
    opacity: number;
  };
  shadow: {
    enabled: boolean;
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: string;
    hoverGlow: boolean;
  };
  hover: {
    effect: HoverFx;
    durationMs: number;
  };
  animation: {
    entrance: "none" | "fade" | "slide" | "zoom" | "bounce";
    durationMs: number;
    delayMs: number;
  };
  visibility: DeviceVisibility;
  badge?: {
    enabled: boolean;
    text: string;
    bg: string;
    textColor: string;
  };
  notification?: {
    enabled: boolean;
    count: number;
    ping: boolean;
  };
  tooltip?: {
    enabled: boolean;
    text: string;
    placement: "top" | "bottom" | "left" | "right";
  };
  a11y: {
    ariaLabel: string;
    tabIndex: number;
    focusRing: boolean;
  };
  liveChat?: {
    enabled: boolean;
    pulse: boolean;
    onlineDot: boolean;
    position: "left" | "right" | "center";
  };
  customCss?: string;
  /** Legacy bridges */
  displayMode?: "inline" | "block";
};

export const DESIGN_PRESETS: {
  id: DesignPresetId;
  label: string;
  hint: string;
}[] = [
  { id: "primary", label: "Primary", hint: "Brand orange fill" },
  { id: "secondary", label: "Secondary", hint: "Navy solid" },
  { id: "outline", label: "Outline", hint: "Border only" },
  { id: "ghost", label: "Ghost", hint: "Transparent" },
  { id: "soft", label: "Soft", hint: "Tinted surface" },
  { id: "gradient", label: "Gradient", hint: "Brand blend" },
  { id: "glass", label: "Glass", hint: "Frosted" },
  { id: "neon", label: "Neon", hint: "Glow accent" },
  { id: "dark", label: "Dark", hint: "Ink fill" },
  { id: "light", label: "Light", hint: "White fill" },
  { id: "custom", label: "Custom", hint: "Your tokens" },
];

export const BUTTON_FONTS = [
  {
    label: "Instrument Sans",
    value: "var(--font-instrument), ui-sans-serif, system-ui, sans-serif",
  },
  { label: "System", value: "system-ui, -apple-system, Segoe UI, sans-serif" },
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
] as const;

export const ACTION_OPTIONS: { value: CtaActionType; label: string }[] = [
  { value: "open_url", label: "Open URL" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "messenger", label: "Messenger" },
  { value: "telegram", label: "Telegram" },
  { value: "live_chat", label: "Live Chat" },
  { value: "ai_chat", label: "AI Chat" },
  { value: "open_form", label: "Open Form" },
  { value: "open_popup", label: "Open Popup" },
  { value: "open_modal", label: "Open Modal" },
  { value: "scroll_to", label: "Anchor / Scroll" },
  { value: "download", label: "Download" },
  { value: "copy_link", label: "Copy clipboard" },
  { value: "share", label: "Share" },
  { value: "print", label: "Print" },
  { value: "javascript", label: "Run JavaScript" },
  { value: "workflow", label: "Workflow / Webhook" },
  { value: "maps", label: "Maps" },
  { value: "custom", label: "Custom" },
];

export function defaultButtonDesign(): ButtonDesign {
  return {
    presetId: "primary",
    layout: {
      widthMode: "auto",
      widthPx: 160,
      heightPx: null,
      minWidth: 0,
      maxWidth: null,
      paddingX: 22,
      paddingY: 12,
      marginX: 0,
      marginY: 0,
      radius: 10,
      individualRadius: false,
      alignX: "center",
      alignY: "middle",
      gap: 8,
    },
    typography: {
      fontFamily: BUTTON_FONTS[0].value,
      weight: 600,
      size: { desktop: 14, tablet: 14, mobile: 13 },
      lineHeight: 1.2,
      letterSpacing: 0,
      transform: "none",
      decoration: "none",
      style: "normal",
    },
    icon: {
      pack: "fa",
      key: "none",
      position: "before",
      gap: 8,
      size: { desktop: 16, tablet: 16, mobile: 15 },
      rotation: 0,
      flipX: false,
      flipY: false,
      faStyle: "solid",
      customUrl: "",
    },
    colors: {
      normal: {
        bg: "#ff6600",
        text: "#ffffff",
        border: "#ff6600",
        icon: "#ffffff",
      },
      hover: {
        bg: "#e85d00",
        text: "#ffffff",
        border: "#e85d00",
        icon: "#ffffff",
      },
      bgMode: "solid",
    },
    border: { width: 0, style: "solid", opacity: 1 },
    shadow: {
      enabled: false,
      x: 0,
      y: 8,
      blur: 20,
      spread: -4,
      color: "rgba(255,102,0,0.35)",
      hoverGlow: true,
    },
    hover: { effect: "lift", durationMs: 180 },
    animation: { entrance: "none", durationMs: 300, delayMs: 0 },
    visibility: { desktop: true, tablet: true, mobile: true },
    badge: { enabled: false, text: "New", bg: "#0b1e3a", textColor: "#fff" },
    notification: { enabled: false, count: 0, ping: true },
    tooltip: { enabled: false, text: "", placement: "top" },
    a11y: { ariaLabel: "", tabIndex: 0, focusRing: true },
    liveChat: {
      enabled: false,
      pulse: true,
      onlineDot: true,
      position: "right",
    },
    displayMode: "inline",
  };
}

const PRESET_COLORS: Record<
  Exclude<DesignPresetId, "custom">,
  { normal: ColorState; hover: ColorState; bgMode: ButtonDesign["colors"]["bgMode"]; gradient?: string; borderW: number }
> = {
  primary: {
    normal: { bg: "#ff6600", text: "#fff", border: "#ff6600", icon: "#fff" },
    hover: { bg: "#e85d00", text: "#fff", border: "#e85d00", icon: "#fff" },
    bgMode: "solid",
    borderW: 0,
  },
  secondary: {
    normal: { bg: "#0b1e3a", text: "#fff", border: "#0b1e3a", icon: "#fff" },
    hover: { bg: "#13233c", text: "#fff", border: "#13233c", icon: "#fff" },
    bgMode: "solid",
    borderW: 0,
  },
  outline: {
    normal: { bg: "transparent", text: "#ff6600", border: "#ff6600", icon: "#ff6600" },
    hover: { bg: "rgba(255,102,0,0.08)", text: "#e85d00", border: "#e85d00", icon: "#e85d00" },
    bgMode: "solid",
    borderW: 1.5,
  },
  ghost: {
    normal: { bg: "transparent", text: "#13233c", border: "transparent", icon: "#13233c" },
    hover: { bg: "rgba(11,30,58,0.06)", text: "#0b1e3a", border: "transparent", icon: "#0b1e3a" },
    bgMode: "solid",
    borderW: 0,
  },
  soft: {
    normal: { bg: "rgba(255,102,0,0.12)", text: "#e85d00", border: "transparent", icon: "#e85d00" },
    hover: { bg: "rgba(255,102,0,0.2)", text: "#ff6600", border: "transparent", icon: "#ff6600" },
    bgMode: "solid",
    borderW: 0,
  },
  gradient: {
    normal: { bg: "#ff6600", text: "#fff", border: "transparent", icon: "#fff" },
    hover: { bg: "#e85d00", text: "#fff", border: "transparent", icon: "#fff" },
    bgMode: "gradient",
    gradient: "linear-gradient(135deg, #ff6600 0%, #ff8a3d 50%, #e85d00 100%)",
    borderW: 0,
  },
  glass: {
    normal: { bg: "rgba(255,255,255,0.55)", text: "#13233c", border: "rgba(255,255,255,0.7)", icon: "#13233c" },
    hover: { bg: "rgba(255,255,255,0.75)", text: "#0b1e3a", border: "#fff", icon: "#0b1e3a" },
    bgMode: "glass",
    borderW: 1,
  },
  neon: {
    normal: { bg: "#0b1e3a", text: "#ff6600", border: "#ff6600", icon: "#ff6600" },
    hover: { bg: "#13233c", text: "#ff8a3d", border: "#ff8a3d", icon: "#ff8a3d" },
    bgMode: "solid",
    borderW: 1.5,
  },
  dark: {
    normal: { bg: "#13233c", text: "#fff", border: "#13233c", icon: "#fff" },
    hover: { bg: "#0b1e3a", text: "#fff", border: "#0b1e3a", icon: "#fff" },
    bgMode: "solid",
    borderW: 0,
  },
  light: {
    normal: { bg: "#ffffff", text: "#13233c", border: "#e6e9f0", icon: "#13233c" },
    hover: { bg: "#f4f6f9", text: "#0b1e3a", border: "#dbe1ea", icon: "#0b1e3a" },
    bgMode: "solid",
    borderW: 1,
  },
};

export function applyDesignPreset(
  design: ButtonDesign,
  id: DesignPresetId,
): ButtonDesign {
  if (id === "custom") return { ...design, presetId: "custom" };
  const p = PRESET_COLORS[id];
  return {
    ...design,
    presetId: id,
    colors: {
      ...design.colors,
      normal: { ...p.normal },
      hover: { ...p.hover },
      bgMode: p.bgMode,
      gradient: p.gradient,
    },
    border: { ...design.border, width: p.borderW },
    shadow: {
      ...design.shadow,
      enabled: id === "neon" || id === "primary" || id === "gradient",
      hoverGlow: id === "neon" || id === "primary",
      color:
        id === "neon"
          ? "rgba(255,102,0,0.55)"
          : "rgba(255,102,0,0.35)",
    },
  };
}

/** Merge stored style jsonb (legacy or studio) into ButtonDesign. */
export function mergeButtonDesign(raw?: unknown): ButtonDesign {
  const base = defaultButtonDesign();
  if (!raw || typeof raw !== "object") return base;
  const s = raw as Record<string, unknown>;

  // Already a studio design?
  if (s.layout && s.typography && s.colors) {
    return deepMerge(base, s as Partial<ButtonDesign>);
  }

  // Legacy Smart Button flat style
  const bg = String(s.bg ?? base.colors.normal.bg);
  const text = String(s.text ?? s.color ?? base.colors.normal.text);
  const padY = Number(s.paddingVertical ?? base.layout.paddingY);
  const padX = Number(s.paddingHorizontal ?? base.layout.paddingX);
  const radius = Number(s.radius ?? base.layout.radius);
  const fontSize = Number(s.fontSize ?? base.typography.size.desktop);
  const hoverMap: Record<string, HoverFx> = {
    glow: "glow",
    lift: "lift",
    scale: "grow",
    shake: "shake",
    rotate: "rotate",
    darken: "darken",
    none: "none",
  };
  const he = String(s.hoverEffect ?? "lift");

  return {
    ...base,
    presetId: "custom",
    layout: {
      ...base.layout,
      paddingX: padX,
      paddingY: padY,
      radius,
    },
    typography: {
      ...base.typography,
      size: { desktop: fontSize, tablet: fontSize, mobile: Math.max(12, fontSize - 1) },
    },
    colors: {
      ...base.colors,
      normal: { bg, text, border: bg, icon: text },
      hover: { bg, text, border: bg, icon: text },
    },
    hover: {
      ...base.hover,
      effect: hoverMap[he] ?? "lift",
    },
    displayMode: (s.displayMode as "inline" | "block") || "inline",
  };
}

function deepMerge<T extends object>(base: T, patch: Partial<T>): T {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      // @ts-expect-error deep
      out[k] = deepMerge((base as Record<string, unknown>)[k] ?? {}, v);
    } else if (v !== undefined) {
      // @ts-expect-error assign
      out[k] = v;
    }
  }
  return out;
}

/** CSS variables + inline style for live preview / connector. */
export function buttonDesignToCss(
  design: ButtonDesign,
  device: "desktop" | "tablet" | "mobile" = "desktop",
): CSSProperties {
  const fontSize = design.typography.size[device];
  const iconSize = design.icon.size[device];
  const r = design.layout.individualRadius
    ? `${design.layout.radiusTL ?? design.layout.radius}px ${design.layout.radiusTR ?? design.layout.radius}px ${design.layout.radiusBR ?? design.layout.radius}px ${design.layout.radiusBL ?? design.layout.radius}px`
    : `${design.layout.radius}px`;

  let background: string = design.colors.normal.bg;
  if (design.colors.bgMode === "gradient" && design.colors.gradient) {
    background = design.colors.gradient;
  } else if (design.colors.bgMode === "glass") {
    background = design.colors.normal.bg;
  }

  const width =
    design.layout.widthMode === "full"
      ? "100%"
      : design.layout.widthMode === "fixed" || design.layout.widthMode === "custom"
        ? `${design.layout.widthPx}px`
        : "auto";

  return {
    ["--avx-btn-bg" as string]: design.colors.normal.bg,
    ["--avx-btn-bg-hover" as string]: design.colors.hover.bg,
    ["--avx-btn-fg" as string]: design.colors.normal.text,
    ["--avx-btn-fg-hover" as string]: design.colors.hover.text,
    ["--avx-btn-border" as string]: design.colors.normal.border,
    ["--avx-btn-icon" as string]: design.colors.normal.icon,
    ["--avx-btn-icon-size" as string]: `${iconSize}px`,
    ["--avx-btn-gap" as string]: `${design.icon.gap}px`,
    ["--avx-btn-hover-ms" as string]: `${design.hover.durationMs}ms`,
    display: "inline-flex",
    alignItems:
      design.layout.alignY === "top"
        ? "flex-start"
        : design.layout.alignY === "bottom"
          ? "flex-end"
          : "center",
    justifyContent:
      design.layout.alignX === "left"
        ? "flex-start"
        : design.layout.alignX === "right"
          ? "flex-end"
          : design.layout.alignX === "justify"
            ? "space-between"
            : "center",
    flexDirection:
      design.icon.position === "top" || design.icon.position === "bottom"
        ? "column"
        : design.icon.position === "after"
          ? "row-reverse"
          : "row",
    gap: design.icon.gap,
    width,
    minWidth: design.layout.minWidth || undefined,
    maxWidth: design.layout.maxWidth ?? undefined,
    height: design.layout.heightPx ?? undefined,
    padding: `${design.layout.paddingY}px ${design.layout.paddingX}px`,
    margin: `${design.layout.marginY}px ${design.layout.marginX}px`,
    borderRadius: r,
    borderWidth: design.border.width,
    borderStyle: design.border.style === "none" ? "none" : design.border.style,
    borderColor: design.colors.normal.border,
    background,
    color: design.colors.normal.text,
    fontFamily: design.typography.fontFamily,
    fontWeight: design.typography.weight,
    fontSize,
    lineHeight: design.typography.lineHeight,
    letterSpacing: `${design.typography.letterSpacing}em`,
    textTransform: design.typography.transform,
    textDecoration: design.typography.decoration,
    fontStyle: design.typography.style,
    boxShadow: design.shadow.enabled
      ? `${design.shadow.x}px ${design.shadow.y}px ${design.shadow.blur}px ${design.shadow.spread}px ${design.shadow.color}`
      : undefined,
    backdropFilter: design.colors.bgMode === "glass" ? "blur(12px)" : undefined,
    WebkitBackdropFilter:
      design.colors.bgMode === "glass" ? "blur(12px)" : undefined,
    textDecorationLine:
      design.typography.decoration === "none"
        ? "none"
        : design.typography.decoration,
    transition: `transform var(--avx-btn-hover-ms), box-shadow var(--avx-btn-hover-ms), background var(--avx-btn-hover-ms), filter var(--avx-btn-hover-ms)`,
    cursor: "pointer",
    textAlign: "center",
    boxSizing: "border-box",
  };
}

/** Flatten studio design back to connector-friendly legacy fields + full design. */
export function designToLegacyStyle(design: ButtonDesign) {
  return {
    ...design,
    bg: design.colors.normal.bg,
    text: design.colors.normal.text,
    color: design.colors.normal.text,
    paddingVertical: design.layout.paddingY,
    paddingHorizontal: design.layout.paddingX,
    radius: design.layout.radius,
    fontSize: design.typography.size.mobile,
    hoverEffect: design.hover.effect,
    displayMode: design.displayMode ?? "inline",
  };
}
