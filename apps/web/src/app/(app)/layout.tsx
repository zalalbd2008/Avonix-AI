import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { agencyNav } from "@/lib/nav";
import { requireAgency } from "@/lib/auth/session";

/**
 * Shell for everything inside the agency.
 *
 * `requireAgency()` is the guard: signed out redirects to sign-in, signed in
 * without an agency redirects to onboarding. Nothing below this line renders
 * without a tenant.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAgency();

  return (
    <div className="flex h-screen flex-col overflow-hidden text-sm">
      <Topbar>
        <span className="text-[13px] font-medium text-muted">{ctx.agencyName}</span>
        <div className="ml-auto flex items-center gap-3.5">
          <span className="text-[12.5px] text-faint">{ctx.userEmail}</span>
          <SignOutButton />
        </div>
      </Topbar>
      <div className="flex min-h-0 flex-1">
        <Sidebar sections={agencyNav} heading="Agency" />
        <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
