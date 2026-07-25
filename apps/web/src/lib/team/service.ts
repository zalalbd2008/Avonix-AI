import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, withAgency } from "@/lib/db";
import {
  agencies,
  memberships,
  organizationInvitations,
  orgRolePermissions,
  orgRoles,
  user,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { inviteEmail } from "@/lib/email/templates/invite";
import { validateSignupEmail } from "@/lib/email/email-policy";
import {
  assertNotPlatformOwnerForOrg,
  isPlatformOwnerEmail,
} from "@/lib/platform/owner";
import {
  ALL_PERMISSIONS,
  isPermissionKey,
  ROLE_TEMPLATES,
} from "./permissions";

const INVITE_TTL_DAYS = 14;
const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function hashInviteToken(raw: string) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function newInviteToken() {
  return randomBytes(32).toString("base64url");
}

export async function listMembers(agencyId: string) {
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select({
        membershipId: memberships.id,
        userId: memberships.userId,
        role: memberships.role,
        customRoleId: memberships.customRoleId,
        email: user.email,
        name: user.name,
        roleName: orgRoles.name,
      })
      .from(memberships)
      .innerJoin(user, eq(user.id, memberships.userId))
      .leftJoin(orgRoles, eq(orgRoles.id, memberships.customRoleId))
      .where(eq(memberships.agencyId, agencyId))
      .orderBy(asc(memberships.createdAt));
    return rows;
  });
}

export async function listRoles(agencyId: string) {
  return withAgency(agencyId, async (tx) => {
    const roles = await tx
      .select()
      .from(orgRoles)
      .where(eq(orgRoles.agencyId, agencyId))
      .orderBy(asc(orgRoles.name));

    if (!roles.length) return [];

    const perms = await tx
      .select()
      .from(orgRolePermissions)
      .where(
        and(
          eq(orgRolePermissions.agencyId, agencyId),
          inArray(
            orgRolePermissions.roleId,
            roles.map((r) => r.id),
          ),
        ),
      );

    return roles.map((role) => ({
      ...role,
      permissions: perms
        .filter((p) => p.roleId === role.id)
        .map((p) => p.permission),
    }));
  });
}

export async function listPendingInvites(agencyId: string) {
  return withAgency(agencyId, async (tx) => {
    return tx
      .select({
        id: organizationInvitations.id,
        email: organizationInvitations.email,
        memberRole: organizationInvitations.memberRole,
        customRoleId: organizationInvitations.customRoleId,
        status: organizationInvitations.status,
        expiresAt: organizationInvitations.expiresAt,
        createdAt: organizationInvitations.createdAt,
        roleName: orgRoles.name,
      })
      .from(organizationInvitations)
      .leftJoin(orgRoles, eq(orgRoles.id, organizationInvitations.customRoleId))
      .where(
        and(
          eq(organizationInvitations.agencyId, agencyId),
          eq(organizationInvitations.status, "pending"),
        ),
      )
      .orderBy(asc(organizationInvitations.createdAt));
  });
}

/** Ensure template roles exist for this org (idempotent). */
export async function ensureTemplateRoles(agencyId: string): Promise<{
  added: number;
  existing: number;
}> {
  return withAgency(agencyId, async (tx) => {
    const existingRows = await tx
      .select({ name: orgRoles.name })
      .from(orgRoles)
      .where(eq(orgRoles.agencyId, agencyId));
    const have = new Set(existingRows.map((r) => r.name));
    let added = 0;

    for (const tpl of ROLE_TEMPLATES) {
      if (have.has(tpl.name)) continue;
      const [role] = await tx
        .insert(orgRoles)
        .values({
          agencyId,
          name: tpl.name,
          description: tpl.description,
          isSystem: true,
        })
        .returning();
      if (!role) continue;
      added += 1;
      if (tpl.permissions.length) {
        await tx.insert(orgRolePermissions).values(
          tpl.permissions.map((permission) => ({
            agencyId,
            roleId: role.id,
            permission,
          })),
        );
      }
    }

    return {
      added,
      existing: ROLE_TEMPLATES.length - added,
    };
  });
}

export async function createRole(opts: {
  agencyId: string;
  name: string;
  description?: string;
  permissions: string[];
}) {
  const name = opts.name.trim().slice(0, 80);
  if (name.length < 2) {
    return { ok: false as const, error: "Role name is required." };
  }
  const permissions = [
    ...new Set(opts.permissions.filter((p) => isPermissionKey(p))),
  ];

  try {
    const role = await withAgency(opts.agencyId, async (tx) => {
      const [row] = await tx
        .insert(orgRoles)
        .values({
          agencyId: opts.agencyId,
          name,
          description: opts.description?.trim().slice(0, 240) || null,
          isSystem: false,
        })
        .returning();
      if (!row) throw new Error("insert failed");
      if (permissions.length) {
        await tx.insert(orgRolePermissions).values(
          permissions.map((permission) => ({
            agencyId: opts.agencyId,
            roleId: row.id,
            permission,
          })),
        );
      }
      return row;
    });
    return { ok: true as const, role };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|duplicate/i.test(msg)) {
      return { ok: false as const, error: "A role with that name already exists." };
    }
    console.error("createRole", e);
    return { ok: false as const, error: "Could not create role." };
  }
}

export async function updateRolePermissions(opts: {
  agencyId: string;
  roleId: string;
  permissions: string[];
}) {
  const permissions = [
    ...new Set(opts.permissions.filter((p) => isPermissionKey(p))),
  ];

  return withAgency(opts.agencyId, async (tx) => {
    const [role] = await tx
      .select()
      .from(orgRoles)
      .where(
        and(eq(orgRoles.id, opts.roleId), eq(orgRoles.agencyId, opts.agencyId)),
      )
      .limit(1);
    if (!role) return { ok: false as const, error: "Role not found." };

    await tx
      .delete(orgRolePermissions)
      .where(
        and(
          eq(orgRolePermissions.roleId, opts.roleId),
          eq(orgRolePermissions.agencyId, opts.agencyId),
        ),
      );
    if (permissions.length) {
      await tx.insert(orgRolePermissions).values(
        permissions.map((permission) => ({
          agencyId: opts.agencyId,
          roleId: opts.roleId,
          permission,
        })),
      );
    }
    return { ok: true as const };
  });
}

export async function deleteRole(opts: { agencyId: string; roleId: string }) {
  return withAgency(opts.agencyId, async (tx) => {
    const assigned = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.agencyId, opts.agencyId),
          eq(memberships.customRoleId, opts.roleId),
        ),
      )
      .limit(1);
    if (assigned.length) {
      return {
        ok: false as const,
        error: "Remove this role from members before deleting it.",
      };
    }
    await tx
      .delete(orgRoles)
      .where(
        and(eq(orgRoles.id, opts.roleId), eq(orgRoles.agencyId, opts.agencyId)),
      );
    return { ok: true as const };
  });
}

export async function createInvitation(opts: {
  agencyId: string;
  agencyName: string;
  email: string;
  invitedByUserId: string;
  customRoleId: string | null;
  memberRole?: "admin" | "member";
}) {
  const check = validateSignupEmail(opts.email);
  if (!check.ok) return { ok: false as const, error: check.error };
  const email = check.email;
  const memberRole = opts.memberRole ?? "member";

  if (await isPlatformOwnerEmail(email)) {
    return {
      ok: false as const,
      error:
        "That email is a Platform Owner and cannot be invited to an organization.",
    };
  }

  if (opts.customRoleId) {
    const roles = await listRoles(opts.agencyId);
    if (!roles.some((r) => r.id === opts.customRoleId)) {
      return { ok: false as const, error: "Selected role was not found." };
    }
  }

  // memberships is not RLS-scoped
  const [existing] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .innerJoin(user, eq(user.id, memberships.userId))
    .where(
      and(eq(memberships.agencyId, opts.agencyId), eq(user.email, email)),
    )
    .limit(1);
  if (existing) {
    return { ok: false as const, error: "That person is already a member." };
  }

  const raw = newInviteToken();
  const tokenHash = hashInviteToken(raw);
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  try {
    await withAgency(opts.agencyId, async (tx) => {
      // Revoke prior pending invites to same email
      await tx
        .update(organizationInvitations)
        .set({ status: "revoked", updatedAt: new Date() })
        .where(
          and(
            eq(organizationInvitations.agencyId, opts.agencyId),
            eq(organizationInvitations.email, email),
            eq(organizationInvitations.status, "pending"),
          ),
        );

      await tx.insert(organizationInvitations).values({
        agencyId: opts.agencyId,
        email,
        memberRole,
        customRoleId: opts.customRoleId,
        tokenHash,
        status: "pending",
        invitedByUserId: opts.invitedByUserId,
        expiresAt,
      });
    });
  } catch (e) {
    console.error("createInvitation", e);
    return { ok: false as const, error: "Could not create invitation." };
  }

  const url = `${appUrl()}/invite/${raw}`;
  const roleLabel =
    opts.customRoleId != null
      ? (await listRoles(opts.agencyId)).find((r) => r.id === opts.customRoleId)
          ?.name
      : memberRole === "admin"
        ? "Admin"
        : "Member";

  await sendEmail(
    inviteEmail({
      to: email,
      organizationName: opts.agencyName,
      roleLabel: roleLabel ?? "Member",
      url,
      expiresDays: INVITE_TTL_DAYS,
    }),
  );

  return { ok: true as const, url };
}

export async function revokeInvitation(opts: {
  agencyId: string;
  invitationId: string;
}) {
  return withAgency(opts.agencyId, async (tx) => {
    await tx
      .update(organizationInvitations)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(
        and(
          eq(organizationInvitations.id, opts.invitationId),
          eq(organizationInvitations.agencyId, opts.agencyId),
          eq(organizationInvitations.status, "pending"),
        ),
      );
    return { ok: true as const };
  });
}

export async function getInvitationByRawToken(raw: string) {
  const tokenHash = hashInviteToken(raw);
  const [row] = await db
    .select()
    .from(organizationInvitations)
    .where(eq(organizationInvitations.tokenHash, tokenHash))
    .limit(1);

  if (!row) return null;

  if (row.status === "pending" && row.expiresAt.getTime() < Date.now()) {
    await db
      .update(organizationInvitations)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(organizationInvitations.id, row.id));
    row.status = "expired";
  }

  return withAgency(row.agencyId, async (tx) => {
    const [[agency], [role]] = await Promise.all([
      tx
        .select({ name: agencies.name })
        .from(agencies)
        .where(eq(agencies.id, row.agencyId))
        .limit(1),
      row.customRoleId
        ? tx
            .select({ name: orgRoles.name })
            .from(orgRoles)
            .where(eq(orgRoles.id, row.customRoleId))
            .limit(1)
        : Promise.resolve([undefined]),
    ]);

    return {
      id: row.id,
      agencyId: row.agencyId,
      email: row.email,
      memberRole: row.memberRole,
      customRoleId: row.customRoleId,
      status: row.status,
      expiresAt: row.expiresAt,
      agencyName: agency?.name ?? "Organization",
      roleName: role?.name ?? null,
    };
  });
}

export async function acceptInvitation(opts: {
  rawToken: string;
  userId: string;
  userEmail: string;
}) {
  const platformGate = await assertNotPlatformOwnerForOrg(opts.userId);
  if (!platformGate.ok) return platformGate;

  const invite = await getInvitationByRawToken(opts.rawToken);
  if (!invite) return { ok: false as const, error: "Invitation not found." };
  if (invite.status !== "pending") {
    return {
      ok: false as const,
      error: `This invitation is ${invite.status}.`,
    };
  }
  if (invite.email.toLowerCase() !== opts.userEmail.toLowerCase()) {
    return {
      ok: false as const,
      error: `Sign in as ${invite.email} to accept this invite.`,
    };
  }

  const [already] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.agencyId, invite.agencyId),
        eq(memberships.userId, opts.userId),
      ),
    )
    .limit(1);
  if (already) {
    await db
      .update(organizationInvitations)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        acceptedUserId: opts.userId,
        updatedAt: new Date(),
      })
      .where(eq(organizationInvitations.id, invite.id));
    return { ok: true as const, agencyId: invite.agencyId };
  }

  await db.insert(memberships).values({
    agencyId: invite.agencyId,
    userId: opts.userId,
    role: invite.memberRole,
    customRoleId:
      invite.memberRole === "member" ? invite.customRoleId : null,
    invitedAt: new Date(),
    acceptedAt: new Date(),
  });

  await db
    .update(organizationInvitations)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      acceptedUserId: opts.userId,
      updatedAt: new Date(),
    })
    .where(eq(organizationInvitations.id, invite.id));

  return { ok: true as const, agencyId: invite.agencyId };
}

export async function permissionsForMembership(opts: {
  agencyId: string;
  role: "owner" | "admin" | "member";
  customRoleId: string | null;
}): Promise<string[] | "*"> {
  if (opts.role === "owner" || opts.role === "admin") return "*";
  if (!opts.customRoleId) return [];
  return withAgency(opts.agencyId, async (tx) => {
    const rows = await tx
      .select({ permission: orgRolePermissions.permission })
      .from(orgRolePermissions)
      .where(
        and(
          eq(orgRolePermissions.agencyId, opts.agencyId),
          eq(orgRolePermissions.roleId, opts.customRoleId!),
        ),
      );
    return rows.map((r) => r.permission);
  });
}

export function permissionGroups(): [string, { key: string; label: string }[]][] {
  const map = new Map<string, { key: string; label: string }[]>();
  for (const p of ALL_PERMISSIONS) {
    const list = map.get(p.group) ?? [];
    list.push({ key: p.key, label: p.label });
    map.set(p.group, list);
  }
  return [...map.entries()];
}
