import { and, eq, isNull } from "drizzle-orm";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { clients, websites } from "@/lib/db/schema";
import { homeStepToWizardIndex } from "@/lib/launchpad/steps";
import { LaunchpadWizard } from "@/components/launchpad/launchpad-wizard";

/**
 * Route: /launchpad/setup
 *
 * Full hybrid wizard — started from Launchpad home “Start setup / Start step”.
 * Optional query: client, website, step (1–6 home/wizard), key (one-time).
 */
export default async function LaunchpadSetupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAgency();
  const sp = await searchParams;

  const clientId = typeof sp.client === "string" ? sp.client : null;
  const websiteId = typeof sp.website === "string" ? sp.website : null;
  const key = typeof sp.key === "string" ? sp.key : null;
  const stepRaw = typeof sp.step === "string" ? Number(sp.step) : NaN;

  let initialClientName: string | null = null;
  let initialWebsiteName: string | null = null;
  let initialStep = 0;

  if (Number.isFinite(stepRaw) && stepRaw >= 1) {
    // Accept either home step (1–4) or wizard step (1–6)
    if (stepRaw <= 4 && !websiteId) {
      initialStep = homeStepToWizardIndex(stepRaw);
    } else {
      initialStep = Math.min(Math.max(Math.floor(stepRaw) - 1, 0), 5);
    }
  } else if (websiteId) {
    initialStep = key ? 2 : 3;
  } else if (clientId) {
    initialStep = 1;
  }

  if (clientId || websiteId) {
    await withAgency(ctx.agencyId, async (tx) => {
      if (clientId) {
        const [c] = await tx
          .select({ name: clients.name })
          .from(clients)
          .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
          .limit(1);
        initialClientName = c?.name ?? null;
      }
      if (websiteId) {
        const [w] = await tx
          .select({ name: websites.name, clientId: websites.clientId })
          .from(websites)
          .where(and(eq(websites.id, websiteId), isNull(websites.deletedAt)))
          .limit(1);
        initialWebsiteName = w?.name ?? null;
      }
    });
  }

  return (
    <LaunchpadWizard
      initialStep={initialStep}
      initialClientId={clientId}
      initialClientName={initialClientName}
      initialWebsiteId={websiteId}
      initialWebsiteName={initialWebsiteName}
      initialKey={key}
    />
  );
}
