import { count, eq, isNull } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { requireAgency } from "@/lib/auth/session";
import { listOrganizations } from "@/lib/agency/organizations";
import { withAgency } from "@/lib/db";
import { agencies, clients, websites } from "@/lib/db/schema";
import { OrganizationCard } from "./organization-card";
import Link from "next/link";

/**
 * Route: /organizations
 *
 * Membership list for org users (ADR-006). Platform Owners managing via
 * impersonation are not members — show the org they currently have open,
 * and send them to Platform to switch tenants.
 */
export default async function OrganizationsPage() {
  const ctx = await requireAgency();

  if (ctx.platformAccess) {
    const detail = await withAgency(ctx.agencyId, async (tx) => {
      const [[agency], [clientCount], [websiteCount]] = await Promise.all([
        tx
          .select({
            plan: agencies.plan,
            status: agencies.status,
          })
          .from(agencies)
          .where(eq(agencies.id, ctx.agencyId))
          .limit(1),
        tx.select({ n: count() }).from(clients).where(isNull(clients.deletedAt)),
        tx
          .select({ n: count() })
          .from(websites)
          .where(isNull(websites.deletedAt)),
      ]);
      return {
        plan: agency?.plan ?? "starter",
        status: agency?.status ?? "active",
        clients: clientCount.n,
        websites: websiteCount.n,
      };
    });

    return (
      <div>
        <PageHeader
          title="Organization"
          subtitle="Platform Owner access — this is the customer tenant you are managing"
          action={
            <Link
              href={"/platform/workspaces" as never}
              className="rounded-lg border border-line px-3.5 py-2.5 text-[13px] font-semibold text-muted hover:border-brand hover:text-ink"
            >
              All organizations →
            </Link>
          }
        />

        <div className="max-w-md">
          <OrganizationCard
            org={{
              id: ctx.agencyId,
              name: ctx.agencyName,
              plan: detail.plan,
              status: detail.status,
              role: "owner",
              clients: detail.clients,
              websites: detail.websites,
            }}
            active
            platformAccess
          />
        </div>

        <p className="mt-4 text-[12px] text-faint">
          You are not a member of this organization. To open a different tenant,
          use the Platform Organizations list. Complimentary create also lives
          there.
        </p>
      </div>
    );
  }

  const orgs = await listOrganizations(ctx.userId);

  return (
    <div>
      <PageHeader
        title="Organizations"
        subtitle="Top level — each organization owns its own clients, websites and billing"
        action={
          <Link
            href={"/organizations/new" as never}
            className="rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            + New organization
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {orgs.map((org) => (
          <OrganizationCard
            key={org.id}
            org={org}
            active={org.id === ctx.agencyId}
          />
        ))}

        <Link
          href={"/organizations/new" as never}
          className="grid min-h-[130px] place-items-center rounded-xl border-[1.5px] border-dashed border-[#c3ccd9] text-[13px] font-semibold text-faint hover:border-brand hover:text-brand"
        >
          + New organization
        </Link>
      </div>

      <p className="mt-4 text-[12px] text-faint">
        Organizations are fully separate. Nothing — clients, contacts, billing or
        connector keys — is shared between them, and a query in one cannot reach
        another: the database enforces it, not this page.
      </p>
    </div>
  );
}
