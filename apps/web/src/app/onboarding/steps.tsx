"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { onboardingSteps } from "@/lib/nav";

const PROGRESS_KEY = "avonix_onboarding_progress";

type Progress = { client?: string; key?: string };

function readProgress(): Progress {
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Progress;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeProgress(patch: Progress) {
  try {
    sessionStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ ...readProgress(), ...patch }),
    );
  } catch {
    // sessionStorage may be unavailable — links still work without query params
  }
}

/** Billing sits after agency create; treat it as the agency step for the indicator. */
function currentStepIndex(pathname: string): number {
  const exact = onboardingSteps.findIndex((s) => s.href === pathname);
  if (exact >= 0) return exact;
  if (pathname.startsWith("/onboarding/billing")) return 1;
  if (pathname.startsWith("/onboarding/done")) return onboardingSteps.length;
  return -1;
}

function stepHref(href: string, progress: Progress): string {
  if (href === "/onboarding/website" && progress.client) {
    return `${href}?client=${encodeURIComponent(progress.client)}`;
  }
  if (
    (href === "/onboarding/plugin" || href === "/onboarding/connector") &&
    progress.key
  ) {
    return `${href}?key=${encodeURIComponent(progress.key)}`;
  }
  return href;
}

/**
 * The step indicator.
 *
 * Completed steps are links so the user can jump back in the wizard. Future
 * steps stay inert so they cannot skip ahead.
 */
function OnboardingStepsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = currentStepIndex(pathname);

  const client = searchParams.get("client") ?? undefined;
  const key = searchParams.get("key") ?? undefined;
  const [stored, setStored] = useState<Progress>({});

  useEffect(() => {
    const patch: Progress = {};
    if (client) patch.client = client;
    if (key) patch.key = key;
    if (patch.client || patch.key) {
      writeProgress(patch);
      setStored(readProgress());
    } else {
      setStored(readProgress());
    }
  }, [client, key]);

  const progress: Progress = {
    client: client ?? stored.client,
    key: key ?? stored.key,
  };

  return (
    <ol className="mb-6 flex gap-1.5">
      {onboardingSteps.map((step, i) => {
        const done = current > -1 && i < current;
        const active = i === current;
        const clickable = done;

        const circle = (
          <span
            className={`grid size-5.5 place-items-center rounded-full text-[11px] font-bold ${
              active
                ? "bg-brand text-white"
                : done
                  ? "bg-ok text-white"
                  : "bg-line text-faint"
            }`}
          >
            {done ? "✓" : i + 1}
          </span>
        );

        const label = (
          <span
            className={`text-[11px] ${
              active
                ? "font-semibold text-ink"
                : done
                  ? "font-medium text-muted"
                  : "text-faint"
            }`}
          >
            {step.label}
          </span>
        );

        if (clickable) {
          return (
            <li
              key={step.href}
              className="flex flex-1 flex-col items-center gap-1.5 text-center"
            >
              <Link
                href={stepHref(step.href, progress) as never}
                className="flex flex-col items-center gap-1.5 rounded-md outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {circle}
                {label}
              </Link>
            </li>
          );
        }

        return (
          <li
            key={step.href}
            className="flex flex-1 flex-col items-center gap-1.5 text-center"
            aria-current={active ? "step" : undefined}
          >
            {circle}
            {label}
          </li>
        );
      })}
    </ol>
  );
}

export function OnboardingSteps() {
  return (
    <Suspense fallback={<ol className="mb-6 flex h-[42px] gap-1.5" />}>
      <OnboardingStepsInner />
    </Suspense>
  );
}
