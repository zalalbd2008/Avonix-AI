"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { googleFontStack, searchGoogleFonts } from "@/lib/fonts/google";

const input =
  "w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/15";

type Props = {
  label: string;
  value?: string;
  onChange: (family: string) => void;
  hint?: string;
  allowSystem?: boolean;
};

const MIN_CHARS = 2;

/** Live-search Google Fonts picker — results appear as you type. */
export function GoogleFontPicker({
  label,
  value,
  onChange,
  hint,
  allowSystem = true,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const canSearch = query.trim().length >= MIN_CHARS;
  const results = useMemo(
    () => (canSearch ? searchGoogleFonts(query, 36) : []),
    [canSearch, query],
  );

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(family: string) {
    onChange(family);
    setQuery("");
    setOpen(false);
  }

  const selectedLabel =
    !value || value === "system" ? "System default" : value;

  return (
    <div className="space-y-1.5" ref={rootRef}>
      <span className="text-[12px] font-medium text-ink">{label}</span>

      <div className="relative">
        <input
          className={input}
          value={query}
          role="combobox"
          aria-expanded={open && canSearch}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={
            value && value !== "system"
              ? `Search to change (${value})…`
              : "Type 2+ letters to search fonts…"
          }
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!open || !canSearch) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              pick(results[active].family);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />

        {open ? (
          <div
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-lg"
          >
            {allowSystem && query.trim().length === 0 ? (
              <button
                type="button"
                role="option"
                className="flex w-full px-3 py-2 text-left text-[13px] text-ink hover:bg-[#f8fafc]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick("system")}
              >
                System default
              </button>
            ) : null}

            {!canSearch ? (
              <p className="px-3 py-2 text-[12px] text-muted">
                Type at least {MIN_CHARS} letters…
              </p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-muted">
                No fonts match “{query.trim()}”
              </p>
            ) : (
              results.map((f, i) => (
                <button
                  key={f.family}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className={`flex w-full px-3 py-2 text-left text-[13px] hover:bg-[#f8fafc] ${
                    i === active ? "bg-[#f1f4f8]" : ""
                  } ${value === f.family ? "font-semibold text-brand" : "text-ink"}`}
                  style={{ fontFamily: googleFontStack(f.family) }}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(f.family)}
                >
                  {f.family}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {hint ? <p className="text-[11px] text-muted">{hint}</p> : null}

      <p
        className="rounded-lg border border-line bg-[#f8fafc] px-3 py-2 text-[13px] text-ink"
        style={{
          fontFamily:
            value && value !== "system" ? googleFontStack(value) : undefined,
        }}
      >
        {selectedLabel}
        {value && value !== "system" ? " — The quick brown fox" : null}
      </p>
    </div>
  );
}
