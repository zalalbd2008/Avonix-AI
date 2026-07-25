/**
 * Launchpad — step-by-step client & website setup (post-onboarding).
 */

/** Home checklist cards (overview). */
export const LAUNCHPAD_STEPS = [
  {
    id: "client",
    number: 1,
    title: "Add a client",
    description: "Create the business you work for. Websites and leads live inside it.",
  },
  {
    id: "website",
    number: 2,
    title: "Connect a website",
    description: "Register their WordPress site so leads have a source.",
  },
  {
    id: "plugin",
    number: 3,
    title: "Install the plugin",
    description: "Download the Avonix connector and upload it in WordPress.",
  },
  {
    id: "verify",
    number: 4,
    title: "Verify connection",
    description: "Paste the connector key and confirm the site shows as connected.",
  },
] as const;

/** Full wizard steps inside `/launchpad/setup`. */
export const WIZARD_STEPS = [
  { id: "client", number: 1, label: "Client" },
  { id: "website", number: 2, label: "Website" },
  { id: "plugin", number: 3, label: "Plugin" },
  { id: "connect", number: 4, label: "Connect" },
  { id: "verify", number: 5, label: "Verify" },
  { id: "done", number: 6, label: "Done" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

export type LaunchpadStepId = (typeof LAUNCHPAD_STEPS)[number]["id"];

export type LaunchpadWebsite = {
  id: string;
  name: string;
  url: string;
  status: "pending" | "connected" | "disconnected";
};

export type LaunchpadClient = {
  id: string;
  name: string;
  websites: LaunchpadWebsite[];
};

export type LaunchpadSnapshot = {
  clients: LaunchpadClient[];
  clientCount: number;
  websiteCount: number;
  connectedCount: number;
  pendingCount: number;
  /** 0–100 overall setup completion across the agency. */
  progressPercent: number;
  /** First incomplete step for the agency-wide checklist (1–4, or 5 if done). */
  nextStepNumber: number;
};

export function clientSetupStep(client: LaunchpadClient): number {
  if (client.websites.length === 0) return 2;
  if (client.websites.every((w) => w.status !== "connected")) return 3;
  return 5;
}

export function computeLaunchpadSnapshot(
  clients: LaunchpadClient[],
): LaunchpadSnapshot {
  const websiteCount = clients.reduce((n, c) => n + c.websites.length, 0);
  const connectedCount = clients.reduce(
    (n, c) => n + c.websites.filter((w) => w.status === "connected").length,
    0,
  );
  const pendingCount = websiteCount - connectedCount;

  let progressPercent = 0;
  if (clients.length === 0) {
    progressPercent = 0;
  } else {
    const scores = clients.map((c) => {
      if (c.websites.length === 0) return 25;
      if (c.websites.some((w) => w.status === "connected")) return 100;
      return 50;
    });
    progressPercent = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length,
    );
  }

  let nextStepNumber = 1;
  if (clients.length === 0) nextStepNumber = 1;
  else if (websiteCount === 0) nextStepNumber = 2;
  else if (connectedCount === 0) nextStepNumber = 3;
  else if (pendingCount > 0) nextStepNumber = 4;
  else nextStepNumber = 5;

  return {
    clients,
    clientCount: clients.length,
    websiteCount,
    connectedCount,
    pendingCount,
    progressPercent,
    nextStepNumber,
  };
}

/** Best client target for the next website / connect step. */
export function pickSetupTarget(snapshot: LaunchpadSnapshot): LaunchpadClient | null {
  const incomplete = snapshot.clients.find(
    (c) =>
      c.websites.length === 0 || c.websites.some((w) => w.status !== "connected"),
  );
  return incomplete ?? snapshot.clients[0] ?? null;
}

/** Map home checklist step (1–4) → wizard step index (0-based). */
export function homeStepToWizardIndex(homeStep: number): number {
  if (homeStep <= 1) return 0;
  if (homeStep === 2) return 1;
  if (homeStep === 3) return 2;
  if (homeStep === 4) return 3;
  return 0;
}
