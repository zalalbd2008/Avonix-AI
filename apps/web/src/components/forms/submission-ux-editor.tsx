"use client";

import type {
  FormSubmissionNextStep,
  FormSubmissionUx,
} from "@/lib/db/schema";
import {
  DEFAULT_SUBMISSION_UX,
  newNextStepId,
  normalizeSubmissionUx,
} from "@/lib/forms/submission-ux";

/**
 * Animated success screen, confetti, next steps, booking & proposal CTAs.
 */
export function SubmissionUxEditor({
  value,
  onChange,
}: {
  value: FormSubmissionUx;
  onChange: (next: FormSubmissionUx) => void;
}) {
  const ux = normalizeSubmissionUx(value);

  function patch(partial: Partial<FormSubmissionUx>) {
    onChange(normalizeSubmissionUx({ ...ux, ...partial }));
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        Success experience
      </p>
      <p className="text-[12px] leading-relaxed text-muted">
        Animated screen, optional confetti, next-steps timeline, booking and
        proposal links.
      </p>

      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={ux.animated !== false}
          onChange={(e) => patch({ animated: e.target.checked })}
        />
        Animated success screen
      </label>
      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={Boolean(ux.confetti)}
          onChange={(e) => patch({ confetti: e.target.checked })}
        />
        Confetti burst
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Headline override (optional)
        </span>
        <input
          value={ux.headline ?? ""}
          onChange={(e) => patch({ headline: e.target.value })}
          placeholder="Uses the success message when empty"
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Supporting text
        </span>
        <textarea
          rows={2}
          value={ux.subtext ?? ""}
          onChange={(e) => patch({ subtext: e.target.value })}
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Redirect delay (ms)
        </span>
        <input
          type="number"
          min={0}
          max={10000}
          step={100}
          value={ux.redirectDelayMs ?? 1500}
          onChange={(e) =>
            patch({ redirectDelayMs: Number(e.target.value) })
          }
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        />
        <span className="mt-1 block text-[11px] text-faint">
          Used when the confirmation action is Redirect (and “show before
          redirect” is on).
        </span>
      </label>

      <div className="border-t border-[#edf0f5] pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
            Next steps
          </p>
          <button
            type="button"
            onClick={() => {
              const step: FormSubmissionNextStep = {
                id: newNextStepId(),
                title: "New step",
                description: "",
              };
              patch({
                nextSteps: [...(ux.nextSteps ?? []), step].slice(0, 8),
              });
            }}
            className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            + Add
          </button>
        </div>
        <label className="mb-2 block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Section title
          </span>
          <input
            value={ux.nextStepsTitle ?? ""}
            onChange={(e) => patch({ nextStepsTitle: e.target.value })}
            className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
          />
        </label>
        <div className="flex flex-col gap-2">
          {(ux.nextSteps ?? []).map((step, i) => (
            <div
              key={step.id}
              className="rounded-lg border border-[#e6e9f0] bg-white p-2.5"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-faint">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      nextSteps: (ux.nextSteps ?? []).filter(
                        (s) => s.id !== step.id,
                      ),
                    })
                  }
                  className="text-[11px] font-semibold text-bad hover:underline"
                >
                  Remove
                </button>
              </div>
              <input
                value={step.title}
                onChange={(e) => {
                  const nextSteps = (ux.nextSteps ?? []).map((s) =>
                    s.id === step.id ? { ...s, title: e.target.value } : s,
                  );
                  patch({ nextSteps });
                }}
                placeholder="Title"
                className="mb-1.5 w-full rounded-md border border-[#dbe1ea] px-2 py-1.5 text-[12.5px] outline-none focus:border-brand"
              />
              <input
                value={step.description ?? ""}
                onChange={(e) => {
                  const nextSteps = (ux.nextSteps ?? []).map((s) =>
                    s.id === step.id
                      ? { ...s, description: e.target.value }
                      : s,
                  );
                  patch({ nextSteps });
                }}
                placeholder="Description"
                className="w-full rounded-md border border-[#dbe1ea] px-2 py-1.5 text-[12.5px] outline-none focus:border-brand"
              />
            </div>
          ))}
          {(ux.nextSteps ?? []).length === 0 ? (
            <p className="text-[12px] text-faint">
              No timeline steps. Defaults load when you enable the pack-style
              experience — or add your own.
            </p>
          ) : null}
        </div>
        {(ux.nextSteps ?? []).length === 0 ? (
          <button
            type="button"
            onClick={() =>
              patch({
                nextSteps: DEFAULT_SUBMISSION_UX.nextSteps?.map((s) => ({
                  ...s,
                  id: newNextStepId(),
                })),
              })
            }
            className="mt-2 w-full rounded-lg border border-dashed border-[#dbe1ea] px-2 py-2 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            Use default timeline
          </button>
        ) : null}
      </div>

      <div className="border-t border-[#edf0f5] pt-3">
        <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
          Booking confirmation
        </p>
        <label className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={Boolean(ux.booking?.enabled)}
            onChange={(e) =>
              patch({
                booking: { ...ux.booking, enabled: e.target.checked },
              })
            }
          />
          Show booking CTA
        </label>
        {ux.booking?.enabled ? (
          <div className="flex flex-col gap-2">
            <input
              value={ux.booking.label ?? ""}
              onChange={(e) =>
                patch({
                  booking: { ...ux.booking, label: e.target.value },
                })
              }
              placeholder="Button label"
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
            <input
              type="url"
              value={ux.booking.url ?? ""}
              onChange={(e) =>
                patch({
                  booking: { ...ux.booking, url: e.target.value },
                })
              }
              placeholder="https://cal.com/…"
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
        ) : null}
      </div>

      <div className="border-t border-[#edf0f5] pt-3">
        <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
          Download proposal
        </p>
        <label className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={Boolean(ux.proposal?.enabled)}
            onChange={(e) =>
              patch({
                proposal: { ...ux.proposal, enabled: e.target.checked },
              })
            }
          />
          Show proposal download
        </label>
        {ux.proposal?.enabled ? (
          <div className="flex flex-col gap-2">
            <input
              value={ux.proposal.label ?? ""}
              onChange={(e) =>
                patch({
                  proposal: { ...ux.proposal, label: e.target.value },
                })
              }
              placeholder="Button label"
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
            <input
              type="url"
              value={ux.proposal.url ?? ""}
              onChange={(e) =>
                patch({
                  proposal: { ...ux.proposal, url: e.target.value },
                })
              }
              placeholder="https://…/proposal.pdf"
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
