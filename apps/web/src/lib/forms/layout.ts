import type {
  FormChrome,
  FormFlowMode,
  FormLayoutConfig,
  FormMount,
  FormSettings,
  FormStep,
} from "@/lib/db/schema";

/** How the respondent moves through the form. */
export const FLOW_MODES: {
  id: FormFlowMode;
  label: string;
  hint: string;
}[] = [
  { id: "single", label: "Single step", hint: "All fields on one page" },
  { id: "wizard", label: "Multi-step wizard", hint: "Back / Continue between pages" },
  {
    id: "conversational",
    label: "Conversational",
    hint: "One question at a time",
  },
  { id: "card", label: "Card layout", hint: "Each page as a card" },
  {
    id: "accordion",
    label: "Accordion sections",
    hint: "Expand / collapse pages in place",
  },
];

/** Where the form lives on the page. */
export const MOUNT_MODES: {
  id: FormMount;
  label: string;
  hint: string;
}[] = [
  { id: "embedded", label: "Embedded", hint: "Inline on the page" },
  { id: "popup", label: "Popup", hint: "Modal overlay" },
  { id: "slide_in", label: "Slide-in", hint: "Panel from the side" },
  { id: "fullscreen", label: "Fullscreen", hint: "Takes the whole viewport" },
];

export const PROGRESS_STYLES: {
  id: FormChrome["progress"];
  label: string;
}[] = [
  { id: "none", label: "None" },
  { id: "line", label: "Line" },
  { id: "number", label: "Numbers" },
  { id: "circle", label: "Circles" },
  { id: "percentage", label: "Percentage" },
];

export const DEFAULT_LAYOUT: FormLayoutConfig = {
  mode: "single",
  mount: "embedded",
  chrome: {
    progress: "none",
    progressPlacement: "top",
    showStepTitles: true,
  },
};

export function resolveFormLayout(
  settings?: FormSettings | null,
): FormLayoutConfig {
  return normalizeFormLayout(settings?.layout, settings?.steps);
}

export function normalizeFormLayout(
  raw?: FormLayoutConfig | null,
  steps?: FormStep[],
): FormLayoutConfig {
  const stepCount = steps?.length ?? 1;
  const inferredMode: FormFlowMode =
    stepCount > 1 ? "wizard" : "single";

  const mode = isFlowMode(raw?.mode) ? raw!.mode : inferredMode;
  const mount = isMount(raw?.mount) ? raw!.mount : "embedded";

  const progressDefault: FormChrome["progress"] =
    mode === "single" || mode === "accordion" ? "none" : "line";

  const chromeRaw = raw?.chrome;
  const progress = isProgress(chromeRaw?.progress)
    ? chromeRaw!.progress
    : progressDefault;
  const progressPlacement =
    chromeRaw?.progressPlacement === "sidebar" ? "sidebar" : "top";
  const showStepTitles = chromeRaw?.showStepTitles !== false;

  return {
    mode,
    mount,
    chrome: {
      progress:
        mode === "single" && progress === "line" ? "none" : progress,
      progressPlacement: mode === "wizard" || mode === "card" ? progressPlacement : "top",
      showStepTitles,
    },
  };
}

function isFlowMode(v: unknown): v is FormFlowMode {
  return (
    v === "single" ||
    v === "wizard" ||
    v === "conversational" ||
    v === "card" ||
    v === "accordion"
  );
}

function isMount(v: unknown): v is FormMount {
  return (
    v === "embedded" ||
    v === "popup" ||
    v === "slide_in" ||
    v === "fullscreen"
  );
}

function isProgress(v: unknown): v is FormChrome["progress"] {
  return (
    v === "none" ||
    v === "line" ||
    v === "number" ||
    v === "circle" ||
    v === "percentage"
  );
}

/** Progress fraction 0–1 for chrome UI. */
export function layoutProgressRatio(current: number, total: number): number {
  if (total <= 1) return 1;
  return Math.min(1, Math.max(0, (current + 1) / total));
}
