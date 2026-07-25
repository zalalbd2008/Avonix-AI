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
  automation: {
    title: "Automation",
    subtitle: "Rules that run for this website",
    body: "Automations that fire on lead capture or chat handoff will live here. Until then, the inbox and pipeline are the workflow.",
  },
  email: {
    title: "Email",
    subtitle: "SMTP and campaigns for this website",
    body: "Outbound email and delivery health are not wired per website yet. Agency branding and reply tokens cover the paths that exist today.",
  },
  insights: {
    title: "Insights",
    subtitle: "AI-detected opportunities for this website",
    body: "Suggested actions from traffic and conversion patterns. Needs the reports data and enough history to be trustworthy.",
  },
  integrations: {
    title: "Integrations",
    subtitle: "Third-party connections for this website",
    body: "The connector is the integration that exists today. Additional CRMs, webhooks and apps will list here when they ship.",
  },
  team: {
    title: "Team",
    subtitle: "Who can work on this website",
    body: "Membership is agency-wide today. Per-website roles would be a second permission layer on top of that.",
  },
  health: {
    title: "Health",
    subtitle: "Site health score and checks",
    body: "Health scores in the prototype were illustrative. Real monitoring is out of v1 — see ADR-001.",
  },
  backups: {
    title: "Backups",
    subtitle: "Backup and restore for this site",
    body: "Backups belong to the host or a dedicated backup plugin. Avonix does not store site files.",
  },
  security: {
    title: "Security",
    subtitle: "Hardening and security scans",
    body: "Security scanning is outside the connector's remit for v1. Connector keys and rotation live under Settings.",
  },
  "error-log": {
    title: "Error Log",
    subtitle: "Runtime errors from this website",
    body: "Collecting PHP / JS errors from the connector is planned after inbound event delivery is solid.",
  },
  "audit-log": {
    title: "Audit Log",
    subtitle: "Every action on this website, logged",
    body: "Agency activity is not yet recorded per website. An audit trail needs a write path that does not exist today.",
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
