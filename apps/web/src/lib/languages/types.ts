/**
 * Per-website multilingual / translation settings.
 * Stored on `websites.settings.languages` (JSON).
 */

import {
  DEFAULT_LAUNCHER_METRICS,
  normalizeLauncherMetrics,
} from "@/lib/widgets/launcher-size";
import {
  DEFAULT_WIDGET_PAGE_TARGET,
  linesToExcludePaths,
  normalizeWidgetPageTarget,
  type WidgetPageTarget,
} from "@/lib/widgets/page-target";
import {
  defaultScreenPlacement,
  normalizeScreenPlacement,
  placementFromCorner,
  type ScreenPlacement,
} from "@/lib/widgets/screen-placement";

export type LanguageUrlStrategy =
  | "none"
  | "subdirectory"
  | "subdomain"
  | "query"
  | "domain";

export type LanguageSwitcherStyle = "dropdown" | "list" | "flags" | "pills";
export type LanguageSwitcherPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "menu-inline";

export type TranslationEngine = "none" | "avonix-ai" | "manual";

export type SiteLocaleCode = string;

export type SiteLocale = {
  code: SiteLocaleCode;
  /** Enabled for visitors */
  enabled: boolean;
  /** Show in switcher */
  visible: boolean;
  /** Right-to-left */
  rtl: boolean;
  /** Human label override (empty = auto) */
  label: string;
  /** Translation coverage 0–100 (editor estimate / sync) */
  coverage: number;
};

export type LanguageSurfaces = {
  forms: boolean;
  chat: boolean;
  popups: boolean;
  buttons: boolean;
  emails: boolean;
  knowledge: boolean;
  accessibilityWidget: boolean;
};

export type LanguageSeo = {
  hreflang: boolean;
  translateTitles: boolean;
  translateMeta: boolean;
  translateOpenGraph: boolean;
  xDefault: boolean;
};

export type LanguageDetection = {
  browser: boolean;
  geoIp: boolean;
  rememberChoice: boolean;
  promptOnFirstVisit: boolean;
};

export type LanguageSettings = {
  enabled: boolean;
  defaultLocale: SiteLocaleCode;
  fallbackLocale: SiteLocaleCode;
  locales: SiteLocale[];

  switcher: {
    enabled: boolean;
    style: LanguageSwitcherStyle;
    /** Legacy corner / menu — kept in sync with `placement` when floating. */
    position: LanguageSwitcherPosition;
    /** Free screen placement for the floating switcher group. */
    placement: ScreenPlacement;
    /** Launcher button fill color. */
    primaryColor: string;
    /** Icon glyph size in px. */
    iconSize: number;
    /** Inner padding around the icon in px. */
    buttonPadding: number;
    showFlags: boolean;
    showNativeNames: boolean;
    showCodes: boolean;
  };

  urlStrategy: LanguageUrlStrategy;
  engine: TranslationEngine;
  autoTranslateNew: boolean;
  glossary: string;
  neverTranslate: string;
  /** @deprecated prefer pageTarget */
  excludePaths: string;
  excludeSelectors: string;
  /** Switcher visibility on WP pages / custom URLs */
  pageTarget: WidgetPageTarget;

  surfaces: LanguageSurfaces;
  seo: LanguageSeo;
  detection: LanguageDetection;
};

/** Catalog for the add-language picker (site content, not platform UI packs). */
export const SITE_LANGUAGE_CATALOG: {
  code: string;
  name: string;
  native: string;
  flag: string;
  rtl?: boolean;
}[] = [
  { code: "en", name: "English", native: "English", flag: "🇺🇸" },
  { code: "bn", name: "Bengali", native: "বাংলা", flag: "🇧🇩" },
  { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "ur", name: "Urdu", native: "اردو", flag: "🇵🇰", rtl: true },
  { code: "ar", name: "Arabic", native: "العربية", flag: "🇸🇦", rtl: true },
  { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", native: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Portuguese", native: "Português", flag: "🇵🇹" },
  { code: "tr", name: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "zh", name: "Chinese", native: "中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", native: "한국어", flag: "🇰🇷" },
  { code: "it", name: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "nl", name: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  { code: "ru", name: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "pl", name: "Polish", native: "Polski", flag: "🇵🇱" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "Thai", native: "ไทย", flag: "🇹🇭" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "fa", name: "Persian", native: "فارسی", flag: "🇮🇷", rtl: true },
  { code: "he", name: "Hebrew", native: "עברית", flag: "🇮🇱", rtl: true },
  { code: "sv", name: "Swedish", native: "Svenska", flag: "🇸🇪" },
  { code: "uk", name: "Ukrainian", native: "Українська", flag: "🇺🇦" },
];

export function catalogEntry(code: string) {
  return SITE_LANGUAGE_CATALOG.find((l) => l.code === code);
}

export function localeDisplayName(code: string): string {
  return catalogEntry(code)?.name ?? code.toUpperCase();
}

export function localeFlag(code: string): string {
  return catalogEntry(code)?.flag ?? "🌐";
}

export function makeLocale(code: string, partial?: Partial<SiteLocale>): SiteLocale {
  const cat = catalogEntry(code);
  return {
    code,
    enabled: true,
    visible: true,
    rtl: Boolean(cat?.rtl),
    label: "",
    coverage: code === "en" ? 100 : 0,
    ...partial,
  };
}

export const DEFAULT_LANGUAGES: LanguageSettings = {
  enabled: false,
  defaultLocale: "en",
  fallbackLocale: "en",
  locales: [
    makeLocale("en", { coverage: 100 }),
    makeLocale("bn", { enabled: false, visible: false, coverage: 0 }),
  ],

  switcher: {
    enabled: true,
    style: "dropdown",
    position: "top-right",
    placement: defaultScreenPlacement("top-right", 12, 12),
    primaryColor: "#e15d1a",
    iconSize: DEFAULT_LAUNCHER_METRICS.iconSize,
    buttonPadding: DEFAULT_LAUNCHER_METRICS.buttonPadding,
    showFlags: true,
    showNativeNames: true,
    showCodes: false,
  },

  urlStrategy: "subdirectory",
  engine: "avonix-ai",
  autoTranslateNew: true,
  glossary: "",
  neverTranslate: "Avonix\nWordPress",
  excludePaths: "",
  excludeSelectors: ".no-translate\n[data-no-translate]",
  pageTarget: { ...DEFAULT_WIDGET_PAGE_TARGET },

  surfaces: {
    forms: true,
    chat: true,
    popups: true,
    buttons: true,
    emails: false,
    knowledge: true,
    accessibilityWidget: true,
  },

  seo: {
    hreflang: true,
    translateTitles: true,
    translateMeta: true,
    translateOpenGraph: false,
    xDefault: true,
  },

  detection: {
    browser: true,
    geoIp: false,
    rememberChoice: true,
    promptOnFirstVisit: false,
  },
};

export function mergeLanguageSettings(
  raw?: Partial<LanguageSettings> | null,
): LanguageSettings {
  if (!raw) return structuredClone(DEFAULT_LANGUAGES);

  const locales =
    raw.locales?.length
      ? raw.locales.map((l) => ({
          ...makeLocale(l.code),
          ...l,
        }))
      : structuredClone(DEFAULT_LANGUAGES.locales);

  const switcherRaw: Partial<LanguageSettings["switcher"]> = raw.switcher ?? {};
  const position =
    switcherRaw.position ?? DEFAULT_LANGUAGES.switcher.position;
  const fromCorner = placementFromCorner(
    position === "menu-inline" ? "top-right" : position,
    switcherRaw.placement?.offsetX,
    switcherRaw.placement?.offsetY,
  );
  const placement = normalizeScreenPlacement(
    switcherRaw.placement ?? fromCorner,
    DEFAULT_LANGUAGES.switcher.placement,
  );

  const switcherMetrics = normalizeLauncherMetrics(
    switcherRaw.iconSize != null || switcherRaw.buttonPadding != null
      ? {
          iconSize: switcherRaw.iconSize,
          buttonPadding: switcherRaw.buttonPadding,
        }
      : (switcherRaw as { launcherSize?: string }).launcherSize,
  );

  const legacyExclude = linesToExcludePaths(String(raw.excludePaths ?? ""));
  const pageTarget = normalizeWidgetPageTarget(
    raw.pageTarget ??
      (legacyExclude.length
        ? { mode: "everywhere", excludePaths: legacyExclude }
        : undefined),
  );
  if (!pageTarget.excludePaths?.length && legacyExclude.length) {
    pageTarget.excludePaths = legacyExclude;
  }

  return {
    ...DEFAULT_LANGUAGES,
    ...raw,
    locales,
    pageTarget,
    excludePaths: (pageTarget.excludePaths ?? []).join("\n"),
    switcher: {
      ...DEFAULT_LANGUAGES.switcher,
      ...switcherRaw,
      position,
      placement,
      primaryColor:
        typeof switcherRaw.primaryColor === "string" &&
        switcherRaw.primaryColor.trim()
          ? switcherRaw.primaryColor.trim()
          : DEFAULT_LANGUAGES.switcher.primaryColor,
      iconSize: switcherMetrics.iconSize,
      buttonPadding: switcherMetrics.buttonPadding,
    },
    surfaces: {
      ...DEFAULT_LANGUAGES.surfaces,
      ...(raw.surfaces ?? {}),
    },
    seo: {
      ...DEFAULT_LANGUAGES.seo,
      ...(raw.seo ?? {}),
    },
    detection: {
      ...DEFAULT_LANGUAGES.detection,
      ...(raw.detection ?? {}),
    },
  };
}

export function enabledLocales(settings: LanguageSettings): SiteLocale[] {
  return settings.locales.filter((l) => l.enabled);
}

export function averageCoverage(settings: LanguageSettings): number {
  const list = enabledLocales(settings);
  if (!list.length) return 0;
  return Math.round(
    list.reduce((sum, l) => sum + (l.coverage ?? 0), 0) / list.length,
  );
}

/** Configuration readiness 0–100 (not live translation quality). */
export function languagesScore(settings: LanguageSettings): number {
  let score = 0;
  if (settings.enabled) score += 20;

  const enabled = enabledLocales(settings);
  score += Math.min(25, enabled.length * 8);

  score += Math.round((averageCoverage(settings) / 100) * 20);

  const surfacesOn = Object.values(settings.surfaces).filter(Boolean).length;
  score += Math.round((surfacesOn / 7) * 15);

  if (settings.switcher.enabled) score += 5;
  if (settings.seo.hreflang) score += 5;
  if (settings.urlStrategy !== "none") score += 5;
  if (settings.engine !== "none") score += 5;

  return Math.min(100, score);
}
