import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { PlatformOrganizationsPanel } from "@/components/platform/platform-organizations-panel";
import { requirePlatformOwner } from "@/lib/auth/session";
import { ensureNoFreeOrTrialPlans } from "@/lib/platform/organizations";
import {
  getPlatformOrganizationStats,
  listPlatformOrganizations,
} from "@/lib/platform/organizations";

/**
 * Route: /platform/workspaces — Accounts → Organizations (ADR-013).
 * Cross-tenant customer inventory for Platform Owners.
 */
export default async function PlatformOrganizationsPage() {
  await requirePlatformOwner();
  await ensureNoFreeOrTrialPlans();
  const orgs = await listPlatformOrganizations();
  const stats = await getPlatformOrganizationStats(orgs);

  const metrics = [
    { value: stats.total, label: "Organizations" },
    { value: stats.active, label: "Active" },
    { value: stats.pastDue, label: "Past due" },
    { value: stats.canceled, label: "Canceled" },
  ];

  return (
    <div>
      <PageHeader
        title="Organizations"
        subtitle="Every customer organization (tenant) on the platform — open, edit, or delete any workspace"
        action={
          <Link
            href={"/platform/workspaces/new" as never}
            className="rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            + Create organization
          </Link>
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

      <div className="mb-4 flex flex-wrap gap-2 text-[12px] text-muted">
        <span className="rounded-full bg-[#f1f4f8] px-2.5 py-1 font-semibold">
          Starter {stats.starter}
        </span>
        <span className="rounded-full bg-[rgba(13,148,136,.1)] px-2.5 py-1 font-semibold text-ok">
          Professional {stats.professional}
        </span>
        <span className="rounded-full bg-[rgba(255,102,0,.1)] px-2.5 py-1 font-semibold text-brand">
          Agency {stats.agency}
        </span>
        <span className="rounded-full bg-[rgba(11,30,58,.1)] px-2.5 py-1 font-semibold text-navy">
          Enterprise {stats.enterprise}
        </span>
      </div>

      <PlatformOrganizationsPanel orgs={orgs} />
    </div>
  );
}
