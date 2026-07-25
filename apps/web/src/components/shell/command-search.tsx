"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Result = {
  kind: "Client" | "Contact" | "Website";
  name: string;
  sub: string;
  href: string;
};

/** The prototype's kind colours: teal for websites, orange for modules, grey otherwise. */
const TONE: Record<Result["kind"], string> = {
  Client: "bg-[rgba(255,102,0,.1)] text-brand",
  Website: "bg-[rgba(13,148,136,.1)] text-ok",
  Contact: "bg-[#f1f4f8] text-muted",
};

/**
 * ⌘K search across clients, contacts and websites.
 *
 * Controlled rather than self-contained: both the top bar and the sidebar open
 * it in the prototype, so one owner holds the state and this renders it.
 */
export function CommandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (!term) {
      setResults([]);
      return;
    }

    // Debounced: every keystroke hitting the database would be three queries
    // per character.
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        setResults(res.ok ? await res.json() : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-center bg-[rgba(11,30,58,.45)] pt-[110px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-fit w-[560px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(11,30,58,.35)]"
      >
        <div className="flex items-center gap-2.5 border-b border-[#edf0f5] px-4 py-3.5">
          <span className="text-[15px] font-bold text-brand">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients, contacts and websites — across the whole agency"
            className="flex-1 border-0 bg-transparent text-[14.5px] outline-none"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[11px] text-faint">
            ESC
          </kbd>
        </div>

        <div className="max-h-[350px] overflow-y-auto p-1.5">
          {results.map((r) => (
            <button
              key={r.href + r.name}
              onClick={() => {
                onClose();
                router.push(r.href as never);
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left hover:bg-[#f1f4f8]"
            >
              <span
                className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-bold tracking-[0.06em] uppercase ${TONE[r.kind]}`}
              >
                {r.kind}
              </span>
              <span className="text-[13.5px] font-medium">{r.name}</span>
              <span className="ml-auto truncate text-[12px] text-faint">{r.sub}</span>
            </button>
          ))}

          {!loading && query.trim() && results.length === 0 && (
            <p className="p-5 text-center text-[13px] text-faint">No results across the agency</p>
          )}
          {!query.trim() && (
            <p className="p-5 text-center text-[13px] text-faint">
              Type a client, contact or website name
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
