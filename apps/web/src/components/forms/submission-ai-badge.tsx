import type { FormSubmissionAi } from "@/lib/db/schema";

/**
 * Compact AI insights strip on a submission row.
 */
export function SubmissionAiBadge({ ai }: { ai?: FormSubmissionAi | null }) {
  if (!ai || (ai.score == null && !ai.category && !ai.spam && !ai.followUp)) {
    return null;
  }

  const scoreTone =
    ai.spam || (ai.score ?? 50) < 30
      ? "bg-red-50 text-red-700"
      : (ai.score ?? 0) >= 70
        ? "bg-emerald-50 text-emerald-800"
        : "bg-amber-50 text-amber-800";

  return (
    <div className="mt-2 rounded-lg border border-[#edf0f5] bg-[#fbfcfe] px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {ai.score != null ? (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${scoreTone}`}
          >
            AI {ai.score}
          </span>
        ) : null}
        {ai.category ? (
          <span className="inline-flex rounded-full bg-[#f1f4f8] px-2 py-0.5 text-[11px] font-semibold text-muted">
            {ai.category}
          </span>
        ) : null}
        {ai.spam ? (
          <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
            Spam
          </span>
        ) : null}
        {ai.duplicate ? (
          <span className="inline-flex rounded-full bg-[#f1f4f8] px-2 py-0.5 text-[11px] font-semibold text-muted">
            Duplicate
          </span>
        ) : null}
        {ai.model ? (
          <span className="text-[10.5px] text-faint">{ai.model}</span>
        ) : null}
      </div>
      {ai.spamReason ? (
        <p className="mt-1 text-[11.5px] text-faint">{ai.spamReason}</p>
      ) : null}
      {ai.followUp ? (
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
          <span className="font-semibold text-[#1a2332]">Follow-up: </span>
          {ai.followUp}
        </p>
      ) : null}
    </div>
  );
}
