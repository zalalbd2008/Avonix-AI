/**
 * Platform UI language options — only locales with a UI translation pack
 * (see `messages.ts`). Used by Settings → Platform Language and document `lang`.
 */

/** Locales that have UI copy in `messages.ts` (English is the base pack). */
export const ISO_639_1_CODES = [
  "ar",
  "bn",
  "de",
  "en",
  "es",
  "fr",
  "hi",
  "ja",
  "ko",
  "pt",
  "tr",
  "ur",
  "zh",
] as const;

export type PlatformLocale = (typeof ISO_639_1_CODES)[number];

const LOCALE_SET = new Set<string>(ISO_639_1_CODES);

const displayEn =
  typeof Intl !== "undefined"
    ? new Intl.DisplayNames(["en"], { type: "language" })
    : null;

function englishName(code: string): string {
  try {
    const name = displayEn?.of(code);
    if (name && name !== code) return name;
  } catch {
    /* Intl may reject rare legacy codes */
  }
  return code.toUpperCase();
}

export type PlatformLanguage = {
  value: PlatformLocale;
  label: string;
  englishName: string;
  /** Representative flag emoji for the language picker. */
  flag: string;
};

/** ISO 3166-1 alpha-2 region used for flag emoji (best-effort per language). */
const LANGUAGE_FLAG_REGION: Record<PlatformLocale, string> = {
  ar: "SA",
  bn: "BD",
  de: "DE",
  en: "US",
  es: "ES",
  fr: "FR",
  hi: "IN",
  ja: "JP",
  ko: "KR",
  pt: "PT",
  tr: "TR",
  ur: "PK",
  zh: "CN",
};

const FALLBACK_FLAG = "🌐";

function regionFlag(region: string): string {
  const code = region.toUpperCase();
  if (code.length !== 2) return FALLBACK_FLAG;
  const points = [...code].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0));
  if (points.some((p) => p < 0x1f1e6 || p > 0x1f1ff)) return FALLBACK_FLAG;
  return String.fromCodePoint(...points);
}

export function languageFlag(code: string): string {
  const normalized = normalizePlatformLocale(code);
  const region = LANGUAGE_FLAG_REGION[normalized];
  return region ? regionFlag(region) : FALLBACK_FLAG;
}

/** Sorted by English name for the Settings dropdown. */
export const PLATFORM_LANGUAGES: PlatformLanguage[] = ISO_639_1_CODES.map(
  (code) => {
    const english = englishName(code);
    const flag = languageFlag(code);
    return {
      value: code,
      englishName: english,
      flag,
      label: `${code} — ${english} ${flag}`,
    };
  },
).sort((a, b) => a.englishName.localeCompare(b.englishName));

export function isPlatformLocale(code: string): code is PlatformLocale {
  return LOCALE_SET.has(code);
}

/** Coerce stored/user input to a supported code; defaults to English. */
export function normalizePlatformLocale(raw: string | null | undefined): PlatformLocale {
  const code = (raw ?? "en").trim().toLowerCase();
  return isPlatformLocale(code) ? code : "en";
}

export function platformLanguageLabel(code: string): string {
  const normalized = normalizePlatformLocale(code);
  return PLATFORM_LANGUAGES.find((l) => l.value === normalized)?.label ?? normalized;
}
