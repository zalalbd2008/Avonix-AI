import type { FormUxConfig } from "@/lib/db/schema";

export const DEFAULT_UX: FormUxConfig = {
  autoSaveDraft: true,
  allowResume: true,
  draftTtlDays: 7,
  stickyProgress: false,
  enterToContinue: true,
  showDarkToggle: true,
};

export function normalizeUx(raw?: FormUxConfig | null): FormUxConfig {
  return {
    autoSaveDraft: raw?.autoSaveDraft !== false,
    allowResume: raw?.allowResume !== false,
    draftTtlDays: clampDays(raw?.draftTtlDays),
    stickyProgress: Boolean(raw?.stickyProgress),
    enterToContinue: raw?.enterToContinue !== false,
    showDarkToggle: raw?.showDarkToggle !== false,
  };
}

function clampDays(n?: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 7;
  return Math.min(90, Math.max(1, Math.round(n)));
}
