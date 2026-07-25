import { requireAgency } from "@/lib/auth/session";
import { loadLaunchpadSnapshot } from "@/lib/launchpad/data";
import { LaunchpadDashboard } from "@/components/launchpad/launchpad-dashboard";

/**
 * Route: /launchpad
 *
 * Step-by-step configuration hub — add clients, connect websites, install
 * the WordPress plugin, and verify each site.
 */
export default async function LaunchpadPage() {
  const ctx = await requireAgency();
  const snapshot = await loadLaunchpadSnapshot(ctx.agencyId);

  return <LaunchpadDashboard snapshot={snapshot} />;
}
