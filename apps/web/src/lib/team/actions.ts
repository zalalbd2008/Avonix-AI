"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { writeActiveOrgCookie } from "@/lib/auth/active-org";
import { requireUser } from "@/lib/auth/session";
import {
  acceptInvitation,
  createInvitation,
  createRole,
  deleteRole,
  ensureTemplateRoles,
  revokeInvitation,
  updateRolePermissions,
} from "./service";

async function requireTeamManager() {
  const ctx = await requireAgency();
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return {
      ok: false as const,
      error: "Only organization owners and admins can manage the team.",
      ctx: null,
    };
  }
  return { ok: true as const, ctx, error: null };
}

export async function seedTemplateRolesAction() {
  const gate = await requireTeamManager();
  if (!gate.ok || !gate.ctx) return { ok: false as const, error: gate.error };
  try {
    const result = await ensureTemplateRoles(gate.ctx.agencyId);
    revalidatePath("/settings/members");
    if (result.added === 0) {
      return {
        ok: true as const,
        message: "Role templates are already installed.",
        added: 0,
      };
    }
    return {
      ok: true as const,
      message: `Added ${result.added} role template${result.added === 1 ? "" : "s"}.`,
      added: result.added,
    };
  } catch (e) {
    console.error("seedTemplateRolesAction", e);
    return {
      ok: false as const,
      error: "Could not add role templates. Try again.",
    };
  }
}

export async function createRoleAction(input: {
  name: string;
  description?: string;
  permissions: string[];
}) {
  const gate = await requireTeamManager();
  if (!gate.ok || !gate.ctx) return { ok: false as const, error: gate.error };
  const result = await createRole({
    agencyId: gate.ctx.agencyId,
    name: input.name,
    description: input.description,
    permissions: input.permissions,
  });
  if (result.ok) revalidatePath("/settings/members");
  return result;
}

export async function updateRolePermissionsAction(input: {
  roleId: string;
  permissions: string[];
}) {
  const gate = await requireTeamManager();
  if (!gate.ok || !gate.ctx) return { ok: false as const, error: gate.error };
  const result = await updateRolePermissions({
    agencyId: gate.ctx.agencyId,
    roleId: input.roleId,
    permissions: input.permissions,
  });
  if (result.ok) {
    revalidatePath("/settings/members");
    revalidatePath(`/settings/members/roles/${input.roleId}`);
  }
  return result;
}

export async function deleteRoleAction(roleId: string) {
  const gate = await requireTeamManager();
  if (!gate.ok || !gate.ctx) return { ok: false as const, error: gate.error };
  const result = await deleteRole({
    agencyId: gate.ctx.agencyId,
    roleId,
  });
  if (result.ok) revalidatePath("/settings/members");
  return result;
}

export async function inviteMemberAction(input: {
  email: string;
  customRoleId: string | null;
  memberRole?: "admin" | "member";
}) {
  const gate = await requireTeamManager();
  if (!gate.ok || !gate.ctx) return { ok: false as const, error: gate.error };
  const result = await createInvitation({
    agencyId: gate.ctx.agencyId,
    agencyName: gate.ctx.agencyName,
    email: input.email,
    invitedByUserId: gate.ctx.userId,
    customRoleId: input.customRoleId,
    memberRole: input.memberRole ?? "member",
  });
  if (result.ok) revalidatePath("/settings/members");
  return result;
}

export async function revokeInviteAction(invitationId: string) {
  const gate = await requireTeamManager();
  if (!gate.ok || !gate.ctx) return { ok: false as const, error: gate.error };
  const result = await revokeInvitation({
    agencyId: gate.ctx.agencyId,
    invitationId,
  });
  if (result.ok) revalidatePath("/settings/members");
  return result;
}

export async function acceptInviteAction(rawToken: string) {
  const user = await requireUser();
  const result = await acceptInvitation({
    rawToken,
    userId: user.userId,
    userEmail: user.userEmail,
  });
  if (!result.ok) return result;
  await writeActiveOrgCookie(result.agencyId);
  revalidatePath("/", "layout");
  return result;
}
