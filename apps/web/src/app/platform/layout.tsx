import Link from "next/link";
import { PlatformSidebar } from "@/components/shell/platform-sidebar";
import { PlatformUserMenu } from "@/components/shell/platform-user-menu";
import { requirePlatformOwner } from "@/lib/auth/session";

/**
 * Platform Owner shell (ADR-012 / ADR-013).
 * Outside `(app)` so requireAgency does not block owners without a membership.
 */
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const owner = await requirePlatformOwner();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface text-ink text-sm">
      <header className="flex h-[50px] shrink-0 items-center gap-3 border-b border-line bg-white px-4">
        <Link
          href={"/platform" as never}
          className="flex items-center gap-2"
        >
          <span className="grid size-[26px] place-items-center rounded-[7px] bg-brand text-sm font-bold text-white">
            A
          </span>
          <span className="text-[14px] font-bold tracking-tight">
            Avonix Platform
          </span>
        </Link>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
          Platform Owner
        </span>
        <PlatformUserMenu
          name={owner.userName}
          email={owner.userEmail}
          image={owner.userImage}
        />
      </header>
      <div className="flex min-h-0 flex-1">
        <PlatformSidebar />
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-[26px]">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
