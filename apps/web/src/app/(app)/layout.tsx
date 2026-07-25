import { Shell } from "@/components/shell/shell";
import { requireAgency } from "@/lib/auth/session";
import { switcherClients } from "@/lib/clients/switcher";

/**
 * Shell for everything inside the agency.
 *
 * `requireAgency()` is the guard: signed out redirects to sign-in, signed in
 * without an agency redirects to onboarding. Nothing below this line renders
 * without a tenant.
 *
 * The frame itself is a client component — the sidebar and breadcrumbs both key
 * off the current path, which the server does not have.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAgency();
  const { clients, truncated } = await switcherClients(ctx.agencyId);

  return (
    <Shell
      agencyName={ctx.agencyName}
      role={ctx.role}
      locale={ctx.locale}
      permissions={ctx.permissions}
      clients={clients}
      truncated={truncated}
      organizationCount={ctx.organizationCount}
      platformAccess={ctx.platformAccess}
    >
      {children}
    </Shell>
  );
}
