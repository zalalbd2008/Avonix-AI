import { notFound } from "next/navigation";
import { NotBuilt } from "@/components/not-built";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/[feature]
 *
 * Catch-all for website menu items that exist in the prototype sidebar but are
 * not productised yet. Static siblings (reports, chat-ai, settings, knowledge)
 * win over this segment, so those keep their real pages.
 */
const FEATURES: Record<
  string,
  { title: string; subtitle: string; body: string; planned?: string[] }
> = {
  popup: {
    title: "Popup",
    subtitle: "Popups shown on this website only",
    body: "Exit-intent, timed and scroll popups are in the prototype. They are not built here yet — shipping a half-working popup that never fires is worse than none.",
  },
  team: {
    title: "Team",
    subtitle: "Who can work on this website",
    body: "Membership is agency-wide today. Per-website roles would be a second permission layer on top of that.",
  },
};

export default async function WebsiteFeatureStubPage({
  params,
}: {
  params: Promise<{ clientId: string; websiteId: string; feature: string }>;
}) {
  const { clientId, websiteId, feature } = await params;
  const meta = FEATURES[feature];
  if (!meta) notFound();

  return (
    <NotBuilt
      title={meta.title}
      subtitle={meta.subtitle}
      lead="Not built yet"
      body={meta.body}
      planned={meta.planned}
      backHref={`/clients/${clientId}/websites/${websiteId}`}
      backLabel="← Back to website"
    />
  );
}
