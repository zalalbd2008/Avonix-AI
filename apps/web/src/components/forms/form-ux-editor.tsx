"use client";

import type { FormUxConfig } from "@/lib/db/schema";
import { normalizeUx } from "@/lib/forms/ux-config";

/**
 * Draft/resume, keyboard, sticky progress, dark-toggle runtime flags.
 */
export function FormUxEditor({
  value,
  onChange,
}: {
  value: FormUxConfig;
  onChange: (next: FormUxConfig) => void;
}) {
  const ux = normalizeUx(value);

  function patch(partial: Partial<FormUxConfig>) {
    onChange(normalizeUx({ ...ux, ...partial }));
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        Respondent UX
      </p>
      <p className="text-[12px] leading-relaxed text-muted">
        Draft auto-save, resume later, keyboard navigation, sticky progress, and
        dark-mode toggle. Appearance → Accessibility / Dark mode still control
        visuals.
      </p>

      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={ux.autoSaveDraft !== false}
          onChange={(e) => patch({ autoSaveDraft: e.target.checked })}
        />
        Auto-save draft (local)
      </label>
      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={ux.allowResume !== false}
          onChange={(e) => patch({ allowResume: e.target.checked })}
        />
        Resume later + Save draft button
      </label>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Draft expiry (days)
        </span>
        <input
          type="number"
          min={1}
          max={90}
          value={ux.draftTtlDays ?? 7}
          onChange={(e) => patch({ draftTtlDays: Number(e.target.value) })}
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        />
      </label>
      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={Boolean(ux.stickyProgress)}
          onChange={(e) => patch({ stickyProgress: e.target.checked })}
        />
        Sticky progress bar
      </label>
      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={ux.enterToContinue !== false}
          onChange={(e) => patch({ enterToContinue: e.target.checked })}
        />
        Enter key continues (multi-step)
      </label>
      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={ux.showDarkToggle !== false}
          onChange={(e) => patch({ showDarkToggle: e.target.checked })}
        />
        Show dark-mode toggle (when theme allows)
      </label>
      <p className="text-[11px] leading-snug text-faint">
        Keyboard: Alt+← / Alt+→ moves steps when Accessibility → Keyboard nav is
        on. Progress styles live under Layout.
      </p>
    </div>
  );
}
