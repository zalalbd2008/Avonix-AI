/**
 * Public Languages config for the WordPress connector (no secrets).
 */

import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  catalogEntry,
  localeDisplayName,
  localeFlag,
  mergeLanguageSettings,
  type LanguageSettings,
} from "@/lib/languages/types";

export type ConnectorLanguagesConfig = {
  enabled: boolean;
  default_locale: string;
  fallback_locale: string;
  engine: LanguageSettings["engine"];
  locales: Array<{
    code: string;
    label: string;
    native: string;
    flag: string;
    rtl: boolean;
  }>;
  switcher: {
    enabled: boolean;
    style: LanguageSettings["switcher"]["style"];
    position: LanguageSettings["switcher"]["position"];
    placement: LanguageSettings["switcher"]["placement"];
    icon_size: number;
    button_padding: number;
    show_flags: boolean;
    show_native_names: boolean;
    show_codes: boolean;
  };
  detection: LanguageSettings["detection"];
  exclude_selectors: string[];
  never_translate: string[];
  exclude_paths: string[];
};

function lines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 80);
}

export async function getConnectorLanguagesConfig(
  agencyId: string,
  websiteId: string,
): Promise<ConnectorLanguagesConfig | null> {
  const row = await withAgency(agencyId, async (tx) => {
    const [found] = await tx
      .select({ settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    return found ?? null;
  });
  if (!row) return null;

  const settings = mergeLanguageSettings(row.settings?.languages);
  const locales = settings.locales
    .filter((l) => l.enabled && l.visible)
    .map((l) => {
      const cat = catalogEntry(l.code);
      return {
        code: l.code,
        label: l.label.trim() || localeDisplayName(l.code),
        native: cat?.native ?? localeDisplayName(l.code),
        flag: localeFlag(l.code),
        rtl: Boolean(l.rtl),
      };
    });

  return {
    enabled: settings.enabled,
    default_locale: settings.defaultLocale,
    fallback_locale: settings.fallbackLocale,
    engine: settings.engine,
    locales,
    switcher: {
      enabled: settings.switcher.enabled,
      style: settings.switcher.style,
      position: settings.switcher.position,
      placement: settings.switcher.placement,
      icon_size: settings.switcher.iconSize,
      button_padding: settings.switcher.buttonPadding,
      show_flags: settings.switcher.showFlags,
      show_native_names: settings.switcher.showNativeNames,
      show_codes: settings.switcher.showCodes,
    },
    detection: settings.detection,
    exclude_selectors: lines(settings.excludeSelectors),
    never_translate: lines(settings.neverTranslate),
    exclude_paths: lines(settings.excludePaths),
  };
}
