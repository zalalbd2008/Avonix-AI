import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { requireAgency } from "@/lib/auth/session";
import {
  getRole,
  listMembers,
  permissionGroups,
} from "@/lib/team/service";
import { RoleDetailPanel } from "./role-detail-panel";

/**
 * Route: /settings/members/roles/[roleId]
 * Full-page role permissions editor.
 */
export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  const ctx = await requireAgency();
  const canManage = ctx.role === "owner" || ctx.role === "admin";

  const [role, members] = await Promise.all([
    getRole(ctx.agencyId, roleId),
    listMembers(ctx.agencyId),
  ]);

  if (!role) notFound();

  const assigned = members.filter((m) => m.customRoleId === role.id);

  return (
    <div>
      <PageHeader
        title={role.name}
        subtitle={
          role.description ||
          "Permissions for this organization role"
        }
        action={
          <Link
            href={"/settings/members" as never}
            className="rounded-lg border border-line px-3.5 py-2.5 text-[13px] font-semibold text-muted hover:border-[#4E9C86] hover:text-[#2f6b52]"
          >
            ← All roles
          </Link>
        }
      />
      <RoleDetailPanel
        role={{
          id: role.id,
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          permissions: role.permissions,
        }}
        assignedMembers={assigned.map((m) => ({
          membershipId: m.membershipId,
          name: m.name,
          email: m.email,
          role: m.role,
        }))}
        canManage={canManage}
        permissionGroups={permissionGroups()}
      />
    </div>
  );
}
