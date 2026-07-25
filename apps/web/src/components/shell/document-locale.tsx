"use client";

import { useEffect } from "react";
import { usePlatformT } from "@/components/i18n/platform-i18n-provider";

/** Keeps `<html lang>` in sync with the active platform language (incl. Settings preview). */
export function DocumentLocale() {
  const { locale } = usePlatformT();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
