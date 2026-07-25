"use client";

import type { FormAiConfig } from "@/lib/db/schema";
import { DEFAULT_AI, normalizeAi } from "@/lib/forms/ai-config";

/**
 * Form AI feature flags — scoring, spam, category, rewrite, follow-up.
 */
export function FormAiEditor({
  value,
  onChange,
}: {
  value: FormAiConfig;
  onChange: (next: FormAiConfig) => void;
}) {
  const ai = normalizeAi(value);

  function patch(partial: Partial<FormAiConfig>) {
    onChange(normalizeAi({ ...ai, ...partial }));
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        AI features
      </p>
      <p className="text-[12px] leading-relaxed text-muted">
        Lead scoring, spam / duplicate detection, category, suggested follow-up,
        and optional message rewrite. Uses Claude when configured; heuristics
        always run as a fallback.
      </p>

      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={ai.enabled !== false}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        Enable AI on submissions
      </label>

      {ai.enabled !== false ? (
        <>
          {(
            [
              ["leadScoring", "Lead scoring (0–100)", true],
              ["spamDetection", "Spam detection", true],
              ["duplicateDetection", "Duplicate detection (same email)", true],
              ["categoryDetection", "Category detection", true],
              ["suggestedFollowUp", "Suggested follow-up", true],
              ["rewriteMessage", "Rewrite message on submit", false],
              ["autofill", "Embed rewrite button (respondent)", false],
              ["useLlm", "Use Claude when API key is set", true],
              ["applyToCrm", "Apply score / tags to CRM", true],
            ] as const
          ).map(([key, label, defaultOn]) => (
            <label
              key={key}
              className="flex items-center gap-2 text-[12.5px] text-muted"
            >
              <input
                type="checkbox"
                checked={defaultOn ? ai[key] !== false : Boolean(ai[key])}
                onChange={(e) => patch({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}

          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Categories (comma-separated)
            </span>
            <input
              value={(ai.categories ?? []).join(", ")}
              onChange={(e) =>
                patch({
                  categories: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </label>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => onChange(normalizeAi(DEFAULT_AI))}
        className="self-start text-[11.5px] font-semibold text-muted hover:text-brand"
      >
        Reset AI defaults
      </button>
    </div>
  );
}
