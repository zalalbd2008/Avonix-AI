"use client";

import { useEffect, useId, useState } from "react";

const CONFIRM_WORD = "DELETE";

/**
 * Danger-zone delete that only enables when the user types DELETE.
 */
export function ConfirmDelete({
  title,
  description,
  confirmLabel = "Delete permanently",
  triggerLabel = "Delete…",
  triggerClassName = "rounded-lg border border-[#fecaca] bg-white px-3.5 py-2 text-[13px] font-semibold text-bad hover:bg-[#fef2f2]",
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  triggerLabel?: string;
  /** Override the open-button styles (e.g. quiet text link). */
  triggerClassName?: string;
  onConfirm: () => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const ready = typed.trim() === CONFIRM_WORD;

  useEffect(() => {
    if (!open) {
      setTyped("");
      setError(null);
      setPending(false);
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${inputId}-title`}
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-line bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={`${inputId}-title`}
              className="text-[16px] font-bold text-ink"
            >
              {title}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {description}
            </p>
            <p className="mt-4 text-[12.5px] text-ink">
              Type <b className="font-mono">{CONFIRM_WORD}</b> to confirm.
            </p>
            <label htmlFor={inputId} className="sr-only">
              Type {CONFIRM_WORD} to confirm
            </label>
            <input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={pending}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder={CONFIRM_WORD}
              className="mt-2 w-full rounded-lg border border-[#dbe1ea] px-3 py-2.5 font-mono text-sm outline-none focus:border-bad"
            />
            {error ? (
              <p className="mt-2 text-[12.5px] text-bad">{error}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-lg border border-line px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-[#f8fafc] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!ready || pending}
                onClick={async () => {
                  setPending(true);
                  setError(null);
                  const result = await onConfirm();
                  if (!result.ok) {
                    setError(result.error);
                    setPending(false);
                    return;
                  }
                  // Caller usually navigates away; keep dialog open while that happens.
                }}
                className="rounded-lg bg-bad px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#b91c1c] disabled:opacity-40"
              >
                {pending ? "Deleting…" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
