/**
 * Enterprise Visual Form Design System.
 *
 * Themes are stored as structured JSON (design tokens + component styles +
 * states). CSS variables are derived at render/embed time so one token change
 * can cascade across the whole form.
 */
import type { FormAppearance } from "@/lib/db/schema";

export type ControlState =
  | "normal"
  | "hover"
  | "focus"
  | "active"
  | "disabled"
  | "error"
  | "success";

export type DesignTokens = {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
  radius: number;
  shadow: "none" | "sm" | "md" | "lg" | "xl";
  spacing: number;
};

export type LayoutSettings = {
  width: "auto" | "sm" | "md" | "lg" | "full" | "custom";
  customWidth: number;
  /** Visual density hint for the form frame (1–6). Field spans use the 12-col grid. */
  columns: 1 | 2 | 3 | 4 | 5 | 6;
  alignment: "left" | "center" | "right" | "stretch";
  rowGap: number;
  columnGap: number;
  fieldMargin: number;
  sectionMargin: number;
  padding: number;
};

export type ContainerSettings = {
  backgroundColor: string;
  backgroundImage: string;
  gradient: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: "none" | "solid" | "dashed" | "dotted";
  borderRadius: number;
  shadow: "none" | "sm" | "md" | "lg" | "xl";
  blur: number;
  maxWidth: number;
  padding: number;
  marginY: number;
};

export type TypographySettings = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  letterSpacing: number;
  lineHeight: number;
  textTransform: "none" | "uppercase" | "capitalize" | "lowercase";
  color: string;
};

export type LabelSettings = {
  show: boolean;
  /**
   * Form-wide label placement.
   * stacked/top = above; left/right = beside; floating = border; hidden = off.
   */
  style: "stacked" | "floating" | "left" | "right" | "hidden";
  color: string;
  size: number;
  weight: number;
  marginBottom: number;
  requiredColor: string;
  requiredText: string;
};

export type PlaceholderSettings = {
  color: string;
  opacity: number;
  fontSize: number;
  fontStyle: "normal" | "italic";
  /** Form-wide placeholder behavior. */
  mode: "enabled" | "disabled" | "animated" | "floating";
};

export type StateStyle = {
  color?: string;
  background?: string;
  borderColor?: string;
  shadow?: string;
};

export type InputSettings = {
  background: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  textColor: string;
  height: number;
  paddingX: number;
  paddingY: number;
  shadow: "none" | "sm" | "md";
  transitionMs: number;
  states: Partial<Record<ControlState, StateStyle>>;
};

export type ButtonStyle = {
  background: string;
  textColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
  fontSize: number;
  fontWeight: number;
  shadow: "none" | "sm" | "md" | "lg";
  width: "auto" | "full" | "half";
  alignment: "left" | "center" | "right" | "stretch";
  states: Partial<Record<ControlState, StateStyle>>;
};

export type ButtonGroupSettings = {
  submit: ButtonStyle;
  next: ButtonStyle;
  previous: ButtonStyle;
  reset: ButtonStyle;
  saveDraft: ButtonStyle;
};

export type IconSettings = {
  enabled: boolean;
  size: number;
  color: string;
  position: "left" | "right" | "inside-left" | "inside-right";
  gap: number;
};

export type FileUploadSettings = {
  borderColor: string;
  borderWidth: number;
  borderStyle: "solid" | "dashed" | "dotted";
  borderRadius: number;
  background: string;
  hoverBackground: string;
  dragBackground: string;
  progressColor: string;
  padding: number;
};

export type CheckboxSettings = {
  shape: "square" | "rounded" | "circle";
  size: number;
  borderColor: string;
  checkedColor: string;
  hoverBorder: string;
  disabledOpacity: number;
};

export type RadioSettings = {
  style: "circle" | "filled" | "outline";
  size: number;
  borderColor: string;
  checkedColor: string;
};

export type ToggleSettings = {
  style: "android" | "ios" | "modern";
  size: number;
  activeColor: string;
  inactiveColor: string;
  thumbColor: string;
};

export type DropdownSettings = {
  arrowColor: string;
  searchEnabled: boolean;
  borderColor: string;
  borderRadius: number;
  background: string;
};

export type DatePickerSettings = {
  calendarTheme: "light" | "dark" | "brand";
  weekendColor: string;
  todayHighlight: string;
  selectedColor: string;
};

export type RangeSettings = {
  trackColor: string;
  activeTrackColor: string;
  thumbColor: string;
  thumbSize: number;
  showBubble: boolean;
};

export type RatingSettings = {
  icon: "star" | "heart" | "emoji" | "custom";
  customIcon: string;
  size: number;
  activeColor: string;
  inactiveColor: string;
  max: number;
};

export type SignatureSettings = {
  canvasColor: string;
  borderColor: string;
  borderWidth: number;
  penColor: string;
  height: number;
};

export type RecaptchaSettings = {
  theme: "light" | "dark";
  size: "normal" | "compact";
};

export type BrandKitSettings = {
  logoUrl: string;
  brandName: string;
  primaryFont: string;
  colors: string[];
};

export type ConditionalStyleRule = {
  id: string;
  fieldKey: string;
  op: "eq" | "neq" | "filled" | "empty";
  value?: string;
  /** Extra CSS class applied to the form when the rule matches. */
  className: string;
  /** Optional primary color override while matched. */
  primaryOverride?: string;
};

export type ProgressSettings = {
  style: "line" | "number" | "circle" | "percentage";
  activeColor: string;
  completedColor: string;
  pendingColor: string;
  height: number;
  animated: boolean;
};

export type SectionSettings = {
  borderColor: string;
  borderWidth: number;
  divider: boolean;
  fontSize: number;
  fontWeight: number;
  marginY: number;
  paddingY: number;
};

export type MessageTone = {
  color: string;
  background: string;
  borderColor: string;
};

export type ValidationSettings = {
  success: MessageTone;
  warning: MessageTone;
  error: MessageTone;
  info: MessageTone;
};

export type MessageSettings = {
  success: MessageTone;
  error: MessageTone;
  warning: MessageTone;
  info: MessageTone;
};

export type AnimationSettings = {
  type: "none" | "fade" | "slide" | "zoom" | "bounce";
  durationMs: number;
  delayMs: number;
};

export type BreakpointStyle = {
  fontSize: number;
  padding: number;
  columns: 1 | 2 | 3 | 4 | 5 | 6;
  width: "auto" | "sm" | "md" | "lg" | "full";
};

export type ResponsiveSettings = {
  desktop: BreakpointStyle;
  tablet: BreakpointStyle;
  mobile: BreakpointStyle;
};

export type AdvancedSettings = {
  customCss: string;
  customClass: string;
  customId: string;
};

export type DarkModeSettings = {
  enabled: boolean;
  mode: "off" | "auto" | "manual";
};

export type A11ySettings = {
  focusRing: boolean;
  contrastMode: boolean;
  fontScaling: boolean;
  keyboardNav: boolean;
};

export type FormTheme = {
  version: 1;
  presetId: string;
  tokens: DesignTokens;
  layout: LayoutSettings;
  container: ContainerSettings;
  typography: TypographySettings;
  labels: LabelSettings;
  placeholder: PlaceholderSettings;
  input: InputSettings;
  buttons: ButtonGroupSettings;
  icons: IconSettings;
  fileUpload: FileUploadSettings;
  checkbox: CheckboxSettings;
  radio: RadioSettings;
  toggle: ToggleSettings;
  dropdown: DropdownSettings;
  datePicker: DatePickerSettings;
  range: RangeSettings;
  rating: RatingSettings;
  signature: SignatureSettings;
  recaptcha: RecaptchaSettings;
  brandKit: BrandKitSettings;
  conditionalStyles: ConditionalStyleRule[];
  progress: ProgressSettings;
  section: SectionSettings;
  validation: ValidationSettings;
  messages: MessageSettings;
  animation: AnimationSettings;
  responsive: ResponsiveSettings;
  advanced: AdvancedSettings;
  darkMode: DarkModeSettings;
  rtl: boolean;
  a11y: A11ySettings;
};

const SHADOW: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px rgba(11,30,58,.06)",
  md: "0 8px 24px rgba(11,30,58,.08)",
  lg: "0 16px 40px rgba(11,30,58,.12)",
  xl: "0 24px 64px rgba(11,30,58,.18)",
};

function button(bg: string, text = "#ffffff", radius = 8): ButtonStyle {
  return {
    background: bg,
    textColor: text,
    borderColor: bg,
    borderWidth: 0,
    borderRadius: radius,
    paddingX: 16,
    paddingY: 10,
    fontSize: 14,
    fontWeight: 600,
    shadow: "none",
    width: "auto",
    alignment: "left",
    states: {
      hover: { background: bg },
      disabled: { background: "#c3ccd9", color: "#fff" },
    },
  };
}

function tone(color: string, background: string, borderColor: string): MessageTone {
  return { color, background, borderColor };
}

export const DEFAULT_THEME: FormTheme = {
  version: 1,
  presetId: "default",
  tokens: {
    primary: "#ff6600",
    secondary: "#0b1e3a",
    accent: "#0d9488",
    surface: "#ffffff",
    surfaceMuted: "#f8fafc",
    text: "#13233c",
    textMuted: "#5b6b83",
    border: "#dbe1ea",
    danger: "#dc2626",
    success: "#0d9488",
    warning: "#d97706",
    info: "#2563eb",
    radius: 8,
    shadow: "sm",
    spacing: 14,
  },
  layout: {
    width: "md",
    customWidth: 640,
    columns: 2,
    alignment: "stretch",
    rowGap: 12,
    columnGap: 12,
    fieldMargin: 0,
    sectionMargin: 8,
    padding: 4,
  },
  container: {
    backgroundColor: "#ffffff",
    backgroundImage: "",
    gradient: "",
    borderColor: "#e6e9f0",
    borderWidth: 0,
    borderStyle: "solid",
    borderRadius: 12,
    shadow: "none",
    blur: 0,
    maxWidth: 640,
    padding: 0,
    marginY: 0,
  },
  typography: {
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
    fontSize: 14,
    fontWeight: 400,
    fontStyle: "normal",
    letterSpacing: 0,
    lineHeight: 1.45,
    textTransform: "none",
    color: "#13233c",
  },
  labels: {
    show: true,
    style: "stacked",
    color: "#13233c",
    size: 13,
    weight: 600,
    marginBottom: 6,
    requiredColor: "#ff6600",
    requiredText: "*",
  },
  placeholder: {
    color: "#8b98ab",
    opacity: 1,
    fontSize: 14,
    fontStyle: "normal",
    mode: "enabled",
  },
  input: {
    background: "#ffffff",
    borderColor: "#dbe1ea",
    borderWidth: 1,
    borderRadius: 8,
    textColor: "#13233c",
    height: 42,
    paddingX: 12,
    paddingY: 10,
    shadow: "none",
    transitionMs: 150,
    states: {
      hover: { borderColor: "#c3ccd9" },
      focus: { borderColor: "#ff6600", shadow: "0 0 0 3px rgba(255,102,0,.15)" },
      error: { borderColor: "#dc2626", shadow: "0 0 0 3px rgba(220,38,38,.12)" },
      success: { borderColor: "#0d9488" },
      disabled: { background: "#f1f4f8", color: "#8b98ab" },
    },
  },
  buttons: {
    submit: button("#ff6600"),
    next: button("#ff6600"),
    previous: {
      ...button("#f1f4f8", "#13233c"),
      borderWidth: 0,
      states: { hover: { background: "#e6e9f0" } },
    },
    reset: {
      ...button("transparent", "#5b6b83"),
      borderColor: "#dbe1ea",
      borderWidth: 1,
      states: { hover: { background: "#f8fafc" } },
    },
    saveDraft: {
      ...button("#0b1e3a", "#fff"),
      states: { hover: { background: "#13233c" } },
    },
  },
  icons: {
    enabled: false,
    size: 16,
    color: "#5b6b83",
    position: "left",
    gap: 8,
  },
  fileUpload: {
    borderColor: "#dbe1ea",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
    background: "#f8fafc",
    hoverBackground: "#f1f4f8",
    dragBackground: "rgba(255,102,0,.06)",
    progressColor: "#ff6600",
    padding: 20,
  },
  checkbox: {
    shape: "rounded",
    size: 18,
    borderColor: "#dbe1ea",
    checkedColor: "#ff6600",
    hoverBorder: "#c3ccd9",
    disabledOpacity: 0.45,
  },
  radio: {
    style: "circle",
    size: 18,
    borderColor: "#dbe1ea",
    checkedColor: "#ff6600",
  },
  toggle: {
    style: "modern",
    size: 22,
    activeColor: "#ff6600",
    inactiveColor: "#c3ccd9",
    thumbColor: "#ffffff",
  },
  dropdown: {
    arrowColor: "#5b6b83",
    searchEnabled: false,
    borderColor: "#dbe1ea",
    borderRadius: 8,
    background: "#ffffff",
  },
  datePicker: {
    calendarTheme: "brand",
    weekendColor: "#dc2626",
    todayHighlight: "rgba(255,102,0,.12)",
    selectedColor: "#ff6600",
  },
  range: {
    trackColor: "#e6e9f0",
    activeTrackColor: "#ff6600",
    thumbColor: "#ff6600",
    thumbSize: 18,
    showBubble: true,
  },
  rating: {
    icon: "star",
    customIcon: "★",
    size: 28,
    activeColor: "#f59e0b",
    inactiveColor: "#dbe1ea",
    max: 5,
  },
  signature: {
    canvasColor: "#ffffff",
    borderColor: "#dbe1ea",
    borderWidth: 1,
    penColor: "#13233c",
    height: 160,
  },
  recaptcha: {
    theme: "light",
    size: "normal",
  },
  brandKit: {
    logoUrl: "",
    brandName: "",
    primaryFont: "system-ui, -apple-system, Segoe UI, sans-serif",
    colors: ["#ff6600", "#0b1e3a", "#0d9488", "#13233c"],
  },
  conditionalStyles: [],
  progress: {
    style: "line",
    activeColor: "#ff6600",
    completedColor: "#ff6600",
    pendingColor: "#e6e9f0",
    height: 4,
    animated: true,
  },
  section: {
    borderColor: "#e6e9f0",
    borderWidth: 1,
    divider: true,
    fontSize: 14,
    fontWeight: 700,
    marginY: 8,
    paddingY: 6,
  },
  validation: {
    success: tone("#0d9488", "rgba(13,148,136,.08)", "rgba(13,148,136,.25)"),
    warning: tone("#d97706", "rgba(217,119,6,.08)", "rgba(217,119,6,.25)"),
    error: tone("#dc2626", "rgba(220,38,38,.08)", "rgba(220,38,38,.25)"),
    info: tone("#2563eb", "rgba(37,99,235,.08)", "rgba(37,99,235,.25)"),
  },
  messages: {
    success: tone("#0d9488", "rgba(13,148,136,.08)", "rgba(13,148,136,.25)"),
    error: tone("#dc2626", "rgba(220,38,38,.08)", "rgba(220,38,38,.25)"),
    warning: tone("#d97706", "rgba(217,119,6,.08)", "rgba(217,119,6,.25)"),
    info: tone("#2563eb", "rgba(37,99,235,.08)", "rgba(37,99,235,.25)"),
  },
  animation: { type: "fade", durationMs: 220, delayMs: 0 },
  responsive: {
    desktop: { fontSize: 14, padding: 4, columns: 2, width: "md" },
    tablet: { fontSize: 14, padding: 4, columns: 2, width: "md" },
    mobile: { fontSize: 14, padding: 4, columns: 1, width: "full" },
  },
  advanced: { customCss: "", customClass: "", customId: "" },
  darkMode: { enabled: false, mode: "off" },
  rtl: false,
  a11y: {
    focusRing: true,
    contrastMode: false,
    fontScaling: false,
    keyboardNav: true,
  },
};

function deepMerge<T extends Record<string, unknown>>(base: T, patch?: Partial<T> | null): T {
  if (!patch) return structuredClone(base);
  const out = structuredClone(base) as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object") {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

/** Upgrade legacy flat FormAppearance into FormTheme. */
export function upgradeToTheme(
  raw?: FormTheme | FormAppearance | null,
  presetId = "custom",
): FormTheme {
  if (!raw) return structuredClone(DEFAULT_THEME);
  if ("version" in raw && (raw as FormTheme).version === 1 && "tokens" in raw) {
    return deepMerge(DEFAULT_THEME, raw as Partial<FormTheme>);
  }
  const a = raw as FormAppearance;
  const theme = structuredClone(DEFAULT_THEME);
  theme.presetId = presetId;
  theme.tokens.primary = a.primaryColor ?? theme.tokens.primary;
  theme.tokens.text = a.labelColor ?? theme.tokens.text;
  theme.tokens.border = a.inputBorder ?? theme.tokens.border;
  theme.tokens.surface = a.formBg ?? theme.tokens.surface;
  theme.tokens.radius = a.inputRadius ?? theme.tokens.radius;
  theme.tokens.spacing = a.fieldGap ?? theme.tokens.spacing;
  theme.typography.fontFamily = a.fontFamily ?? theme.typography.fontFamily;
  theme.typography.fontSize = a.fontSize ?? theme.typography.fontSize;
  theme.typography.color = a.inputTextColor ?? theme.typography.color;
  theme.labels.color = a.labelColor ?? theme.labels.color;
  theme.labels.size = a.labelSize ?? theme.labels.size;
  theme.labels.requiredColor = a.primaryColor ?? theme.labels.requiredColor;
  theme.input.background = a.inputBg ?? theme.input.background;
  theme.input.borderColor = a.inputBorder ?? theme.input.borderColor;
  theme.input.textColor = a.inputTextColor ?? theme.input.textColor;
  theme.input.borderRadius = a.inputRadius ?? theme.input.borderRadius;
  theme.input.paddingX = a.inputPaddingX ?? theme.input.paddingX;
  theme.input.paddingY = a.inputPaddingY ?? theme.input.paddingY;
  theme.layout.rowGap = a.rowGap ?? theme.layout.rowGap;
  theme.layout.columnGap = a.rowGap ?? theme.layout.columnGap;
  theme.container.backgroundColor = a.formBg ?? theme.container.backgroundColor;
  theme.buttons.submit = button(
    a.primaryColor ?? "#ff6600",
    a.buttonTextColor ?? "#fff",
    a.inputRadius ?? 8,
  );
  theme.buttons.next = structuredClone(theme.buttons.submit);
  theme.progress.activeColor = a.primaryColor ?? theme.progress.activeColor;
  theme.progress.completedColor = a.primaryColor ?? theme.progress.completedColor;
  return theme;
}

export function mergeTheme(partial?: Partial<FormTheme> | null): FormTheme {
  return deepMerge(DEFAULT_THEME, partial ?? undefined);
}

export type ThemePreset = {
  id: string;
  label: string;
  hint: string;
  patch: DeepPartial<FormTheme>;
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export const THEME_PRESETS: ThemePreset[] = [
  { id: "default", label: "Default", hint: "Avonix orange", patch: { presetId: "default" } },
  {
    id: "minimal",
    label: "Minimal",
    hint: "Hairline borders",
    patch: {
      presetId: "minimal",
      tokens: { ...DEFAULT_THEME.tokens, primary: "#111827", radius: 4, shadow: "none" },
      container: { ...DEFAULT_THEME.container, borderWidth: 0, shadow: "none", padding: 0 },
      input: { ...DEFAULT_THEME.input, borderRadius: 4, shadow: "none" },
      buttons: {
        submit: button("#111827", "#fff", 4),
        next: button("#111827", "#fff", 4),
        previous: { ...button("#f3f4f6", "#111827", 4) },
      },
    },
  },
  {
    id: "modern",
    label: "Modern",
    hint: "Soft cards",
    patch: {
      presetId: "modern",
      tokens: { ...DEFAULT_THEME.tokens, primary: "#6366f1", radius: 14, shadow: "md" },
      container: {
        ...DEFAULT_THEME.container,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderRadius: 16,
        shadow: "md",
        padding: 20,
      },
      input: { ...DEFAULT_THEME.input, borderRadius: 12, background: "#f8fafc" },
      buttons: {
        submit: button("#6366f1", "#fff", 12),
        next: button("#6366f1", "#fff", 12),
        previous: { ...button("#eef2ff", "#4338ca", 12) },
      },
      progress: { ...DEFAULT_THEME.progress, activeColor: "#6366f1", completedColor: "#6366f1" },
    },
  },
  {
    id: "professional",
    label: "Professional",
    hint: "Navy corporate",
    patch: {
      presetId: "professional",
      tokens: { ...DEFAULT_THEME.tokens, primary: "#0b1e3a", secondary: "#13233c", radius: 6 },
      buttons: {
        submit: button("#0b1e3a"),
        next: button("#0b1e3a"),
        previous: { ...button("#e8eef6", "#0b1e3a", 6) },
      },
      progress: { ...DEFAULT_THEME.progress, activeColor: "#0b1e3a", completedColor: "#0b1e3a" },
      labels: { ...DEFAULT_THEME.labels, requiredColor: "#0b1e3a" },
    },
  },
  {
    id: "glass",
    label: "Glassmorphism",
    hint: "Frosted panel",
    patch: {
      presetId: "glass",
      tokens: {
        ...DEFAULT_THEME.tokens,
        primary: "#0ea5e9",
        secondary: "#38bdf8",
        accent: "#7dd3fc",
        surface: "rgba(255,255,255,.42)",
        surfaceMuted: "rgba(255,255,255,.28)",
        border: "rgba(255,255,255,.55)",
        radius: 16,
        shadow: "xl",
      },
      container: {
        ...DEFAULT_THEME.container,
        backgroundColor: "rgba(255,255,255,.42)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,.62)",
        borderRadius: 22,
        shadow: "xl",
        blur: 18,
        padding: 26,
      },
      input: {
        ...DEFAULT_THEME.input,
        background: "rgba(255,255,255,.62)",
        borderColor: "rgba(255,255,255,.78)",
        borderRadius: 14,
        states: {
          ...DEFAULT_THEME.input.states,
          focus: { borderColor: "#0ea5e9" },
        },
      },
      buttons: {
        submit: button("#0ea5e9", "#fff", 14),
        next: button("#0ea5e9", "#fff", 14),
        previous: { ...button("rgba(255,255,255,.55)", "#0c4a6e", 14) },
      },
      progress: {
        ...DEFAULT_THEME.progress,
        activeColor: "#0ea5e9",
        completedColor: "#38bdf8",
      },
    },
  },
  {
    id: "neuro",
    label: "Neumorphism",
    hint: "Soft emboss",
    patch: {
      presetId: "neuro",
      tokens: { ...DEFAULT_THEME.tokens, primary: "#6b7280", surface: "#e6e9ef", radius: 16 },
      container: {
        ...DEFAULT_THEME.container,
        backgroundColor: "#e6e9ef",
        borderWidth: 0,
        borderRadius: 20,
        shadow: "none",
        padding: 24,
      },
      input: {
        ...DEFAULT_THEME.input,
        background: "#e6e9ef",
        borderColor: "#e6e9ef",
        borderRadius: 14,
        shadow: "md",
      },
      buttons: {
        submit: button("#e6e9ef", "#374151", 14),
        next: button("#e6e9ef", "#374151", 14),
        previous: { ...button("#e6e9ef", "#6b7280", 14) },
      },
    },
  },
  {
    id: "material",
    label: "Material",
    hint: "Filled fields",
    patch: {
      presetId: "material",
      tokens: {
        ...DEFAULT_THEME.tokens,
        primary: "#6750a4",
        secondary: "#625b71",
        accent: "#7d5260",
        surface: "#fffbfe",
        surfaceMuted: "#f7f2fa",
        border: "#cac4d0",
        radius: 4,
        shadow: "sm",
      },
      container: {
        ...DEFAULT_THEME.container,
        backgroundColor: "#fffbfe",
        borderWidth: 0,
        borderRadius: 12,
        shadow: "md",
        padding: 24,
      },
      labels: { ...DEFAULT_THEME.labels, style: "floating" },
      input: {
        ...DEFAULT_THEME.input,
        background: "#ece6f0",
        borderColor: "transparent",
        borderWidth: 0,
        borderRadius: 4,
        paddingY: 14,
        states: {
          ...DEFAULT_THEME.input.states,
          focus: { borderColor: "#6750a4", background: "#e8def8" },
        },
      },
      buttons: {
        submit: button("#6750a4", "#fff", 20),
        next: button("#6750a4", "#fff", 20),
        previous: { ...button("#e8def8", "#1d192b", 20) },
      },
      progress: {
        ...DEFAULT_THEME.progress,
        activeColor: "#6750a4",
        completedColor: "#6750a4",
      },
    },
  },
  {
    id: "bootstrap",
    label: "Bootstrap",
    hint: "Classic blue",
    patch: {
      presetId: "bootstrap",
      tokens: { ...DEFAULT_THEME.tokens, primary: "#0d6efd", radius: 6 },
      input: { ...DEFAULT_THEME.input, borderRadius: 6, borderColor: "#ced4da" },
      buttons: {
        submit: button("#0d6efd", "#fff", 6),
        next: button("#0d6efd", "#fff", 6),
        previous: { ...button("#6c757d", "#fff", 6) },
      },
      progress: { ...DEFAULT_THEME.progress, activeColor: "#0d6efd", completedColor: "#0d6efd" },
    },
  },
  {
    id: "rounded",
    label: "Rounded",
    hint: "Pill inputs",
    patch: {
      presetId: "rounded",
      tokens: { ...DEFAULT_THEME.tokens, primary: "#f43f5e", radius: 999 },
      input: { ...DEFAULT_THEME.input, borderRadius: 999, paddingX: 18 },
      buttons: {
        submit: button("#f43f5e", "#fff", 999),
        next: button("#f43f5e", "#fff", 999),
        previous: { ...button("#ffe4e6", "#9f1239", 999) },
      },
      progress: { ...DEFAULT_THEME.progress, activeColor: "#f43f5e", completedColor: "#f43f5e" },
    },
  },
  {
    id: "corporate",
    label: "Corporate",
    hint: "Teal enterprise",
    patch: {
      presetId: "corporate",
      tokens: { ...DEFAULT_THEME.tokens, primary: "#0f766e", radius: 8 },
      buttons: {
        submit: button("#0f766e"),
        next: button("#0f766e"),
        previous: { ...button("#ccfbf1", "#115e59", 8) },
      },
      progress: { ...DEFAULT_THEME.progress, activeColor: "#0f766e", completedColor: "#0f766e" },
      labels: { ...DEFAULT_THEME.labels, requiredColor: "#0f766e" },
    },
  },
  {
    id: "luxury",
    label: "Luxury",
    hint: "Gold on ink",
    patch: {
      presetId: "luxury",
      tokens: {
        ...DEFAULT_THEME.tokens,
        primary: "#c6a75e",
        surface: "#14110f",
        text: "#f5efe6",
        border: "#3a322a",
      },
      typography: { ...DEFAULT_THEME.typography, color: "#f5efe6", fontFamily: "Georgia, serif" },
      labels: { ...DEFAULT_THEME.labels, color: "#f5efe6", requiredColor: "#c6a75e" },
      container: {
        ...DEFAULT_THEME.container,
        backgroundColor: "#14110f",
        borderColor: "#3a322a",
        borderWidth: 1,
        padding: 22,
      },
      input: {
        ...DEFAULT_THEME.input,
        background: "#1c1814",
        borderColor: "#3a322a",
        textColor: "#f5efe6",
      },
      buttons: {
        submit: button("#c6a75e", "#14110f", 4),
        next: button("#c6a75e", "#14110f", 4),
        previous: { ...button("#2a241e", "#c6a75e", 4) },
      },
      progress: {
        ...DEFAULT_THEME.progress,
        activeColor: "#c6a75e",
        completedColor: "#c6a75e",
        pendingColor: "#3a322a",
      },
    },
  },
  {
    id: "dark",
    label: "Dark",
    hint: "Night mode",
    patch: {
      presetId: "dark",
      tokens: {
        ...DEFAULT_THEME.tokens,
        primary: "#ff7a2f",
        surface: "#0f172a",
        text: "#e2e8f0",
        border: "#334155",
      },
      darkMode: { enabled: true, mode: "manual" },
      typography: { ...DEFAULT_THEME.typography, color: "#e2e8f0" },
      labels: { ...DEFAULT_THEME.labels, color: "#e2e8f0" },
      container: {
        ...DEFAULT_THEME.container,
        backgroundColor: "#0f172a",
        borderColor: "#334155",
        borderWidth: 1,
        padding: 18,
      },
      input: {
        ...DEFAULT_THEME.input,
        background: "#1e293b",
        borderColor: "#334155",
        textColor: "#e2e8f0",
      },
      buttons: {
        submit: button("#ff7a2f"),
        next: button("#ff7a2f"),
        previous: { ...button("#1e293b", "#e2e8f0") },
      },
      progress: { ...DEFAULT_THEME.progress, pendingColor: "#334155" },
    },
  },
  {
    id: "light",
    label: "Light",
    hint: "Airy white",
    patch: {
      presetId: "light",
      tokens: { ...DEFAULT_THEME.tokens, primary: "#2563eb", surface: "#ffffff", shadow: "sm" },
      container: {
        ...DEFAULT_THEME.container,
        backgroundColor: "#ffffff",
        shadow: "sm",
        padding: 16,
        borderWidth: 1,
      },
      buttons: {
        submit: button("#2563eb"),
        next: button("#2563eb"),
        previous: { ...button("#eff6ff", "#1d4ed8") },
      },
      progress: { ...DEFAULT_THEME.progress, activeColor: "#2563eb", completedColor: "#2563eb" },
    },
  },
  { id: "custom", label: "Custom", hint: "Your edits", patch: { presetId: "custom" } },
];

export function applyPreset(id: string): FormTheme {
  const preset = THEME_PRESETS.find((p) => p.id === id);
  if (!preset || id === "custom") return structuredClone(DEFAULT_THEME);
  return deepMerge(DEFAULT_THEME, preset.patch as Partial<FormTheme> & { presetId: string });
}

const WIDTH_PX: Record<string, string> = {
  auto: "100%",
  sm: "420px",
  md: "640px",
  lg: "820px",
  full: "100%",
};

/** CSS custom properties for preview + embed. */
export function buttonWidthCss(width: ButtonStyle["width"]): string {
  if (width === "full") return "100%";
  if (width === "half") return "50%";
  return "auto";
}

export function buttonAlignCss(alignment: ButtonStyle["alignment"]): string {
  if (alignment === "center") return "center";
  if (alignment === "right") return "flex-end";
  if (alignment === "stretch") return "stretch";
  return "flex-start";
}

/** Submit-only horizontal margins so Next/Back stay default flow. */
export function buttonAlignMargins(alignment: ButtonStyle["alignment"]): {
  ml: string;
  mr: string;
} {
  if (alignment === "center") return { ml: "auto", mr: "auto" };
  if (alignment === "right") return { ml: "auto", mr: "0" };
  return { ml: "0", mr: "0" };
}

export function themeStyle(theme: FormTheme): Record<string, string> {
  const t = theme;
  const width =
    t.layout.width === "custom" ? `${t.layout.customWidth}px` : WIDTH_PX[t.layout.width] ?? "640px";
  const minCol =
    t.layout.columns <= 1
      ? "100%"
      : t.layout.columns === 2
        ? "11rem"
        : t.layout.columns === 3
          ? "9.5rem"
          : t.layout.columns === 4
            ? "8rem"
            : t.layout.columns === 5
              ? "7rem"
              : "6.5rem";
  const gridCols = Math.min(6, Math.max(1, t.layout.columns));

  return {
    ["--avx-primary"]: t.tokens.primary,
    ["--avx-secondary"]: t.tokens.secondary,
    ["--avx-accent"]: t.tokens.accent,
    ["--avx-surface"]: t.tokens.surface,
    ["--avx-surface-muted"]: t.tokens.surfaceMuted,
    ["--avx-text"]: t.tokens.text,
    ["--avx-text-muted"]: t.tokens.textMuted,
    ["--avx-border"]: t.tokens.border,
    ["--avx-danger"]: t.tokens.danger,
    ["--avx-success"]: t.tokens.success,
    ["--avx-warning"]: t.tokens.warning,
    ["--avx-info"]: t.tokens.info,
    ["--avx-radius-token"]: `${t.tokens.radius}px`,
    ["--avx-shadow-token"]: SHADOW[t.tokens.shadow] ?? SHADOW.sm,

    ["--avx-form-width"]: width,
    ["--avx-form-max"]: `${t.container.maxWidth}px`,
    ["--avx-cols-min"]: minCol,
    ["--avx-grid-cols"]: String(gridCols === 1 ? 12 : 12),
    ["--avx-align"]:
      t.layout.alignment === "center"
        ? "center"
        : t.layout.alignment === "right"
          ? "flex-end"
          : "stretch",
    ["--avx-row-gap"]: `${t.layout.rowGap}px`,
    ["--avx-col-gap"]: `${t.layout.columnGap}px`,
    ["--avx-field-gap"]: `${t.tokens.spacing}px`,
    ["--avx-field-margin"]: `${t.layout.fieldMargin}px`,
    ["--avx-section-margin"]: `${t.layout.sectionMargin}px`,
    ["--avx-layout-pad"]: `${t.layout.padding}px`,

    ["--avx-form-bg"]: t.container.backgroundColor,
    ["--avx-form-image"]: t.container.backgroundImage
      ? `url(${JSON.stringify(t.container.backgroundImage)})`
      : "none",
    ["--avx-form-gradient"]: t.container.gradient || "none",
    ["--avx-container-border"]: t.container.borderColor,
    ["--avx-container-bw"]: `${t.container.borderWidth}px`,
    ["--avx-container-bs"]: t.container.borderStyle,
    ["--avx-container-radius"]: `${t.container.borderRadius}px`,
    ["--avx-container-shadow"]: SHADOW[t.container.shadow] ?? "none",
    ["--avx-container-blur"]: t.container.blur ? `blur(${t.container.blur}px)` : "none",
    ["--avx-container-pad"]: `${t.container.padding}px`,
    ["--avx-container-my"]: `${t.container.marginY}px`,

    ["--avx-font"]: (() => {
      const token = t.typography.fontFamily?.trim() || "";
      // Bare Google family name → CSS stack; already a stack → keep.
      if (token && !token.includes(",") && !token.startsWith("system-ui")) {
        return `'${token.replace(/['"]/g, "")}', system-ui, sans-serif`;
      }
      return token || "system-ui, -apple-system, Segoe UI, sans-serif";
    })(),
    ["--avx-font-size"]: `${t.typography.fontSize}px`,
    ["--avx-font-weight"]: String(t.typography.fontWeight),
    ["--avx-font-style"]: t.typography.fontStyle,
    ["--avx-letter"]: `${t.typography.letterSpacing}px`,
    ["--avx-leading"]: String(t.typography.lineHeight),
    ["--avx-transform"]: t.typography.textTransform,
    ["--avx-type-color"]: t.typography.color,

    ["--avx-label"]: t.labels.color,
    ["--avx-label-size"]: `${t.labels.size}px`,
    ["--avx-label-weight"]: String(t.labels.weight),
    ["--avx-label-mb"]: `${t.labels.marginBottom}px`,
    ["--avx-required"]: t.labels.requiredColor,
    ["--avx-label-display"]: t.labels.show ? "block" : "none",
    ["--avx-label-style"]: t.labels.style ?? "stacked",
    ["--avx-form-bg-solid"]: t.container.backgroundColor || t.input.background || "#fff",

    ["--avx-ph-color"]: t.placeholder.color,
    ["--avx-ph-opacity"]: String(t.placeholder.opacity),
    ["--avx-ph-size"]: `${t.placeholder.fontSize}px`,
    ["--avx-ph-style"]: t.placeholder.fontStyle,

    ["--avx-input-bg"]: t.input.background,
    ["--avx-input-border"]: t.input.borderColor,
    ["--avx-input-bw"]: `${t.input.borderWidth}px`,
    ["--avx-radius"]: `${t.input.borderRadius}px`,
    ["--avx-input-text"]: t.input.textColor,
    ["--avx-input-h"]: `${t.input.height}px`,
    ["--avx-pad-x"]: `${t.input.paddingX}px`,
    ["--avx-pad-y"]: `${t.input.paddingY}px`,
    ["--avx-input-shadow"]: SHADOW[t.input.shadow] ?? "none",
    ["--avx-input-transition"]: `${t.input.transitionMs}ms`,
    ["--avx-input-hover-border"]: t.input.states.hover?.borderColor ?? t.input.borderColor,
    ["--avx-input-focus-border"]: t.input.states.focus?.borderColor ?? t.tokens.primary,
    ["--avx-input-focus-shadow"]:
      t.input.states.focus?.shadow ?? "0 0 0 3px rgba(255,102,0,.15)",
    ["--avx-input-error-border"]: t.input.states.error?.borderColor ?? t.tokens.danger,

    ["--avx-btn-bg"]: t.buttons.submit.background,
    ["--avx-btn-text"]: t.buttons.submit.textColor,
    ["--avx-btn-radius"]: `${t.buttons.submit.borderRadius}px`,
    ["--avx-btn-px"]: `${t.buttons.submit.paddingX}px`,
    ["--avx-btn-py"]: `${t.buttons.submit.paddingY}px`,
    ["--avx-btn-size"]: `${t.buttons.submit.fontSize}px`,
    ["--avx-btn-weight"]: String(t.buttons.submit.fontWeight),
    ["--avx-btn-shadow"]: SHADOW[t.buttons.submit.shadow] ?? "none",
    ["--avx-btn-width"]: buttonWidthCss(t.buttons.submit.width),
    ["--avx-btn-align"]: buttonAlignCss(t.buttons.submit.alignment),
    ["--avx-btn-ml"]: buttonAlignMargins(t.buttons.submit.alignment).ml,
    ["--avx-btn-mr"]: buttonAlignMargins(t.buttons.submit.alignment).mr,

    ["--avx-next-bg"]: t.buttons.next.background,
    ["--avx-next-text"]: t.buttons.next.textColor,
    ["--avx-prev-bg"]: t.buttons.previous.background,
    ["--avx-prev-text"]: t.buttons.previous.textColor,
    ["--avx-reset-bg"]: t.buttons.reset.background,
    ["--avx-reset-text"]: t.buttons.reset.textColor,
    ["--avx-draft-bg"]: t.buttons.saveDraft.background,
    ["--avx-draft-text"]: t.buttons.saveDraft.textColor,

    ["--avx-icon-size"]: `${t.icons.size}px`,
    ["--avx-icon-color"]: t.icons.color,
    ["--avx-icon-gap"]: `${t.icons.gap}px`,

    ["--avx-upload-bg"]: t.fileUpload.background,
    ["--avx-upload-hover"]: t.fileUpload.hoverBackground,
    ["--avx-upload-drag"]: t.fileUpload.dragBackground,
    ["--avx-upload-border"]: t.fileUpload.borderColor,
    ["--avx-upload-bw"]: `${t.fileUpload.borderWidth}px`,
    ["--avx-upload-bs"]: t.fileUpload.borderStyle,
    ["--avx-upload-radius"]: `${t.fileUpload.borderRadius}px`,
    ["--avx-upload-pad"]: `${t.fileUpload.padding}px`,
    ["--avx-upload-progress"]: t.fileUpload.progressColor,

    ["--avx-check-size"]: `${t.checkbox.size}px`,
    ["--avx-check-border"]: t.checkbox.borderColor,
    ["--avx-check-on"]: t.checkbox.checkedColor,
    ["--avx-check-hover"]: t.checkbox.hoverBorder,
    ["--avx-check-radius"]:
      t.checkbox.shape === "circle"
        ? "999px"
        : t.checkbox.shape === "rounded"
          ? "4px"
          : "2px",

    ["--avx-radio-size"]: `${t.radio.size}px`,
    ["--avx-radio-border"]: t.radio.borderColor,
    ["--avx-radio-on"]: t.radio.checkedColor,

    ["--avx-toggle-active"]: t.toggle.activeColor,
    ["--avx-toggle-inactive"]: t.toggle.inactiveColor,
    ["--avx-toggle-thumb"]: t.toggle.thumbColor,
    ["--avx-toggle-size"]: `${t.toggle.size}px`,

    ["--avx-dd-arrow"]: t.dropdown.arrowColor,
    ["--avx-dd-border"]: t.dropdown.borderColor,
    ["--avx-dd-radius"]: `${t.dropdown.borderRadius}px`,
    ["--avx-dd-bg"]: t.dropdown.background,

    ["--avx-date-weekend"]: t.datePicker.weekendColor,
    ["--avx-date-today"]: t.datePicker.todayHighlight,
    ["--avx-date-selected"]: t.datePicker.selectedColor,

    ["--avx-range-track"]: t.range.trackColor,
    ["--avx-range-active"]: t.range.activeTrackColor,
    ["--avx-range-thumb"]: t.range.thumbColor,
    ["--avx-range-thumb-size"]: `${t.range.thumbSize}px`,

    ["--avx-rating-on"]: t.rating.activeColor,
    ["--avx-rating-off"]: t.rating.inactiveColor,
    ["--avx-rating-size"]: `${t.rating.size}px`,

    ["--avx-sig-bg"]: t.signature.canvasColor,
    ["--avx-sig-border"]: t.signature.borderColor,
    ["--avx-sig-bw"]: `${t.signature.borderWidth}px`,
    ["--avx-sig-pen"]: t.signature.penColor,
    ["--avx-sig-h"]: `${t.signature.height}px`,

    ["--avx-progress-active"]: t.progress.activeColor,
    ["--avx-progress-done"]: t.progress.completedColor,
    ["--avx-progress-pending"]: t.progress.pendingColor,
    ["--avx-progress-h"]: `${t.progress.height}px`,

    ["--avx-section-border"]: t.section.borderColor,
    ["--avx-section-bw"]: `${t.section.borderWidth}px`,
    ["--avx-section-size"]: `${t.section.fontSize}px`,
    ["--avx-section-weight"]: String(t.section.fontWeight),
    ["--avx-section-my"]: `${t.section.marginY}px`,
    ["--avx-section-py"]: `${t.section.paddingY}px`,

    ["--avx-dir"]: t.rtl ? "rtl" : "ltr",
    ["--avx-anim"]: t.animation.type,
    ["--avx-anim-ms"]: `${t.animation.durationMs}ms`,
    ["--avx-anim-delay"]: `${t.animation.delayMs}ms`,
  };
}

export function themeCssText(theme: FormTheme): string {
  return Object.entries(themeStyle(theme))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/** One-click Custom CSS inserts for Appearance → Advanced. */
export const CUSTOM_CSS_SNIPPETS: { id: string; label: string; css: string }[] = [
  {
    id: "compact",
    label: "Compact spacing",
    css: `.avonix-form{gap:10px}.avonix-form .avx-step{gap:8px 10px}`,
  },
  {
    id: "center-nav",
    label: "Center nav buttons",
    css: `.avonix-form .avx-nav{justify-content:center}`,
  },
  {
    id: "soft-inputs",
    label: "Soft input shadow",
    css: `.avonix-form input,.avonix-form select,.avonix-form textarea{box-shadow:0 2px 8px rgba(11,30,58,.06)}`,
  },
  {
    id: "glass-boost",
    label: "Glass boost",
    css: `.avonix-form{background:rgba(255,255,255,.38)!important;backdrop-filter:blur(22px)!important;-webkit-backdrop-filter:blur(22px)!important;border:1px solid rgba(255,255,255,.7)!important}`,
  },
  {
    id: "material-underline",
    label: "Material underline",
    css: `.avonix-form input,.avonix-form select,.avonix-form textarea{border:0!important;border-bottom:2px solid #cac4d0!important;border-radius:4px 4px 0 0!important;background:#ece6f0!important}.avonix-form input:focus,.avonix-form select:focus,.avonix-form textarea:focus{border-bottom-color:#6750a4!important;box-shadow:none!important}`,
  },
  {
    id: "hide-desc",
    label: "Hide descriptions",
    css: `.avonix-form .avx-desc,.avonix-form .avx-desc-info,.avonix-form .avx-desc-acc{display:none!important}`,
  },
];

export function themeEmbedCss(theme: FormTheme): string {
  const custom = theme.advanced.customCss?.trim() ?? "";
  return `
.avonix-form{direction:var(--avx-dir,ltr);display:grid;gap:var(--avx-field-gap,14px);width:100%;max-width:min(var(--avx-form-width,640px),var(--avx-form-max,640px));margin-inline:auto;margin-block:var(--avx-container-my,0);padding:var(--avx-container-pad,0);box-sizing:border-box;overflow:visible;font-family:var(--avx-font,system-ui,sans-serif);font-size:var(--avx-font-size,14px);font-weight:var(--avx-font-weight,400);font-style:var(--avx-font-style,normal);letter-spacing:var(--avx-letter,0);line-height:var(--avx-leading,1.45);text-transform:var(--avx-transform,none);color:var(--avx-type-color,#13233c);background:var(--avx-form-bg,#fff);background-size:cover;border:var(--avx-container-bw,0) var(--avx-container-bs,solid) var(--avx-container-border,transparent);border-radius:var(--avx-container-radius,12px);box-shadow:var(--avx-container-shadow,none);backdrop-filter:var(--avx-container-blur,none);-webkit-backdrop-filter:var(--avx-container-blur,none)}
.avonix-form .avx-step{display:grid;gap:var(--avx-row-gap,12px) var(--avx-col-gap,12px);grid-template-columns:repeat(12,minmax(0,1fr));overflow:visible}
.avonix-form .avx-body .avx-step{display:grid}
.avonix-form .avx-col{min-width:0;grid-column:span var(--avx-span,12);overflow:visible}
.avonix-form .avx-full{grid-column:1/-1}
.avonix-form .avx-step-title{grid-column:1/-1;font-weight:700;font-size:calc(var(--avx-label-size,13px) + 2px);color:var(--avx-label,#13233c);margin-bottom:2px}
.avonix-form label{display:block;min-width:0;margin:var(--avx-field-margin,0);color:var(--avx-label,#13233c);font-size:var(--avx-label-size,13px);font-weight:var(--avx-label-weight,600)}
.avonix-form .avx-label-text{display:var(--avx-label-display,block);margin-bottom:var(--avx-label-mb,6px)}
.avonix-form .avx-float{position:relative;display:block;min-width:0;margin:var(--avx-field-margin,0);margin-top:calc(var(--avx-label-size,13px) * .55);padding:0;color:inherit;font-size:inherit;font-weight:inherit}
.avonix-form .avx-float>.avx-float-label{position:absolute;display:block;left:10px;top:0;transform:translateY(-50%);z-index:1;padding:0 6px;margin:0;line-height:1;pointer-events:none;background:var(--avx-input-bg,#fff);color:var(--avx-label,#13233c);font-size:var(--avx-label-size,13px);font-weight:var(--avx-label-weight,600);white-space:nowrap;max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis;transition:top .18s ease,transform .18s ease,font-size .18s ease,color .15s ease,background .15s ease,padding .15s ease,left .15s ease,font-weight .15s ease}
.avonix-form .avx-float>input,.avonix-form .avx-float>select,.avonix-form .avx-float>textarea,.avonix-form .avx-float .avx-control>input,.avonix-form .avx-float .avx-control>select,.avonix-form .avx-float .avx-control>textarea{width:100%;display:block}
.avonix-form .avx-logic-bar{grid-column:1/-1;display:flex;flex-direction:column;flex-wrap:wrap;gap:10px;align-items:stretch;padding:10px 12px;margin-bottom:4px;border:1px solid var(--avx-input-border,#dbe1ea);border-radius:10px;background:var(--avx-upload-bg,#f8fafc);font-size:13px;font-weight:700;color:var(--avx-label,#13233c)}
.avonix-form .avx-logic-bar[hidden]{display:none!important}
.avonix-form .avx-logic-score,.avonix-form .avx-logic-price{display:inline-flex;align-items:center;gap:6px}
.avonix-form .avx-logic-price{color:var(--avx-input-focus-border,#ff6600)}
.avonix-form .avx-budget{width:100%;font-weight:500}
.avonix-form .avx-budget-title{margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--avx-text-muted,#5b6b83)}
.avonix-form .avx-budget-lines{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.avonix-form .avx-budget-lines li{display:flex;justify-content:space-between;gap:12px;font-size:12.5px;font-weight:500;color:var(--avx-label,#13233c)}
.avonix-form .avx-budget-total{display:flex;justify-content:space-between;gap:12px;margin-top:8px;padding-top:8px;border-top:1px solid var(--avx-input-border,#dbe1ea);font-size:13px;font-weight:700;color:var(--avx-input-focus-border,#ff6600)}
.avx-success{position:relative;overflow:hidden;padding:28px 22px;border-radius:16px;background:linear-gradient(180deg,#ecfdf5 0%,#fff 55%);border:1px solid #a7f3d0;color:#065f46;font-family:var(--avx-font,system-ui,sans-serif);box-shadow:0 12px 40px rgba(11,30,58,.08)}
.avx-success--animated{animation:avx-success-in .45s ease both}
@keyframes avx-success-in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
.avx-success-badge{width:44px;height:44px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:#059669;color:#fff;font-size:22px;font-weight:700;margin-bottom:14px}
.avx-success-title{margin:0 0 8px;font-size:22px;line-height:1.25;font-weight:800;color:#064e3b}
.avx-success-sub{margin:0 0 18px;font-size:14px;line-height:1.5;color:#047857;font-weight:500}
.avx-success-next{margin-top:8px}
.avx-success-next-title{margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#059669}
.avx-success-timeline{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.avx-success-timeline li{display:flex;gap:12px;align-items:flex-start}
.avx-success-num{flex-shrink:0;width:24px;height:24px;border-radius:999px;background:#d1fae5;color:#065f46;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}
.avx-success-timeline strong{display:block;font-size:13.5px;color:#064e3b}
.avx-success-timeline span{display:block;margin-top:2px;font-size:12.5px;color:#047857;font-weight:500}
.avx-success-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.avx-success-btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;border:1px solid #a7f3d0;color:#065f46;background:#fff}
.avx-success-btn--primary{background:#059669;border-color:#059669;color:#fff}
.avx-success-redirect{margin:14px 0 0;font-size:12px;font-weight:600;color:#047857}
.avx-confetti{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.avonix-success{padding:14px 16px;border-radius:10px;background:#ecfdf5;color:#047857;font-weight:600}
.avx-trust{margin:16px auto;padding:16px;max-width:min(var(--avx-form-width,640px),var(--avx-form-max,640px));border:1px solid var(--avx-input-border,#e6e9f0);border-radius:14px;background:var(--avx-upload-bg,#f8fafc);font-family:var(--avx-font,system-ui,sans-serif);color:var(--avx-label,#13233c);box-sizing:border-box}
.avx-trust-title{margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--avx-text-muted,#5b6b83);text-align:center}
.avx-trust-rating{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;font-size:13px;font-weight:600}
.avx-trust-stars{color:#f59e0b;letter-spacing:1px}
.avx-trust-logos{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 16px;margin-bottom:14px}
.avx-trust-logo{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:6px 10px;border-radius:8px;background:var(--avx-input-bg,#fff);border:1px solid var(--avx-input-border,#e6e9f0);color:var(--avx-text-muted,#5b6b83);font-size:12px;font-weight:700;text-decoration:none}
.avx-trust-logo img{max-height:28px;max-width:96px;object-fit:contain}
.avx-trust-quotes{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}
.avx-trust-quote{margin:0;padding:12px;border-radius:12px;background:var(--avx-input-bg,#fff);border:1px solid var(--avx-input-border,#e6e9f0)}
.avx-trust-quote p{margin:0 0 8px;font-size:13.5px;line-height:1.45;font-style:italic}
.avx-trust-quote footer{font-size:12px;font-weight:600;color:var(--avx-text-muted,#5b6b83)}
.avx-trust-badges{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:12px}
.avx-trust-badge{display:inline-flex;align-items:center;gap:4px;padding:6px 10px;border-radius:999px;background:rgba(5,150,105,.08);color:#065f46;font-size:12px;font-weight:700}
.avx-trust-legal{border-top:1px solid var(--avx-input-border,#e6e9f0);padding-top:10px;font-size:12px;line-height:1.45;color:var(--avx-text-muted,#5b6b83)}
.avx-trust-legal p{margin:0 0 6px}
.avx-trust-legal a{color:var(--avx-input-focus-border,#ff6600);font-weight:600}
.avonix-form .avx-control{display:flex;flex-direction:column;gap:6px;min-width:0;width:100%}
.avonix-form .avx-label-row{display:flex;align-items:center;gap:6px;margin-bottom:var(--avx-label-mb,6px)}
.avonix-form .avx-label-row .avx-label-text{margin-bottom:0}
.avonix-form .avx-label-left{display:grid;grid-template-columns:minmax(5.5rem,28%) minmax(0,1fr);gap:8px 14px;align-items:start}
.avonix-form .avx-label-left>.avx-label-row{margin-bottom:0;padding-top:calc(var(--avx-pad-y,10px) * .35)}
.avonix-form .avx-label-right{display:grid;grid-template-columns:minmax(0,1fr) minmax(5.5rem,28%);gap:8px 14px;align-items:start}
.avonix-form .avx-label-right>.avx-label-row{order:2;margin-bottom:0;padding-top:calc(var(--avx-pad-y,10px) * .35)}
.avonix-form .avx-label-right>.avx-control{order:1}
.avonix-form .avx-label-hidden>.avx-label-row{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.avonix-form .avx-sticky{position:sticky;top:12px;z-index:2}
.avonix-form .avx-align-start{justify-self:start;width:auto;max-width:100%}
.avonix-form .avx-align-center{justify-self:center;width:auto;max-width:100%}
.avonix-form .avx-align-end{justify-self:end;width:auto;max-width:100%}
.avonix-form .avx-desc{margin:0;font-size:12px;line-height:1.4;color:var(--avx-text-muted,#5b6b83)}
.avonix-form .avx-desc-info{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:999px;background:#f1f4f8;color:var(--avx-text-muted,#5b6b83);font-size:11px;cursor:help;flex-shrink:0}
.avonix-form .avx-desc-acc{font-size:12px;color:var(--avx-text-muted,#5b6b83)}
.avonix-form .avx-desc-acc summary{cursor:pointer;font-weight:600;color:var(--avx-label,#13233c)}
.avonix-form .avx-desc-acc p{margin:6px 0 0}
.avonix-form[data-ph-mode="disabled"] input::placeholder,.avonix-form[data-ph-mode="disabled"] textarea::placeholder{opacity:0;color:transparent}
.avonix-form .avx-float:focus-within>.avx-float-label{color:var(--avx-input-focus-border,#ff6600)}
.avonix-form .avx-float--animate>.avx-float-label{left:var(--avx-pad-x,12px);top:50%;transform:translateY(-50%);padding:0;background:transparent;color:var(--avx-ph-color,#8b98ab);font-size:var(--avx-ph-size,14px);font-weight:400}
.avonix-form .avx-float--animate:has(textarea)>.avx-float-label{top:var(--avx-pad-y,10px);transform:none}
.avonix-form .avx-float--animate>input::placeholder,.avonix-form .avx-float--animate>textarea::placeholder,.avonix-form .avx-float--animate .avx-control>input::placeholder,.avonix-form .avx-float--animate .avx-control>textarea::placeholder{color:transparent;opacity:0}
.avonix-form .avx-float--animate:focus-within>.avx-float-label,.avonix-form .avx-float--animate:has(input:not(:placeholder-shown))>.avx-float-label,.avonix-form .avx-float--animate:has(textarea:not(:placeholder-shown))>.avx-float-label,.avonix-form .avx-float--animate:has(select option:checked:not([value=""]))>.avx-float-label{left:10px;top:0;transform:translateY(-50%);padding:0 6px;background:var(--avx-input-bg,#fff);color:var(--avx-label,#13233c);font-size:var(--avx-label-size,13px);font-weight:var(--avx-label-weight,600)}
.avonix-form .avx-float--animate:focus-within>.avx-float-label{color:var(--avx-input-focus-border,#ff6600)}
.avonix-form[data-label-style="floating"] .avx-float{display:block}
.avonix-form .avx-full{grid-column:1/-1}
.avonix-form .avx-section{grid-column:1/-1;font-weight:var(--avx-section-weight,700);font-size:var(--avx-section-size,14px);color:var(--avx-label,#13233c);margin-block:var(--avx-section-my,8px);padding-block:var(--avx-section-py,6px);border-bottom:var(--avx-section-bw,1px) solid var(--avx-section-border,#e6e9f0)}
.avonix-form .avx-section--nodivider{border-bottom:0}
.avonix-form .avx-row{grid-column:1/-1;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:var(--avx-row-gap,12px) var(--avx-col-gap,12px);align-items:start;width:100%}
.avonix-form .avx-row--flex{display:flex;flex-wrap:wrap;grid-template-columns:none;align-items:stretch}
.avonix-form .avx-row--flex.avx-row--nowrap{flex-wrap:nowrap}
.avonix-form .avx-row--flex>.avx-col,.avonix-form .avx-row--flex>.avx-box{grid-column:auto;flex:1 1 calc(var(--avx-span,12)/12*100%);max-width:calc(var(--avx-span,12)/12*100%);min-width:min(100%,3.5rem);width:auto;box-sizing:border-box}
.avonix-form .avx-row--flex>.avx-full{flex:1 1 100%;max-width:100%}
.avonix-form .avx-row--equal{align-items:stretch}
.avonix-form .avx-row-y-start{align-items:start}
.avonix-form .avx-row-y-center{align-items:center}
.avonix-form .avx-row-y-end{align-items:end}
.avonix-form .avx-row-y-stretch{align-items:stretch}
.avonix-form .avx-row-x-start{justify-items:start}
.avonix-form .avx-row-x-center{justify-items:center}
.avonix-form .avx-row-x-end{justify-items:end}
.avonix-form .avx-row-x-stretch{justify-items:stretch}
.avonix-form .avx-row--flex.avx-row-x-start{justify-content:flex-start;justify-items:unset}
.avonix-form .avx-row--flex.avx-row-x-center{justify-content:center;justify-items:unset}
.avonix-form .avx-row--flex.avx-row-x-end{justify-content:flex-end;justify-items:unset}
.avonix-form .avx-row--flex.avx-row-x-stretch{justify-content:space-between;justify-items:unset}
.avonix-form .avx-box{box-sizing:border-box;transition:box-shadow .15s ease,transform .15s ease,border-color .15s ease,background .15s ease}
.avonix-form .avx-box--card{padding:14px;border:1px solid var(--avx-input-border,#dbe1ea);border-radius:12px;background:var(--avx-input-bg,#fff);box-shadow:0 4px 14px rgba(11,30,58,.05)}
.avonix-form .avx-box--glass{padding:14px;border:1px solid rgba(255,255,255,.45);border-radius:14px;background:rgba(255,255,255,.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 8px 24px rgba(11,30,58,.08)}
.avonix-form .avx-box--border{padding:12px;border:1px solid var(--avx-input-border,#dbe1ea);border-radius:10px;background:transparent}
.avonix-form .avx-box--shadow{padding:14px;border-radius:12px;background:var(--avx-input-bg,#fff);box-shadow:0 10px 28px rgba(11,30,58,.1)}
.avonix-form .avx-box--hover:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(11,30,58,.12);border-color:var(--avx-input-focus-border,#ff6600)}
.avonix-form .avx-sec-block{grid-column:1/-1;margin-block:6px}
.avonix-form .avx-sec-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border:1px solid var(--avx-input-border,#dbe1ea);border-radius:10px;background:var(--avx-upload-bg,#f8fafc);font:inherit;font-weight:700;color:var(--avx-label,#13233c);cursor:pointer;text-align:left}
.avonix-form .avx-sec-block[data-collapsed="0"] .avx-sec-toggle{border-color:rgba(255,102,0,.35);background:rgba(255,102,0,.06)}
.avonix-form .avx-sec-chevron{transition:transform .15s ease}
.avonix-form .avx-sec-block[data-collapsed="1"] .avx-sec-chevron{transform:rotate(-90deg)}
.avonix-form .avx-sec-body{display:grid;gap:var(--avx-row-gap,12px) var(--avx-col-gap,12px);grid-template-columns:repeat(12,minmax(0,1fr));padding-top:10px}
.avonix-form input,.avonix-form select,.avonix-form textarea{width:100%;min-height:var(--avx-input-h,42px);box-sizing:border-box;padding:var(--avx-pad-y,10px) var(--avx-pad-x,12px);border:var(--avx-input-bw,1px) solid var(--avx-input-border,#dbe1ea);border-radius:var(--avx-radius,8px);background:var(--avx-input-bg,#fff);color:var(--avx-input-text,#13233c);font-family:var(--avx-font,system-ui,sans-serif);font-size:var(--avx-font-size,14px);font-weight:inherit;box-shadow:var(--avx-input-shadow,none);transition:border-color var(--avx-input-transition,150ms),box-shadow var(--avx-input-transition,150ms),background var(--avx-input-transition,150ms)}
.avonix-form input::placeholder,.avonix-form textarea::placeholder{color:var(--avx-ph-color,#8b98ab);opacity:var(--avx-ph-opacity,1);font-size:var(--avx-ph-size,14px);font-style:var(--avx-ph-style,normal)}
.avonix-form input:hover,.avonix-form select:hover,.avonix-form textarea:hover{border-color:var(--avx-input-hover-border,#c3ccd9)}
.avonix-form input:focus,.avonix-form select:focus,.avonix-form textarea:focus{outline:0;border-color:var(--avx-input-focus-border,#ff6600);box-shadow:var(--avx-input-focus-shadow,0 0 0 3px rgba(255,102,0,.15))}
.avonix-form .avx-nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px;justify-content:flex-start}
.avonix-form .avx-nav button{padding:var(--avx-btn-py,10px) var(--avx-btn-px,16px);border-radius:var(--avx-btn-radius,8px);border:0;font-weight:var(--avx-btn-weight,600);cursor:pointer;font-family:inherit;font-size:var(--avx-btn-size,14px);width:auto;box-shadow:var(--avx-btn-shadow,none);transition:filter .15s ease}
.avonix-form .avx-next{background:var(--avx-next-bg,#ff6600);color:var(--avx-next-text,#fff)}
.avonix-form .avx-submit{background:var(--avx-btn-bg,#ff6600);color:var(--avx-btn-text,#fff);width:var(--avx-btn-width,auto);margin-left:var(--avx-btn-ml,0);margin-right:var(--avx-btn-mr,0)}
.avonix-form .avx-prev{background:var(--avx-prev-bg,#f1f4f8);color:var(--avx-prev-text,#13233c)}
.avonix-form .avx-reset{background:var(--avx-reset-bg,transparent);color:var(--avx-reset-text,#5b6b83);border:1px solid var(--avx-border,#dbe1ea)}
.avonix-form .avx-draft{background:var(--avx-draft-bg,#0b1e3a);color:var(--avx-draft-text,#fff)}
.avonix-form .avx-nav button:hover{filter:brightness(.96)}
.avonix-form .avx-upload{position:relative;grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:var(--avx-upload-pad,20px);border:var(--avx-upload-bw,1px) var(--avx-upload-bs,dashed) var(--avx-upload-border,#dbe1ea);border-radius:var(--avx-upload-radius,10px);background:var(--avx-upload-bg,#f8fafc);color:var(--avx-text-muted,#5b6b83);cursor:pointer;text-align:center}
.avonix-form .avx-upload:hover{background:var(--avx-upload-hover,#f1f4f8)}
.avonix-form .avx-upload[data-drag="1"]{background:var(--avx-upload-drag,rgba(255,102,0,.06))}
.avonix-form .avx-upload-label{font-weight:600;font-size:13px;color:var(--avx-label,#13233c)}
.avonix-form .avx-upload-hint{font-size:11.5px}
.avonix-form .avx-upload-input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.avonix-form .avx-upload-previews{width:100%;display:flex;flex-direction:column;gap:8px;margin-top:8px;text-align:left}
.avonix-form .avx-upload-row{display:flex;align-items:center;gap:10px;padding:8px;border:1px solid var(--avx-input-border,#dbe1ea);border-radius:8px;background:var(--avx-input-bg,#fff)}
.avonix-form .avx-upload-thumb{width:56px;height:56px;object-fit:cover;border-radius:6px}
.avonix-form .avx-upload-pdf{width:56px;height:64px;border:1px solid var(--avx-border,#e6e9f0);border-radius:6px}
.avonix-form .avx-upload-badge{width:56px;height:56px;display:flex;align-items:center;justify-content:center;background:#f1f4f8;border-radius:6px;font-size:10px;font-weight:700}
.avonix-form .avx-upload-meta{font-size:12px;color:var(--avx-input-text,#13233c);word-break:break-all}
.avonix-form .avx-upload-error{width:100%;margin:0;font-size:12px;font-weight:600;color:var(--avx-danger,#dc2626);text-align:left}
.avonix-form .avx-rating{display:flex;gap:4px;font-size:var(--avx-rating-size,28px);line-height:1;color:var(--avx-rating-off,#dbe1ea)}
.avonix-form .avx-rating button{background:0;border:0;padding:0;cursor:pointer;color:inherit;font-size:inherit}
.avonix-form .avx-rating button[data-on="1"]{color:var(--avx-rating-on,#f59e0b)}
.avonix-form .avx-appt{display:flex;flex-direction:column;gap:12px;width:100%}
.avonix-form .avx-appt-cal{border:1px solid var(--avx-input-border,#dbe1ea);border-radius:10px;padding:12px;background:var(--avx-input-bg,#fff)}
.avonix-form .avx-appt-nav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;font-weight:700;font-size:13px;color:var(--avx-label,#13233c)}
.avonix-form .avx-appt-nav button{border:0;background:transparent;font-size:18px;line-height:1;cursor:pointer;color:var(--avx-text-muted,#5b6b83);padding:4px 8px;border-radius:6px}
.avonix-form .avx-appt-nav button:hover{background:#f1f4f8}
.avonix-form .avx-appt-dows,.avonix-form .avx-appt-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center}
.avonix-form .avx-appt-dows{margin-bottom:4px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--avx-text-muted,#5b6b83)}
.avonix-form .avx-appt-day{aspect-ratio:1;border:0;border-radius:8px;background:transparent;font:inherit;font-size:12.5px;font-weight:600;color:var(--avx-input-text,#13233c);cursor:pointer}
.avonix-form .avx-appt-day:hover:not(:disabled){background:#f1f4f8}
.avonix-form .avx-appt-day[data-on="1"]{background:var(--avx-btn-bg,#ff6600);color:var(--avx-btn-text,#fff)}
.avonix-form .avx-appt-day:disabled{color:#c5ccd8;cursor:not-allowed}
.avonix-form .avx-appt-slots-label{margin:0;font-size:11.5px;font-weight:600;color:var(--avx-text-muted,#5b6b83)}
.avonix-form .avx-appt-slots{display:flex;flex-wrap:wrap;gap:6px}
.avonix-form .avx-appt-slot{border:1px solid var(--avx-input-border,#dbe1ea);border-radius:8px;background:var(--avx-input-bg,#fff);padding:7px 10px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;color:var(--avx-input-text,#13233c)}
.avonix-form .avx-appt-slot:hover:not(:disabled){border-color:var(--avx-input-focus-border,#ff6600)}
.avonix-form .avx-appt-slot[data-on="1"]{background:var(--avx-btn-bg,#ff6600);border-color:var(--avx-btn-bg,#ff6600);color:var(--avx-btn-text,#fff)}
.avonix-form .avx-appt-slot:disabled{opacity:.45;cursor:not-allowed}
.avonix-form .avx-appt-tz{display:flex;flex-direction:column;gap:6px;font-size:11.5px;font-weight:600;color:var(--avx-text-muted,#5b6b83)}
.avonix-form .avx-appt-tz-select{font-weight:400;width:100%}
.avonix-form .avx-appt-summary{margin:0;padding:8px 12px;border-radius:8px;background:#fff8f3;color:var(--avx-input-focus-border,#ff6600);font-size:12.5px;font-weight:700}
.avonix-form .avx-signature{width:100%;height:var(--avx-sig-h,160px);background:var(--avx-sig-bg,#fff);border:var(--avx-sig-bw,1px) solid var(--avx-sig-border,#dbe1ea);border-radius:var(--avx-radius,8px);touch-action:none;cursor:crosshair}
.avonix-form .avx-toggle{appearance:none;width:calc(var(--avx-toggle-size,22px)*1.8);height:var(--avx-toggle-size,22px);border-radius:999px;background:var(--avx-toggle-inactive,#c3ccd9);position:relative;cursor:pointer;border:0;vertical-align:middle}
.avonix-form .avx-toggle:checked{background:var(--avx-toggle-active,#ff6600)}
.avonix-form .avx-toggle::after{content:"";position:absolute;top:2px;left:2px;width:calc(var(--avx-toggle-size,22px) - 4px);height:calc(var(--avx-toggle-size,22px) - 4px);border-radius:999px;background:var(--avx-toggle-thumb,#fff);transition:transform .15s ease}
.avonix-form .avx-toggle:checked::after{transform:translateX(calc(var(--avx-toggle-size,22px)*.8))}
.avonix-form input[type="range"]{accent-color:var(--avx-range-active,#ff6600);width:100%}
.avonix-form input[type="checkbox"]{accent-color:var(--avx-check-on,#ff6600);width:var(--avx-check-size,18px);height:var(--avx-check-size,18px)}
.avonix-form input[type="radio"]{accent-color:var(--avx-radio-on,#ff6600);width:var(--avx-radio-size,18px);height:var(--avx-radio-size,18px)}
.avonix-form select{background:var(--avx-dd-bg,#fff);border-color:var(--avx-dd-border,#dbe1ea);border-radius:var(--avx-dd-radius,8px)}
.avonix-form .avx-select-search{width:100%;margin-bottom:6px;min-height:36px;padding:8px 12px;border:1px solid var(--avx-input-border,#dbe1ea);border-radius:var(--avx-radius,8px);background:var(--avx-input-bg,#fff);font:inherit;font-size:13px}
.avonix-form .avx-multiselect{display:flex;flex-direction:column;gap:8px}
.avonix-form .avx-ms-item{display:flex;align-items:center;gap:8px;font-weight:400;font-size:var(--avx-font-size,14px);color:var(--avx-input-text,#13233c)}
.avonix-form .avx-choices{display:flex;flex-direction:column;gap:var(--avx-choice-gap,8px);width:100%}
.avonix-form .avx-choices--horizontal,.avonix-form .avx-choices--inline{flex-direction:row;flex-wrap:nowrap;align-items:stretch;overflow-x:auto}
.avonix-form .avx-choices--wrap{flex-direction:row;flex-wrap:wrap}
.avonix-form .avx-choices--grid{display:grid;grid-template-columns:repeat(var(--avx-choice-cols,2),minmax(0,1fr))}
.avonix-form .avx-choices--masonry{display:columns;columns:var(--avx-choice-cols,2);column-gap:var(--avx-choice-gap,8px)}
.avonix-form .avx-choices--masonry .avx-choice{break-inside:avoid;margin-bottom:var(--avx-choice-gap,8px);display:inline-flex;width:100%}
.avonix-form .avx-choice{position:relative;display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-weight:400;color:var(--avx-input-text,#13233c);margin:0}
.avonix-form .avx-choice>input{position:absolute;opacity:0;pointer-events:none}
.avonix-form .avx-choices--default .avx-choice>input{position:static;opacity:1;pointer-events:auto;margin-top:2px}
.avonix-form .avx-choice-body{display:flex;flex-direction:column;gap:6px;width:100%;min-width:0}
.avonix-form .avx-choice-text{display:flex;flex-direction:column;gap:2px;min-width:0}
.avonix-form .avx-choice-title{font-size:13.5px;font-weight:600;line-height:1.3}
.avonix-form .avx-choice-desc{font-size:12px;color:var(--avx-text-muted,#5b6b83);line-height:1.35}
.avonix-form .avx-choice-price{font-size:13px;font-weight:700;color:var(--avx-input-focus-border,#ff6600)}
.avonix-form .avx-choice-icon{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:#f1f4f8;font-size:20px}
.avonix-form .avx-choice-img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:8px;background:#f1f4f8}
.avonix-form .avx-choices--button .avx-choice,.avonix-form .avx-choices--select-chips .avx-choice,.avonix-form .avx-choices--select-tags .avx-choice{align-items:center;padding:8px 14px;border:1px solid var(--avx-input-border,#dbe1ea);border-radius:999px;background:var(--avx-input-bg,#fff)}
.avonix-form .avx-choices--select-tags .avx-choice{border-radius:8px}
.avonix-form .avx-choices--tile .avx-choice,.avonix-form .avx-choices--card .avx-choice,.avonix-form .avx-choices--image .avx-choice,.avonix-form .avx-choices--icon .avx-choice,.avonix-form .avx-choices--pricing .avx-choice,.avonix-form .avx-choices--service .avx-choice,.avonix-form .avx-choices--product .avx-choice{padding:12px;border:1px solid var(--avx-input-border,#dbe1ea);border-radius:12px;background:var(--avx-input-bg,#fff);transition:border-color .15s ease,box-shadow .15s ease,background .15s ease}
.avonix-form .avx-choices--icon .avx-choice-body{flex-direction:row;align-items:center;gap:10px}
.avonix-form .avx-choices--button .avx-choice:has(input:checked),.avonix-form .avx-choices--select-chips .avx-choice:has(input:checked),.avonix-form .avx-choices--select-tags .avx-choice:has(input:checked),.avonix-form .avx-choice.is-on,.avonix-form .avx-choices--tile .avx-choice:has(input:checked),.avonix-form .avx-choices--card .avx-choice:has(input:checked),.avonix-form .avx-choices--image .avx-choice:has(input:checked),.avonix-form .avx-choices--icon .avx-choice:has(input:checked),.avonix-form .avx-choices--pricing .avx-choice:has(input:checked),.avonix-form .avx-choices--service .avx-choice:has(input:checked),.avonix-form .avx-choices--product .avx-choice:has(input:checked){border-color:var(--avx-input-focus-border,#ff6600);box-shadow:0 0 0 3px rgba(255,102,0,.12);background:rgba(255,102,0,.04)}
.avonix-form .avx-choices--button .avx-choice-label,.avonix-form .avx-choices--select-chips .avx-choice-label,.avonix-form .avx-choices--select-tags .avx-choice-label{font-size:13px;font-weight:600}
.avonix-form .avx-recaptcha{grid-column:1/-1;padding:10px;border:1px dashed var(--avx-border,#dbe1ea);border-radius:var(--avx-radius,8px);color:var(--avx-text-muted,#5b6b83);font-size:12px;text-align:center}
.avonix-form .avx-captcha{grid-column:1/-1;margin:4px 0 8px;min-height:65px}
.avonix-form .avx-otp{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px;margin:4px 0 10px;padding:12px;border:1px solid var(--avx-input-border,#dbe1ea);border-radius:10px;background:var(--avx-upload-bg,#f8fafc)}
.avonix-form .avx-otp-label{flex:1 1 160px;display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:600;color:var(--avx-label,#13233c)}
.avonix-form .avx-otp-input{font:inherit;font-weight:500;padding:10px 12px;border:1px solid var(--avx-input-border,#dbe1ea);border-radius:8px;background:var(--avx-input-bg,#fff)}
.avonix-form .avx-otp-send{padding:10px 14px;border:0;border-radius:8px;background:var(--avx-btn-bg,#ff6600);color:var(--avx-btn-text,#fff);font-weight:600;cursor:pointer}
.avonix-form .avx-otp-msg{flex:1 1 100%;margin:0;font-size:12px;color:var(--avx-text-muted,#5b6b83)}
.avonix-form .avx-ai-rewrite-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:6px 0 2px}
.avonix-form .avx-ai-rewrite{padding:6px 10px;border:1px solid var(--avx-input-border,#dbe1ea);border-radius:8px;background:var(--avx-upload-bg,#f8fafc);color:var(--avx-label,#13233c);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.avonix-form .avx-ai-rewrite:disabled{opacity:.6;cursor:wait}
.avonix-form .avx-ai-rewrite-status{font-size:12px;color:var(--avx-text-muted,#5b6b83)}
.avonix-form .avx-roi{display:grid;gap:10px;padding:12px;border:1px solid var(--avx-input-border,#dbe1ea);border-radius:12px;background:var(--avx-upload-bg,#f8fafc)}
.avonix-form .avx-roi-field{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:600;color:var(--avx-label,#13233c)}
.avonix-form .avx-roi-field input{font:inherit;font-weight:500;padding:10px 12px;border:1px solid var(--avx-input-border,#dbe1ea);border-radius:8px;background:var(--avx-input-bg,#fff)}
.avonix-form .avx-roi-result{margin:0;font-size:13px;font-weight:600;color:var(--avx-text,#13233c)}
.avonix-form .avx-success-portal{margin-top:14px}
.avonix-form .avx-success-portal-label{margin:0 0 8px;font-size:12.5px;font-weight:600;color:var(--avx-text-muted,#5b6b83)}
.avonix-form .avx-success-brand{margin:14px 0 0;font-size:12px;color:var(--avx-text-muted,#5b6b83)}
.avonix-form [data-avx-hidden="1"]{display:none!important}
.avonix-form.avx-chrome-sidebar{display:grid;grid-template-columns:minmax(140px,200px) minmax(0,1fr);gap:16px;align-items:start}
.avonix-form.avx-chrome-sidebar .avx-progress{grid-column:1;grid-row:1/span 3;position:sticky;top:12px}
.avonix-form.avx-chrome-sidebar .avx-body,.avonix-form.avx-chrome-sidebar .avx-nav{grid-column:2}
.avonix-form .avx-progress{margin-bottom:14px}
.avonix-form .avx-progress-track{height:var(--avx-progress-h,4px);background:var(--avx-progress-pending,#e6e9f0);border-radius:999px;overflow:hidden}
.avonix-form .avx-progress-fill{height:100%;width:0;background:var(--avx-progress-active,#ff6600);transition:width .25s ease}
.avonix-form .avx-progress-percentage{display:flex;align-items:center;gap:10px}
.avonix-form .avx-progress-pct{font-size:12px;font-weight:600;color:var(--avx-label,#13233c);min-width:2.5rem}
.avonix-form .avx-progress-number{display:flex;flex-wrap:wrap;gap:8px}
.avonix-form .avx-progress-num{display:inline-flex;flex-direction:column;align-items:center;gap:4px;min-width:2rem;font-size:12px;font-weight:700;color:var(--avx-progress-pending,#c3ccd9)}
.avonix-form .avx-progress-num small{font-size:10px;font-weight:500;max-width:4.5rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.avonix-form .avx-progress-num[data-state="active"],.avonix-form .avx-progress-num[data-state="done"]{color:var(--avx-progress-active,#ff6600)}
.avonix-form .avx-progress-circle{display:flex;gap:8px;align-items:center}
.avonix-form .avx-progress-dot{width:10px;height:10px;border-radius:999px;background:var(--avx-progress-pending,#dbe1ea)}
.avonix-form .avx-progress-dot[data-state="active"]{background:var(--avx-progress-active,#ff6600);transform:scale(1.2)}
.avonix-form .avx-progress-dot[data-state="done"]{background:var(--avx-progress-done,#22c55e)}
.avonix-form.avx-sticky-progress .avx-progress{position:sticky;top:0;z-index:5;padding:8px 0;background:var(--avx-form-bg,#fff)}
.avonix-form .avx-draft-banner{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;margin-bottom:4px;border-radius:10px;border:1px solid #fde68a;background:#fffbeb;color:#92400e;font-size:13px;font-weight:600}
.avonix-form .avx-draft-banner[hidden]{display:none!important}
.avonix-form .avx-draft-banner-text{flex:1;min-width:10rem}
.avonix-form .avx-draft-resume,.avonix-form .avx-draft-discard{border:1px solid #f59e0b;background:#fff;color:#92400e;border-radius:8px;padding:6px 10px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.avonix-form .avx-draft{background:var(--avx-draft-bg,#0b1e3a);color:var(--avx-draft-text,#fff);border:0;border-radius:var(--avx-btn-radius,8px);padding:10px 14px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.avonix-form .avx-dark-toggle{background:transparent;border:1px solid var(--avx-input-border,#dbe1ea);color:var(--avx-label,#13233c);border-radius:var(--avx-btn-radius,8px);padding:10px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.avonix-form.avx-a11y-focus :focus-visible{outline:3px solid var(--avx-input-focus-border,#ff6600);outline-offset:2px}
.avonix-form.avx-a11y-contrast{--avx-label:#000;--avx-type-color:#000;--avx-input-text:#000;--avx-input-border:#111;--avx-text-muted:#222}
.avonix-form.avx-a11y-scale{font-size:calc(var(--avx-font-size,14px) * 1.08)}
.avonix-form.avx-dark,.avonix-form.avx-dark-auto{--avx-form-bg:#0f172a;--avx-label:#e2e8f0;--avx-type-color:#e2e8f0;--avx-input-bg:#1e293b;--avx-input-text:#f8fafc;--avx-input-border:#334155;--avx-text-muted:#94a3b8;--avx-upload-bg:#1e293b;color:var(--avx-type-color);background:var(--avx-form-bg)}
@media (prefers-color-scheme: dark){
  .avonix-form.avx-dark-auto{--avx-form-bg:#0f172a;--avx-label:#e2e8f0;--avx-type-color:#e2e8f0;--avx-input-bg:#1e293b;--avx-input-text:#f8fafc;--avx-input-border:#334155;--avx-text-muted:#94a3b8;--avx-upload-bg:#1e293b;color:var(--avx-type-color);background:var(--avx-form-bg)}
}
@media (max-width:640px){
  .avonix-form{padding:var(--avx-container-pad,12px);max-width:100%}
  .avonix-form .avx-nav{flex-wrap:wrap;gap:8px}
  .avonix-form .avx-nav button,.avonix-form .avx-nav .avx-submit{min-height:44px;flex:1 1 auto}
  .avonix-form .avx-progress-number{overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px}
  .avonix-form .avx-col{grid-column:1/-1!important}
}
@media (prefers-reduced-motion:reduce){
  .avonix-form *,.avx-success--animated{animation:none!important;transition:none!important}
}
.avonix-form.avx-mode-card .avx-card-step{padding:16px;border:1px solid var(--avx-input-border,#dbe1ea);border-radius:var(--avx-container-radius,12px);background:var(--avx-input-bg,#fff);box-shadow:0 8px 24px rgba(11,30,58,.06)}
.avonix-form.avx-mode-conversational .avx-conv-item{min-height:4.5rem}
.avonix-form.avx-mode-accordion .avx-acc{border:1px solid var(--avx-input-border,#dbe1ea);border-radius:10px;overflow:hidden;margin-bottom:8px}
.avonix-form.avx-mode-accordion .avx-acc-head{width:100%;text-align:left;padding:12px 14px;border:0;background:var(--avx-upload-bg,#f8fafc);font:inherit;font-weight:600;cursor:pointer;color:var(--avx-label,#13233c)}
.avonix-form.avx-mode-accordion .avx-acc[data-open="1"] .avx-acc-head{background:rgba(255,102,0,.08);color:var(--avx-input-focus-border,#ff6600)}
.avonix-form.avx-mode-accordion .avx-acc-body{padding:12px 14px;display:grid;gap:var(--avx-row-gap,12px) var(--avx-col-gap,12px);grid-template-columns:repeat(12,minmax(0,1fr))}
.avonix-form[data-preset="glass"]{box-shadow:0 20px 50px rgba(11,30,58,.12),inset 0 1px 0 rgba(255,255,255,.65)}
.avonix-form[data-preset="glass"] input,.avonix-form[data-preset="glass"] select,.avonix-form[data-preset="glass"] textarea{backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.avonix-form[data-preset="glass"] .avx-submit,.avonix-form[data-preset="glass"] .avx-next{box-shadow:0 8px 20px rgba(14,165,233,.28)}
.avonix-form[data-preset="material"] input,.avonix-form[data-preset="material"] select,.avonix-form[data-preset="material"] textarea{border:0;border-bottom:2px solid #cac4d0;border-radius:4px 4px 0 0;box-shadow:none}
.avonix-form[data-preset="material"] input:focus,.avonix-form[data-preset="material"] select:focus,.avonix-form[data-preset="material"] textarea:focus{border-bottom-color:var(--avx-input-focus-border,#6750a4);box-shadow:none;background:#e8def8}
.avonix-form[data-preset="material"] .avx-submit,.avonix-form[data-preset="material"] .avx-next{letter-spacing:.02em;text-transform:uppercase;font-size:12.5px}
.avx-mount{position:relative}
.avx-mount-open{padding:10px 16px;border:0;border-radius:8px;background:var(--avx-btn-bg,#ff6600);color:var(--avx-btn-text,#fff);font-weight:600;cursor:pointer}
.avx-mount-shell{position:relative}
.avx-mount-close{position:absolute;top:8px;right:10px;z-index:5;width:32px;height:32px;border:0;border-radius:8px;background:rgba(11,30,58,.06);font-size:20px;line-height:1;cursor:pointer}
.avx-mount-popup[data-open="1"],.avx-mount-fullscreen[data-open="1"]{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(11,30,58,.45);padding:16px}
.avx-mount-popup .avx-mount-shell,.avx-mount-fullscreen .avx-mount-shell{background:#fff;border-radius:16px;padding:28px 24px 20px;max-height:min(92vh,880px);overflow:auto;width:min(100%,640px);box-shadow:0 24px 64px rgba(11,30,58,.28)}
.avx-mount-fullscreen[data-open="1"] .avx-mount-shell{width:min(100%,920px);min-height:min(88vh,720px)}
.avx-mount-slide_in[data-open="1"]{position:fixed;inset:0;z-index:9999;background:rgba(11,30,58,.35)}
.avx-mount-slide_in .avx-mount-shell{position:fixed;top:0;right:0;height:100%;width:min(100%,420px);background:#fff;padding:28px 20px 20px;overflow:auto;box-shadow:-12px 0 40px rgba(11,30,58,.18);transform:translateX(0)}
.avx-mount[data-open="0"] .avx-mount-shell{display:none}
@media (max-width:960px){.avonix-form .avx-col{grid-column:span var(--avx-span-md,var(--avx-span,12))}.avonix-form .avx-row--flex>.avx-col,.avonix-form .avx-row--flex>.avx-box{flex-basis:calc(var(--avx-span-md,var(--avx-span,12))/12*100%);max-width:calc(var(--avx-span-md,var(--avx-span,12))/12*100%)}}
@media (max-width:640px){.avonix-form .avx-col{grid-column:span var(--avx-span-sm,12)}.avonix-form .avx-row--flex>.avx-col,.avonix-form .avx-row--flex>.avx-box{flex-basis:calc(var(--avx-span-sm,12)/12*100%);max-width:calc(var(--avx-span-sm,12)/12*100%)}.avonix-form.avx-chrome-sidebar{grid-template-columns:1fr}}
${custom}`;
}
