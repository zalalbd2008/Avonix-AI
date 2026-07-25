import { PageHeader } from "@/components/shell/page-header";
import { requireAgency } from "@/lib/auth/session";
import {
  ensureTemplateRoles,
  listMembers,
  listPendingInvites,
  listRoles,
  permissionGroups,
} from "@/lib/team/service";
import { TeamPanel } from "./team-panel";
import { TeamInviteButton } from "./invite-button";

/**
 * Route: /settings/members
 * Full organization team workspace (ADR-013).
 */
export default async function MembersPage() {
  const ctx = await requireAgency();
  const canManage = ctx.role === "owner" || ctx.role === "admin";

  // Seed missing templates so a fresh org is not stuck on an empty Roles grid.
  if (canManage) {
    await ensureTemplateRoles(ctx.agencyId);
  }

  const [members, roles, invites] = await Promise.all([
    listMembers(ctx.agencyId),
    listRoles(ctx.agencyId),
    canManage ? listPendingInvites(ctx.agencyId) : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        title="Role Management"
        subtitle={`Members, roles, and permissions for ${ctx.agencyName}`}
        action={canManage ? <TeamInviteButton /> : undefined}
      />
      <TeamPanel
        canManage={canManage}
        members={members}
        roles={roles}
        invites={invites}
        permissionGroups={permissionGroups()}
        currentUserId={ctx.userId}
        agencyName={ctx.agencyName}
      />
    </div>
  );
}
