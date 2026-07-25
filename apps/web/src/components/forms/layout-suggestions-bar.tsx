"use client";

import { FormIcon } from "@/components/forms/icons";
import type { LayoutSuggestion } from "@/lib/forms/layout-suggestions";

/**
 * Compact suggestion strip for the canvas toolbar (Step 11).
 */
export function LayoutSuggestionsBar({
  suggestions,
  dismissed,
  onApply,
  onDismiss,
}: {
  suggestions: LayoutSuggestion[];
  dismissed: Set<string>;
  onApply: (s: LayoutSuggestion, mode?: "fit" | "split") => void;
  onDismiss: (id: string) => void;
}) {
  const visible = suggestions.filter((s) => !dismissed.has(s.id));
  if (!visible.length) return null;

  return (
    <div className="border-b border-[#edf0f5] bg-[#f8fafc] px-3 py-2">
      <div className="mb-1.5 flex items-center gap-2">
        <FormIcon name="grid" size="xs" className="text-brand" />
        <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
          Layout suggestions
        </p>
        <span className="text-[11px] text-faint">{visible.length}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {visible.slice(0, 4).map((s) => (
          <li
            key={s.id}
            className={`flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
              s.severity === "warn"
                ? "border-[rgba(255,102,0,.35)] bg-[#fff8f3]"
                : "border-[#dbe1ea] bg-white"
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-[#13233c]">
                {s.title}
              </span>
              <span className="block text-[11px] text-muted">{s.detail}</span>
            </span>
            {s.kind === "wrap_overflow" ? (
              <>
                <button
                  type="button"
                  onClick={() => onApply(s, "fit")}
                  className="rounded-md border border-brand bg-[rgba(255,102,0,.12)] px-2 py-1 text-[11px] font-semibold text-brand hover:bg-[rgba(255,102,0,.2)]"
                >
                  Fit evenly
                </button>
                <button
                  type="button"
                  onClick={() => onApply(s, "split")}
                  className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[11px] font-semibold text-muted hover:border-brand hover:text-brand"
                >
                  Split row
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onApply(s)}
                className="rounded-md border border-brand bg-[rgba(255,102,0,.12)] px-2 py-1 text-[11px] font-semibold text-brand hover:bg-[rgba(255,102,0,.2)]"
              >
                Apply
              </button>
            )}
            <button
              type="button"
              title="Dismiss"
              onClick={() => onDismiss(s.id)}
              className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-faint hover:text-muted"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tiny Apply control shown on a canvas row chrome when a suggestion targets it. */
export function RowSuggestionChip({
  suggestion,
  onApply,
}: {
  suggestion: LayoutSuggestion;
  onApply: (s: LayoutSuggestion, mode?: "fit" | "split") => void;
}) {
  return (
    <button
      type="button"
      title={suggestion.detail}
      onClick={(e) => {
        e.stopPropagation();
        onApply(
          suggestion,
          suggestion.kind === "wrap_overflow" ? "fit" : undefined,
        );
      }}
      className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
        suggestion.severity === "warn"
          ? "bg-brand text-white"
          : "bg-white text-brand ring-1 ring-brand/30"
      }`}
    >
      {suggestion.kind === "wrap_overflow"
        ? "Fix wrap"
        : suggestion.kind === "equal_height"
          ? "Equal H"
          : suggestion.kind === "equal_gap"
            ? "Gap"
            : suggestion.kind === "fill_row"
              ? "Fill"
              : "Equal W"}
    </button>
  );
}
