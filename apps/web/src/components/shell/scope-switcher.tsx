"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type SwitchItem = {
  id: string;
  label: string;
  sub?: string;
  href: string;
  ok?: boolean;
};

/**
 * The switcher at the top of the sidebar.
 *
 * The prototype's version (`toggleSw` / `swOpen`): a translucent button on the
 * navy, opening a white card with a teal dot per row and a brand-orange "+ New"
 * footer. The search box is the one addition — past a dozen rows the plain list
 * the prototype shows becomes a scroll hunt.
 */
export function ScopeSwitcher({
  icon,
  title,
  subtitle,
  items,
  currentId,
  newLabel,
  newHref,
  note,
}: {
  icon: string;
  title: string;
  subtitle: string;
  items: SwitchItem[];
  currentId?: string;
  newLabel: string;
  newHref: string;
  /** Shown when the list was capped, so a short menu never implies a short list. */
  note?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) => i.label.toLowerCase().includes(term));
  }, [items, query]);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }

    window.addEventListener("keydown", onKey);
    // `mousedown` and not `click`: a drag that starts inside the dropdown and
    // ends outside it should not count as clicking away.
    window.addEventListener("mousedown", onDown);
    inputRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href as never);
  }

  return (
    <div ref={boxRef} className="relative mb-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-white/12 bg-white/[.07] px-2.5 py-2.5 text-left hover:bg-white/12"
      >
        <span className="shrink-0 text-sm">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-white">{title}</span>
          <span className="block truncate text-[11px] text-white/45">{subtitle}</span>
        </span>
        <span className="shrink-0 text-[9px] text-white/50">▼</span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-40 overflow-hidden rounded-[9px] bg-white shadow-[0_12px_32px_rgba(11,30,58,.28)]">
          {items.length > 6 && (
            <div className="flex items-center gap-2 border-b border-[#edf0f5] px-3 py-2.5">
              <span className="text-[13px] text-faint">⌕</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full border-0 bg-transparent text-[13px] outline-none"
              />
            </div>
          )}

          <div className="max-h-[280px] overflow-y-auto p-1.5">
            {matches.map((i) => (
              <button
                key={i.id}
                onClick={() => go(i.href)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-ink hover:bg-[#f1f4f8] ${
                  i.id === currentId ? "bg-[#f8fafc]" : ""
                }`}
              >
                <span
                  className={`size-[7px] shrink-0 rounded-full ${
                    i.ok === false ? "bg-bad" : "bg-ok"
                  }`}
                />
                <span className="min-w-0 truncate">{i.label}</span>
                {i.sub && (
                  <span className="ml-auto shrink-0 text-[11px] text-faint">{i.sub}</span>
                )}
              </button>
            ))}

            {matches.length === 0 && (
              <p className="px-2.5 py-5 text-center text-[12.5px] text-faint">
                {items.length === 0 ? "Nothing here yet" : "No match"}
              </p>
            )}
          </div>

          {note && (
            <p className="border-t border-[#edf0f5] px-3 py-2 text-[11px] text-faint">{note}</p>
          )}

          <button
            onClick={() => go(newHref)}
            className="w-full cursor-pointer border-t border-[#edf0f5] px-2.5 py-2 text-left text-[13px] font-semibold text-brand hover:bg-[#fff3ea]"
          >
            {newLabel}
          </button>
        </div>
      )}
    </div>
  );
}
