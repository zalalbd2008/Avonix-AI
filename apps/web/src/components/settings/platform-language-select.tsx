"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  PLATFORM_LANGUAGES,
  normalizePlatformLocale,
  type PlatformLocale,
} from "@/lib/i18n/platform-languages";

function languageLabel(code: PlatformLocale) {
  return PLATFORM_LANGUAGES.find((l) => l.value === code)?.label ?? code;
}

/**
 * Custom language picker — native `<select>` duplicates flag emoji on macOS.
 * Shows a single flag after the language name: `code — English 🏳`.
 */
export function PlatformLanguageSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (locale: PlatformLocale) => void;
  className?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const normalized = normalizePlatformLocale(value);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative max-w-full sm:max-w-md">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={className}
      >
        <span className="block truncate text-left">{languageLabel(normalized)}</span>
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-faint">
          ▾
        </span>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#e2e8f0] bg-white py-1 shadow-lg"
        >
          {PLATFORM_LANGUAGES.map((l) => {
            const selected = l.value === normalized;
            return (
              <li key={l.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(l.value);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-[13.5px] hover:bg-[#f8fafc] ${
                    selected ? "bg-[#f0fdfa] font-medium text-brand" : "text-ink"
                  }`}
                >
                  {l.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
