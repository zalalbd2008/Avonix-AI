import Link from "next/link";
import { notFound } from "next/navigation";
import { EnterOrganizationButton } from "@/components/platform/enter-organization-button";
import { PageHeader } from "@/components/shell/page-header";
import { PlatformOrganizationEditor } from "@/components/platform/platform-organization-editor";
import { timeAgo } from "@/components/ui/status-pill";
import { requirePlatformOwner } from "@/lib/auth/session";
import {
  ensureNoFreeOrTrialPlans,
  getPlatformOrganization,
} from "@/lib/platform/organizations";
import { effectivePlanLimits } from "@/lib/plans";

/**
 * Route: /platform/workspaces/[agencyId]
 * Platform Owner drill-down — view, edit, limits, delete, open workspace.
 */
export default async function PlatformOrganizationDetailPage({
  params,
}: {
  params: Promise<{ agencyId: string }>;
}) {
  await requirePlatformOwner();
  await ensureNoFreeOrTrialPlans();
  const { agencyId } = await params;
  const org = await getPlatformOrganization(agencyId);
  if (!org) notFound();

  const limits = effectivePlanLimits(org.plan, org.overrides);

  const metrics = [
    { value: org.clients, label: "Clients" },
    { value: org.websites, label: "Websites" },
    { value: org.members, label: "Members" },
    {
      value: Number.isFinite(limits.maxClients)
        ? `${org.clients}/${limits.maxClients}`
        : `${org.clients}/∞`,
      label: "Client limit",
    },
  ];

  return (
    <div>
      <PageHeader
        title={org.name}
        subtitle={`${org.slug} · ${org.status.replace("_", " ")} · created ${timeAgo(org.createdAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <EnterOrganizationButton agencyId={org.id} />
            <Link
              href={"/platform/workspaces" as never}
              className="rounded-lg border border-line px-3.5 py-2.5 text-[13px] font-semibold text-muted hover:border-brand hover:text-ink"
            >
              ← All organizations
            </Link>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-[10px] border border-line bg-white px-4 pt-4 pb-3.5"
          >
            <div className="text-2xl font-bold tracking-[-0.02em]">{m.value}</div>
            <div className="mt-[3px] text-[12.5px] text-muted">{m.label}</div>
          </div>
        ))}
      </div>

      <section className="mb-5 overflow-hidden rounded-xl border border-line bg-white">
        <div className="border-b border-[#edf0f5] px-4 py-[13px] text-sm font-semibold">
          Organization owner
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="grid size-8 place-items-center rounded-lg bg-navy text-[13px] font-semibold text-white">
            {(org.ownerName || org.ownerEmail || "?").charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-semibold">
              {org.ownerName || "No owner membership"}
            </span>
            <span className="block truncate text-[12.5px] text-muted">
              {org.ownerEmail || "—"}
            </span>
          </span>
          {org.overrides.suspended ? (
            <span className="ml-auto rounded-full bg-[#fef6e7] px-2.5 py-[3px] text-[11px] font-bold text-warn">
              Suspended
            </span>
          ) : null}
        </div>
      </section>

      <PlatformOrganizationEditor org={org} />
    </div>
  );
}
