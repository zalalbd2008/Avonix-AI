import type { FormUniqueScores } from "@/lib/db/schema";

/**
 * Compact unique-score strip on a submission row.
 */
export function SubmissionScoresBadge({
  scores,
  portalUrl,
}: {
  scores?: FormUniqueScores | null;
  portalUrl?: string | null;
}) {
  if (
    !scores ||
    (scores.leadHealth == null &&
      scores.complexity == null &&
      scores.salesProbability == null &&
      scores.clientReadiness == null &&
      !scores.summary &&
      !scores.budgetRecommendation)
  ) {
    return null;
  }

  function chip(label: string, value?: number) {
    if (value == null) return null;
    const tone =
      value >= 70
        ? "bg-emerald-50 text-emerald-800"
        : value >= 40
          ? "bg-amber-50 text-amber-800"
          : "bg-red-50 text-red-700";
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}
      >
        {label} {value}
      </span>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-[#edf0f5] bg-[#fbfcfe] px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {chip("Health", scores.leadHealth)}
        {chip("Complexity", scores.complexity)}
        {chip("Sales", scores.salesProbability)}
        {chip("Ready", scores.clientReadiness)}
        {scores.estimatedDeliveryDays != null ? (
          <span className="inline-flex rounded-full bg-[#f1f4f8] px-2 py-0.5 text-[11px] font-semibold text-muted">
            ~{scores.estimatedDeliveryDays}d
          </span>
        ) : null}
        {scores.roiLabel ? (
          <span className="inline-flex rounded-full bg-[#f1f4f8] px-2 py-0.5 text-[11px] font-semibold text-muted">
            ROI {scores.roiLabel}
          </span>
        ) : null}
      </div>
      {scores.budgetRecommendation ? (
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
          <span className="font-semibold text-[#1a2332]">Budget: </span>
          {scores.budgetRecommendation}
        </p>
      ) : null}
      {scores.summary ? (
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          <span className="font-semibold text-[#1a2332]">Summary: </span>
          {scores.summary}
        </p>
      ) : null}
      {portalUrl ? (
        <p className="mt-1.5 text-[11.5px] text-faint">
          Portal:{" "}
          <a href={portalUrl} className="font-semibold text-brand hover:underline">
            {portalUrl}
          </a>
        </p>
      ) : null}
    </div>
  );
}
