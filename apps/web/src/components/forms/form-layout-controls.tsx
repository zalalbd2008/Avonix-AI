"use client";

import type { FormLayoutConfig } from "@/lib/db/schema";
import {
  FLOW_MODES,
  MOUNT_MODES,
  PROGRESS_STYLES,
  normalizeFormLayout,
} from "@/lib/forms/layout";

/**
 * Form-level layout engine controls (flow mode × chrome × mount).
 * Separate from per-field width controls.
 */
export function FormLayoutControls({
  layout,
  stepCount,
  onChange,
}: {
  layout: FormLayoutConfig;
  stepCount: number;
  onChange: (next: FormLayoutConfig) => void;
}) {
  const resolved = normalizeFormLayout(layout, Array.from({ length: stepCount }, (_, i) => ({
    id: `step_${i + 1}`,
    title: `Step ${i + 1}`,
  })));

  function patch(partial: Partial<FormLayoutConfig>) {
    onChange(
      normalizeFormLayout(
        {
          ...resolved,
          ...partial,
          chrome: {
            ...resolved.chrome!,
            ...(partial.chrome ?? {}),
          },
        },
        Array.from({ length: stepCount }, (_, i) => ({
          id: `step_${i + 1}`,
          title: `Step ${i + 1}`,
        })),
      ),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
          Form layout
        </p>
        <p className="mb-2.5 text-[11.5px] leading-relaxed text-faint">
          How respondents move through the form, and how it mounts on the page.
        </p>
        <div className="flex flex-col gap-1.5">
          {FLOW_MODES.map((m) => {
            const active = resolved.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  const progress =
                    m.id === "single" || m.id === "accordion"
                      ? ("none" as const)
                      : resolved.chrome?.progress === "none"
                        ? ("line" as const)
                        : resolved.chrome!.progress;
                  patch({
                    mode: m.id,
                    chrome: { ...resolved.chrome!, progress },
                  });
                }}
                className={`rounded-lg border px-2.5 py-2 text-left transition ${
                  active
                    ? "border-brand bg-[rgba(255,102,0,.1)]"
                    : "border-[#dbe1ea] hover:border-brand"
                }`}
              >
                <span
                  className={`block text-[12.5px] font-semibold ${active ? "text-brand" : "text-ink"}`}
                >
                  {m.label}
                </span>
                <span className="block text-[11px] text-faint">{m.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
          Mount
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {MOUNT_MODES.map((m) => {
            const active = (resolved.mount ?? "embedded") === m.id;
            return (
              <button
                key={m.id}
                type="button"
                title={m.hint}
                onClick={() => patch({ mount: m.id })}
                className={`rounded-lg border px-2 py-2 text-[12px] font-semibold transition ${
                  active
                    ? "border-brand bg-[rgba(255,102,0,.1)] text-brand"
                    : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {resolved.mode !== "single" ? (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
            Progress chrome
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {PROGRESS_STYLES.map((p) => {
              const active = resolved.chrome?.progress === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    patch({ chrome: { ...resolved.chrome!, progress: p.id } })
                  }
                  className={`rounded-lg border px-2 py-2 text-[12px] font-semibold transition ${
                    active
                      ? "border-brand bg-[rgba(255,102,0,.1)] text-brand"
                      : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          {(resolved.mode === "wizard" || resolved.mode === "card") && (
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {(
                [
                  ["top", "Top progress"],
                  ["sidebar", "Sidebar progress"],
                ] as const
              ).map(([value, label]) => {
                const active =
                  (resolved.chrome?.progressPlacement ?? "top") === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      patch({
                        chrome: {
                          ...resolved.chrome!,
                          progressPlacement: value,
                        },
                      })
                    }
                    className={`rounded-lg border px-2 py-2 text-[12px] font-semibold transition ${
                      active
                        ? "border-brand bg-[rgba(255,102,0,.1)] text-brand"
                        : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          <label className="mt-2.5 flex items-center gap-2 text-[12.5px] text-muted">
            <input
              type="checkbox"
              checked={resolved.chrome?.showStepTitles !== false}
              onChange={(e) =>
                patch({
                  chrome: {
                    ...resolved.chrome!,
                    showStepTitles: e.target.checked,
                  },
                })
              }
              className="accent-[var(--brand,#ff6600)]"
            />
            Show step titles
          </label>
        </div>
      ) : null}

      {resolved.mode === "wizard" ||
      resolved.mode === "card" ||
      resolved.mode === "accordion" ? (
        <p className="text-[11.5px] leading-relaxed text-faint">
          {stepCount < 2
            ? "Add more steps on the Form tab so wizard / card / accordion pages have content."
            : `${stepCount} steps configured.`}
        </p>
      ) : null}
    </div>
  );
}
