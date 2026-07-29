import { PlatformShell } from "@/components/shell/platform-shell";
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
    <PlatformShell
      ownerName={owner.userName}
      ownerEmail={owner.userEmail}
      ownerImage={owner.userImage}
    >
      {children}
    </PlatformShell>
  );
}
