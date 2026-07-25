/**
 * Marketplace packs + Global Style Manager (browser-local library).
 * Themes can be saved once and applied across forms in the builder.
 */
import {
  DEFAULT_THEME,
  applyPreset,
  mergeTheme,
  type FormTheme,
  type ThemePreset,
} from "./theme";

const STORAGE_KEY = "avonix.form.global-themes.v1";

export type SavedTheme = {
  id: string;
  name: string;
  updatedAt: string;
  theme: FormTheme;
};

/** Extra marketplace packs beyond the built-in Theme Presets. */
export const MARKETPLACE_PACKS: ThemePreset[] = [
  {
    id: "mp-sunset",
    label: "Sunset Agency",
    hint: "Warm coral marketplace pack",
    patch: {
      presetId: "mp-sunset",
      tokens: { ...DEFAULT_THEME.tokens, primary: "#e11d48", accent: "#fb7185" },
      buttons: {
        ...DEFAULT_THEME.buttons,
        submit: {
          ...DEFAULT_THEME.buttons.submit,
          background: "#e11d48",
          borderColor: "#e11d48",
        },
        next: {
          ...DEFAULT_THEME.buttons.next,
          background: "#e11d48",
          borderColor: "#e11d48",
        },
      },
      progress: {
        ...DEFAULT_THEME.progress,
        activeColor: "#e11d48",
        completedColor: "#e11d48",
      },
    },
  },
  {
    id: "mp-ocean",
    label: "Ocean Blue",
    hint: "Cool SaaS pack",
    patch: {
      presetId: "mp-ocean",
      tokens: { ...DEFAULT_THEME.tokens, primary: "#0284c7", accent: "#22d3ee" },
      container: {
        ...DEFAULT_THEME.container,
        borderWidth: 1,
        borderColor: "#bae6fd",
        padding: 18,
        shadow: "sm",
      },
      buttons: {
        ...DEFAULT_THEME.buttons,
        submit: {
          ...DEFAULT_THEME.buttons.submit,
          background: "#0284c7",
          borderColor: "#0284c7",
        },
        next: {
          ...DEFAULT_THEME.buttons.next,
          background: "#0284c7",
          borderColor: "#0284c7",
        },
      },
    },
  },
  {
    id: "mp-forest",
    label: "Forest",
    hint: "Green eco pack",
    patch: {
      presetId: "mp-forest",
      tokens: { ...DEFAULT_THEME.tokens, primary: "#15803d", accent: "#84cc16" },
      buttons: {
        ...DEFAULT_THEME.buttons,
        submit: {
          ...DEFAULT_THEME.buttons.submit,
          background: "#15803d",
          borderColor: "#15803d",
        },
        next: {
          ...DEFAULT_THEME.buttons.next,
          background: "#15803d",
          borderColor: "#15803d",
        },
      },
      rating: { ...DEFAULT_THEME.rating, activeColor: "#84cc16" },
    },
  },
  {
    id: "mp-mono",
    label: "Mono Editorial",
    hint: "Black & white press",
    patch: {
      presetId: "mp-mono",
      tokens: {
        ...DEFAULT_THEME.tokens,
        primary: "#111111",
        text: "#111111",
        border: "#222222",
        radius: 0,
        shadow: "none",
      },
      typography: {
        ...DEFAULT_THEME.typography,
        fontFamily: "Georgia, 'Times New Roman', serif",
      },
      input: { ...DEFAULT_THEME.input, borderRadius: 0, borderColor: "#222" },
      buttons: {
        ...DEFAULT_THEME.buttons,
        submit: {
          ...DEFAULT_THEME.buttons.submit,
          background: "#111",
          borderColor: "#111",
          borderRadius: 0,
        },
        next: {
          ...DEFAULT_THEME.buttons.next,
          background: "#111",
          borderColor: "#111",
          borderRadius: 0,
        },
        previous: {
          ...DEFAULT_THEME.buttons.previous,
          borderRadius: 0,
          background: "#f5f5f5",
          textColor: "#111",
        },
      },
    },
  },
];

export function applyMarketplacePack(id: string): FormTheme {
  const pack = MARKETPLACE_PACKS.find((p) => p.id === id);
  if (!pack) return structuredClone(DEFAULT_THEME);
  return mergeTheme({ ...(pack.patch as Partial<FormTheme>), presetId: id });
}

export function listSavedThemes(): SavedTheme[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedTheme[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveThemeToLibrary(name: string, theme: FormTheme): SavedTheme[] {
  const list = listSavedThemes();
  const entry: SavedTheme = {
    id: `theme_${Date.now().toString(36)}`,
    name: name.trim() || "Untitled theme",
    updatedAt: new Date().toISOString(),
    theme: structuredClone(theme),
  };
  const next = [entry, ...list].slice(0, 40);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteThemeFromLibrary(id: string): SavedTheme[] {
  const next = listSavedThemes().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function loadThemeFromLibrary(id: string): FormTheme | null {
  const found = listSavedThemes().find((t) => t.id === id);
  return found ? mergeTheme(found.theme) : null;
}

export function duplicateThemeInLibrary(id: string): SavedTheme[] {
  const found = listSavedThemes().find((t) => t.id === id);
  if (!found) return listSavedThemes();
  return saveThemeToLibrary(`${found.name} (copy)`, found.theme);
}

/** Apply brand kit colors onto tokens + common surfaces. */
export function applyBrandKit(theme: FormTheme): FormTheme {
  const colors = theme.brandKit.colors.filter(Boolean);
  const primary = colors[0] ?? theme.tokens.primary;
  const secondary = colors[1] ?? theme.tokens.secondary;
  const accent = colors[2] ?? theme.tokens.accent;
  const text = colors[3] ?? theme.tokens.text;
  return mergeTheme({
    ...theme,
    presetId: "custom",
    tokens: { ...theme.tokens, primary, secondary, accent, text },
    typography: {
      ...theme.typography,
      fontFamily: theme.brandKit.primaryFont || theme.typography.fontFamily,
      color: text,
    },
    labels: { ...theme.labels, color: text, requiredColor: primary },
    buttons: {
      ...theme.buttons,
      submit: {
        ...theme.buttons.submit,
        background: primary,
        borderColor: primary,
      },
      next: { ...theme.buttons.next, background: primary, borderColor: primary },
    },
    progress: {
      ...theme.progress,
      activeColor: primary,
      completedColor: primary,
    },
    checkbox: { ...theme.checkbox, checkedColor: primary },
    radio: { ...theme.radio, checkedColor: primary },
    toggle: { ...theme.toggle, activeColor: primary },
    range: { ...theme.range, activeTrackColor: primary, thumbColor: primary },
  });
}

export function resolveConditionalClasses(
  theme: FormTheme,
  values: Record<string, string>,
): string[] {
  const classes: string[] = [];
  for (const rule of theme.conditionalStyles ?? []) {
    if (!rule.fieldKey || !rule.className) continue;
    const raw = values[rule.fieldKey] ?? "";
    const filled = raw.trim().length > 0;
    let ok = false;
    switch (rule.op) {
      case "empty":
        ok = !filled;
        break;
      case "filled":
        ok = filled;
        break;
      case "eq":
        ok = raw === (rule.value ?? "");
        break;
      case "neq":
        ok = raw !== (rule.value ?? "");
        break;
    }
    if (ok) classes.push(rule.className);
  }
  return classes;
}

/** Convenience: built-in preset or marketplace pack by id. */
export function resolveThemeByPresetId(id: string): FormTheme {
  if (id.startsWith("mp-")) return applyMarketplacePack(id);
  return applyPreset(id);
}
