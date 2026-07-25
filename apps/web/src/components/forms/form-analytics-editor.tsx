"use client";

import type { FormAnalyticsConfig } from "@/lib/db/schema";
import {
  DEFAULT_ANALYTICS,
  normalizeAnalytics,
} from "@/lib/forms/analytics";

/**
 * Form-level analytics / UTM tracking flags.
 */
export function FormAnalyticsEditor({
  value,
  onChange,
}: {
  value: FormAnalyticsConfig;
  onChange: (next: FormAnalyticsConfig) => void;
}) {
  const analytics = normalizeAnalytics(value);

  function patch(partial: Partial<FormAnalyticsConfig>) {
    onChange(normalizeAnalytics({ ...analytics, ...partial }));
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        Analytics & UTM
      </p>
      <p className="text-[12px] leading-relaxed text-muted">
        Track views, starts, field drop-off, completion time, and UTM sources on
        the live embed (via the WordPress connector).
      </p>

      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={analytics.enabled !== false}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        Enable form analytics
      </label>

      {analytics.enabled !== false ? (
        <>
          <label className="flex items-center gap-2 text-[12.5px] text-muted">
            <input
              type="checkbox"
              checked={analytics.trackViews !== false}
              onChange={(e) => patch({ trackViews: e.target.checked })}
            />
            Form views
          </label>
          <label className="flex items-center gap-2 text-[12.5px] text-muted">
            <input
              type="checkbox"
              checked={analytics.trackStarts !== false}
              onChange={(e) => patch({ trackStarts: e.target.checked })}
            />
            Starts (first interaction)
          </label>
          <label className="flex items-center gap-2 text-[12.5px] text-muted">
            <input
              type="checkbox"
              checked={analytics.trackFieldDropoff !== false}
              onChange={(e) => patch({ trackFieldDropoff: e.target.checked })}
            />
            Field drop-off (focus)
          </label>
          <label className="flex items-center gap-2 text-[12.5px] text-muted">
            <input
              type="checkbox"
              checked={analytics.trackCompletionTime !== false}
              onChange={(e) =>
                patch({ trackCompletionTime: e.target.checked })
              }
            />
            Completion time
          </label>
          <label className="flex items-center gap-2 text-[12.5px] text-muted">
            <input
              type="checkbox"
              checked={analytics.trackUtm !== false}
              onChange={(e) => patch({ trackUtm: e.target.checked })}
            />
            Capture UTM parameters
          </label>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => onChange(normalizeAnalytics(DEFAULT_ANALYTICS))}
        className="self-start text-[11.5px] font-semibold text-muted hover:text-brand"
      >
        Reset analytics defaults
      </button>
    </div>
  );
}
