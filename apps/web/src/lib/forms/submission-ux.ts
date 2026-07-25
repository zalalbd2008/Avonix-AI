import type {
  FormSubmissionNextStep,
  FormSubmissionUx,
} from "@/lib/db/schema";

export const DEFAULT_SUBMISSION_UX: FormSubmissionUx = {
  animated: true,
  confetti: false,
  headline: "",
  subtext: "We'll review your submission and get back to you shortly.",
  nextStepsTitle: "What happens next",
  nextSteps: [
    {
      id: "step_1",
      title: "We review your answers",
      description: "Usually within one business day.",
    },
    {
      id: "step_2",
      title: "You get a confirmation",
      description: "Email with next steps and timing.",
    },
    {
      id: "step_3",
      title: "Kickoff or follow-up",
      description: "Call, proposal, or project start.",
    },
  ],
  booking: {
    enabled: false,
    label: "Book a call",
    url: "",
  },
  proposal: {
    enabled: false,
    label: "Download proposal",
    url: "",
  },
  redirectDelayMs: 1500,
};

export function normalizeSubmissionUx(
  raw?: FormSubmissionUx | null,
): FormSubmissionUx {
  const nextSteps = normalizeNextSteps(raw?.nextSteps);
  const booking = {
    enabled: Boolean(raw?.booking?.enabled),
    label: (raw?.booking?.label?.trim() || "Book a call").slice(0, 60),
    url: (raw?.booking?.url?.trim() || "").slice(0, 2000),
  };
  const proposal = {
    enabled: Boolean(raw?.proposal?.enabled),
    label: (raw?.proposal?.label?.trim() || "Download proposal").slice(0, 60),
    url: (raw?.proposal?.url?.trim() || "").slice(0, 2000),
  };

  return {
    animated: raw?.animated !== false,
    confetti: Boolean(raw?.confetti),
    ...(raw?.headline?.trim()
      ? { headline: raw.headline.trim().slice(0, 160) }
      : {}),
    ...(raw?.subtext?.trim()
      ? { subtext: raw.subtext.trim().slice(0, 400) }
      : { subtext: DEFAULT_SUBMISSION_UX.subtext }),
    ...(raw?.nextStepsTitle?.trim()
      ? { nextStepsTitle: raw.nextStepsTitle.trim().slice(0, 80) }
      : { nextStepsTitle: DEFAULT_SUBMISSION_UX.nextStepsTitle }),
    ...(nextSteps.length ? { nextSteps } : {}),
    booking,
    proposal,
    redirectDelayMs: clampDelay(raw?.redirectDelayMs),
  };
}

function normalizeNextSteps(
  raw?: FormSubmissionNextStep[] | null,
): FormSubmissionNextStep[] {
  if (!Array.isArray(raw)) return [];
  const out: FormSubmissionNextStep[] = [];
  for (const [i, s] of raw.entries()) {
    const title = s?.title?.trim();
    if (!title) continue;
    out.push({
      id: (s.id?.trim() || `step_${i + 1}`).slice(0, 40),
      title: title.slice(0, 100),
      ...(s.description?.trim()
        ? { description: s.description.trim().slice(0, 240) }
        : {}),
    });
    if (out.length >= 8) break;
  }
  return out;
}

function clampDelay(n?: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 1500;
  return Math.min(10_000, Math.max(0, Math.round(n)));
}

export function newNextStepId(): string {
  return `step_${Math.random().toString(36).slice(2, 8)}`;
}

/** True when the UX has anything beyond a plain message. */
export function submissionUxIsRich(ux: FormSubmissionUx): boolean {
  return (
    ux.animated !== false ||
    Boolean(ux.confetti) ||
    Boolean(ux.nextSteps?.length) ||
    Boolean(ux.booking?.enabled && ux.booking.url) ||
    Boolean(ux.proposal?.enabled && ux.proposal.url)
  );
}
