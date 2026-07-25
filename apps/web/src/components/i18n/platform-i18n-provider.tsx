"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getPlatformMessages,
  type MessageKey,
} from "@/lib/i18n/messages";
import {
  normalizePlatformLocale,
  type PlatformLocale,
} from "@/lib/i18n/platform-languages";

type PlatformI18nContextValue = {
  locale: PlatformLocale;
  t: (key: MessageKey) => string;
  /** Live preview while picking a language in Settings (cleared after save + refresh). */
  setLocalePreview: (locale: PlatformLocale | null) => void;
};

const PlatformI18nContext = createContext<PlatformI18nContextValue>({
  locale: "en",
  t: (key) => getPlatformMessages("en")[key],
  setLocalePreview: () => {},
});

export function PlatformI18nProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const saved = normalizePlatformLocale(locale);
  const [preview, setPreview] = useState<PlatformLocale | null>(null);

  useEffect(() => {
    setPreview(null);
  }, [saved]);

  const active = preview ?? saved;
  const value = useMemo<PlatformI18nContextValue>(
    () => ({
      locale: active,
      t: (key) => getPlatformMessages(active)[key],
      setLocalePreview: setPreview,
    }),
    [active],
  );

  return (
    <PlatformI18nContext.Provider value={value}>
      {children}
    </PlatformI18nContext.Provider>
  );
}

export function usePlatformT() {
  return useContext(PlatformI18nContext);
}
