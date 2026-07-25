import Link from "next/link";
import { EnterOrganizationButton } from "@/components/platform/enter-organization-button";
import { requirePlatformOwner } from "@/lib/auth/session";
import {
  getPlatformOrganizationStats,
  listPlatformOrganizations,
} from "@/lib/platform/organizations";
import {
  countPlatformOwners,
  getPlatformSettings,
} from "@/lib/platform/owner";

/**
 * Route: /platform — Platform Owner dashboard.
 *
 * Same layout as the organization `/dashboard`: header, alert strip, metric
 * grid, then the primary list (organizations ↔ clients).
 */
export default async function PlatformHomePage() {
  await requirePlatformOwner();

  const [orgs, settings, ownerCount] = await Promise.all([
    listPlatformOrganizations(),
    getPlatformSettings(),
    countPlatformOwners(),
  ]);
  const stats = await getPlatformOrganizationStats(orgs);

  const totalClients = orgs.reduce((n, o) => n + o.clients, 0);
  const totalWebsites = orgs.reduce((n, o) => n + o.websites, 0);
  const totalMembers = orgs.reduce((n, o) => n + o.members, 0);
  const suspended = orgs.filter((o) => o.overrides.suspended).length;
  const complimentary = orgs.filter((o) => o.overrides.complimentary).length;

  const recent = [...orgs]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  const metrics: { value: string; label: string; tone?: string }[] = [
    { value: String(stats.total), label: "Organizations" },
    { value: String(totalClients), label: "Clients" },
    { value: String(totalWebsites), label: "Websites" },
    {
      value: `${stats.active}/${stats.total}`,
      label: "Active",
      tone:
        stats.total === 0
          ? undefined
          : stats.pastDue > 0
            ? "text-warn"
            : "text-ok",
    },
    {
      value: String(stats.pastDue),
      label: "Past due",
      tone: stats.pastDue > 0 ? "text-bad" : "text-ok",
    },
    {
      value: String(suspended),
      label: "Suspended",
      tone: suspended > 0 ? "text-bad" : "text-ok",
    },
    {
      value: `${ownerCount}/${settings.maxPlatformOwners}`,
      label: "Platform Owners",
    },
    { value: String(totalMembers), label: "Org members" },
  ];

  const alerts: string[] = [];
  if (stats.pastDue > 0) {
    alerts.push(
      `${stats.pastDue} ${stats.pastDue === 1 ? "organization" : "organizations"} past due`,
    );
  }
  if (suspended > 0) {
    alerts.push(
      `${suspended} ${suspended === 1 ? "organization" : "organizations"} suspended`,
    );
  }

  return (
    <div>
      <header className="mb-[18px] flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em]">Dashboard</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Every organization&apos;s activity across the platform
            {complimentary > 0
              ? ` · ${complimentary} complimentary`
              : ""}
          </p>
        </div>
        <Link
          href={"/platform/workspaces/new" as never}
          className="text-[12.5px] font-semibold text-brand hover:underline"
        >
          Create organization →
        </Link>
      </header>

      {alerts.length > 0 ? (
        <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-[#ffd9bd] bg-[#fff8f3] px-3.5 py-[11px] text-[13px]">
          <span className="size-2 shrink-0 rounded-full bg-bad" />
          <span>
            {alerts.map((a, i) => (
              <span key={a}>
                {i > 0 && " and "}
                <b>{a}</b>
              </span>
            ))}{" "}
            need attention
          </span>
          <Link
            href={"/platform/workspaces" as never}
            className="ml-auto shrink-0 font-semibold text-brand hover:underline"
          >
            Review →
          </Link>
        </div>
      ) : null}

      <div className="mb-[22px] grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-[10px] border border-line bg-white px-4 pt-4 pb-3.5"
          >
            <div
              className={`text-2xl font-bold tracking-[-0.02em] ${m.tone ?? ""}`}
            >
              {m.value}
            </div>
            <div className="mt-[3px] text-[12.5px] text-muted">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center border-b border-[#edf0f5] px-4 py-[13px]">
          <h2 className="text-sm font-semibold">Organizations</h2>
          <Link
            href={"/platform/workspaces" as never}
            className="ml-auto text-[12.5px] font-semibold text-brand hover:underline"
          >
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[13.5px] font-medium">No organizations yet</p>
            <p className="mt-1 text-[12.5px] text-muted">
              Create a complimentary organization or wait for customer signup.
            </p>
            <Link
              href={"/platform/workspaces/new" as never}
              className="mt-3.5 inline-block rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
            >
              Create organization
            </Link>
          </div>
        ) : (
          recent.map((org) => (
            <div
              key={org.id}
              className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-3 last:border-0 hover:bg-[#f8fafc]"
            >
              <Link
                href={`/platform/workspaces/${org.id}` as never}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-navy text-[13px] font-semibold text-white">
                  {org.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold">
                    {org.name}
                  </span>
                  <span className="block truncate text-[12px] text-muted">
                    {org.plan} · {org.clients} clients · {org.websites} websites
                    {org.overrides.suspended ? " · suspended" : ""}
                  </span>
                </span>
              </Link>
              <EnterOrganizationButton
                agencyId={org.id}
                label="Open"
                className="shrink-0 rounded-md bg-navy px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#162a45] disabled:opacity-60"
              />
              <Link
                href={`/platform/workspaces/${org.id}` as never}
                className="text-[#c3ccd9] hover:text-ink"
                aria-label="Manage"
              >
                ›
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
