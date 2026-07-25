"use client";

import type { FormField, FormFieldWidth } from "@/lib/db/schema";
import {
  WIDTH_PERCENT_OPTIONS,
  WIDTH_PRESETS,
  forcesFullWidth,
  spanLabel,
  toColSpan,
  type ColSpan,
  type FieldWidthBreakpoint,
} from "@/lib/forms/field-width";

/**
 * Per-field 12-col width controls (desktop / tablet / mobile).
 */
export function FieldWidthControls({
  field,
  onChange,
  locked = false,
}: {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
  locked?: boolean;
}) {
  const lockedFull = forcesFullWidth(field.type);
  const desk = toColSpan(field.width);
  const tab =
    field.widthTablet != null ? toColSpan(field.widthTablet) : desk;
  const mob =
    field.widthMobile != null ? toColSpan(field.widthMobile) : 12;

  function setBreakpoint(bp: FieldWidthBreakpoint, span: ColSpan) {
    if (lockedFull || locked) return;
    const value = span as FormFieldWidth;
    if (bp === "desktop") onChange({ width: value });
    else if (bp === "tablet") onChange({ widthTablet: value });
    else onChange({ widthMobile: value });
  }

  if (lockedFull) {
    return (
      <p className="rounded-lg border border-[#edf0f5] bg-[#f8fafc] px-2.5 py-2 text-[12px] text-faint">
        This field type is always full width (12/12).
      </p>
    );
  }

  if (locked) {
    return (
      <p className="rounded-lg border border-[#edf0f5] bg-[#f8fafc] px-2.5 py-2 text-[12px] text-faint">
        Width is locked ({spanLabel(desk)}). Unlock in Section · row · container.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <BreakpointBlock
        title="Desktop"
        span={desk}
        onPick={(s) => setBreakpoint("desktop", s)}
      />
      <BreakpointBlock
        title="Tablet (≤960px)"
        span={tab}
        onPick={(s) => setBreakpoint("tablet", s)}
        onReset={() => onChange({ widthTablet: undefined })}
        canReset={field.widthTablet != null}
      />
      <BreakpointBlock
        title="Mobile (≤640px)"
        span={mob}
        onPick={(s) => setBreakpoint("mobile", s)}
        onReset={() => onChange({ widthMobile: undefined })}
        canReset={field.widthMobile != null}
        hint="Unset defaults to full width on phones"
      />
    </div>
  );
}

function BreakpointBlock({
  title,
  span,
  onPick,
  onReset,
  canReset,
  hint,
}: {
  title: string;
  span: ColSpan;
  onPick: (s: ColSpan) => void;
  onReset?: () => void;
  canReset?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11.5px] font-semibold text-muted">{title}</span>
        <span className="text-[11px] text-faint">{spanLabel(span)}</span>
      </div>
      {hint ? <p className="mb-1.5 text-[11px] text-faint">{hint}</p> : null}
      <div className="mb-1.5 grid grid-cols-3 gap-1">
        {WIDTH_PRESETS.filter((p) => p.id !== "fifth").map((p) => {
          const isOn = span === p.span;
          return (
            <button
              key={p.id}
              type="button"
              title={p.hint}
              onClick={() => onPick(p.span)}
              className={`rounded-lg border px-1.5 py-1.5 text-[11.5px] font-semibold transition ${
                isOn
                  ? "border-brand bg-[rgba(255,102,0,.1)] text-brand"
                  : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1">
        {WIDTH_PERCENT_OPTIONS.map((o) => {
          const active = span === o.span;
          return (
            <button
              key={o.pct}
              type="button"
              onClick={() => onPick(o.span)}
              className={`rounded border px-1.5 py-0.5 text-[10.5px] font-semibold ${
                active
                  ? "border-brand bg-[rgba(255,102,0,.1)] text-brand"
                  : "border-[#edf0f5] text-faint hover:border-brand hover:text-brand"
              }`}
            >
              {o.pct}%
            </button>
          );
        })}
      </div>
      <label className="mt-2 flex items-center gap-2 text-[12px] text-muted">
        <span className="shrink-0">Columns</span>
        <input
          type="range"
          min={1}
          max={12}
          value={span}
          onChange={(e) => onPick(Number(e.target.value) as ColSpan)}
          className="w-full accent-[var(--brand,#ff6600)]"
        />
        <span className="w-6 text-right font-mono text-[11px]">{span}</span>
      </label>
      {canReset && onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-1 text-[11.5px] font-semibold text-faint hover:text-brand"
        >
          Reset to inherit
        </button>
      ) : null}
    </div>
  );
}
