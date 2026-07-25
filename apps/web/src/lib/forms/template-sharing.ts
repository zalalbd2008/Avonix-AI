/**
 * Template share, lock, and approval workflow (ADR-007 Step 4).
 *
 * Role mapping (v1 memberships):
 * - member ≈ Designer — create, submit for approval
 * - admin ≈ Team Manager / Org Admin — approve, share, lock
 * - owner — full access including unlock/delete locked
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  formTemplates,
  formTemplateShares,
  memberships,
  user,
  type FormTemplateSharePermission,
  type FormTemplateShareTarget,
} from "@/lib/db/schema";

export type OrgMemberOption = {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
};

export type TemplateShareRow = {
  id: string;
  targetType: FormTemplateShareTarget;
  targetUserId: string | null;
  targetRole: "owner" | "admin" | "member" | null;
  teamId: string | null;
  permissions: FormTemplateSharePermission[];
  targetLabel: string;
  createdAt: string;
};

function canManageSharing(role: "owner" | "admin" | "member"): boolean {
  return role === "owner" || role === "admin";
}

export async function listOrgMembersForSharing(
  agencyId: string,
): Promise<OrgMemberOption[]> {
  // memberships is not RLS-scoped — filter by agencyId explicitly.
  const rows = await withAgency(agencyId, async (tx) => {
    return tx
      .select({
        userId: memberships.userId,
        role: memberships.role,
        name: user.name,
        email: user.email,
      })
      .from(memberships)
      .innerJoin(user, eq(user.id, memberships.userId))
      .where(eq(memberships.agencyId, agencyId));
  });

  return rows.map((r) => ({
    userId: r.userId,
    name: r.name || r.email,
    email: r.email,
    role: r.role,
  }));
}

export async function listSharedTemplateIdsForUser(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
): Promise<string[]> {
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select({
        templateId: formTemplateShares.templateId,
        targetType: formTemplateShares.targetType,
        targetUserId: formTemplateShares.targetUserId,
        targetRole: formTemplateShares.targetRole,
      })
      .from(formTemplateShares);

    const ids = new Set<string>();
    for (const r of rows) {
      if (r.targetType === "user" && r.targetUserId === userId) {
        ids.add(r.templateId);
      }
      if (r.targetType === "role" && r.targetRole === role) {
        ids.add(r.templateId);
      }
      // team shares: any member of the org can see team-targeted shares for now
      if (r.targetType === "team") {
        ids.add(r.templateId);
      }
    }
    return [...ids];
  });
}

export async function listTemplateShares(
  agencyId: string,
  templateId: string,
): Promise<TemplateShareRow[]> {
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select()
      .from(formTemplateShares)
      .where(eq(formTemplateShares.templateId, templateId));

    const members = await tx
      .select({
        userId: memberships.userId,
        name: user.name,
        email: user.email,
      })
      .from(memberships)
      .innerJoin(user, eq(user.id, memberships.userId))
      .where(eq(memberships.agencyId, agencyId));

    const nameById = new Map(
      members.map((m) => [m.userId, m.name || m.email]),
    );

    return rows.map((r) => {
      let targetLabel = "Unknown";
      if (r.targetType === "user") {
        targetLabel = nameById.get(r.targetUserId ?? "") ?? "User";
      } else if (r.targetType === "role") {
        targetLabel = `Role: ${r.targetRole ?? "member"}`;
      } else if (r.targetType === "team") {
        targetLabel = `Team: ${r.teamId || "default"}`;
      }
      return {
        id: r.id,
        targetType: r.targetType,
        targetUserId: r.targetUserId,
        targetRole: r.targetRole ?? null,
        teamId: r.teamId,
        permissions: r.permissions ?? ["view"],
        targetLabel,
        createdAt: r.createdAt.toISOString(),
      };
    });
  });
}

export async function shareTemplate(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  opts: {
    templateId: string;
    targetType: FormTemplateShareTarget;
    targetUserId?: string;
    targetRole?: "owner" | "admin" | "member";
    teamId?: string;
    permissions?: FormTemplateSharePermission[];
  },
): Promise<{ ok: true; shareId: string } | { ok: false; error: string }> {
  if (!canManageSharing(role)) {
    return { ok: false, error: "Only admins can share templates." };
  }

  return withAgency(agencyId, async (tx) => {
    const [tpl] = await tx
      .select()
      .from(formTemplates)
      .where(
        and(
          eq(formTemplates.id, opts.templateId),
          isNull(formTemplates.deletedAt),
        ),
      )
      .limit(1);
    if (!tpl) return { ok: false as const, error: "Template not found." };

    if (opts.targetType === "user") {
      if (!opts.targetUserId) {
        return { ok: false as const, error: "Pick a teammate to share with." };
      }
      const [member] = await tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(
          and(
            eq(memberships.agencyId, agencyId),
            eq(memberships.userId, opts.targetUserId),
          ),
        )
        .limit(1);
      if (!member) {
        return {
          ok: false as const,
          error: "That person is not in this organization.",
        };
      }
    }

    const permissions = opts.permissions?.length
      ? opts.permissions
      : (["view", "duplicate"] as FormTemplateSharePermission[]);

    const [row] = await tx
      .insert(formTemplateShares)
      .values({
        agencyId,
        templateId: opts.templateId,
        targetType: opts.targetType,
        targetUserId:
          opts.targetType === "user" ? (opts.targetUserId ?? null) : null,
        targetRole:
          opts.targetType === "role" ? (opts.targetRole ?? "member") : null,
        teamId: opts.targetType === "team" ? (opts.teamId ?? "default") : null,
        permissions,
        createdBy: userId,
      })
      .returning({ id: formTemplateShares.id });

    if (!row) return { ok: false as const, error: "Could not create share." };

    // Personal templates become visible to sharees via share rows.
    if (tpl.visibility === "private" && opts.targetType === "user") {
      await tx
        .update(formTemplates)
        .set({ updatedAt: sql`now()` })
        .where(eq(formTemplates.id, opts.templateId));
    }

    return { ok: true as const, shareId: row.id };
  });
}

export async function removeTemplateShare(
  agencyId: string,
  role: "owner" | "admin" | "member",
  shareId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!canManageSharing(role)) {
    return { ok: false, error: "Only admins can remove shares." };
  }
  return withAgency(agencyId, async (tx) => {
    await tx
      .delete(formTemplateShares)
      .where(eq(formTemplateShares.id, shareId));
    return { ok: true as const };
  });
}

export async function setTemplateLocked(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  templateId: string,
  locked: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (locked && !canManageSharing(role)) {
    return { ok: false, error: "Only admins can lock templates." };
  }
  if (!locked && role !== "owner" && role !== "admin") {
    return { ok: false, error: "Only admins can unlock templates." };
  }

  return withAgency(agencyId, async (tx) => {
    const [tpl] = await tx
      .select()
      .from(formTemplates)
      .where(
        and(eq(formTemplates.id, templateId), isNull(formTemplates.deletedAt)),
      )
      .limit(1);
    if (!tpl) return { ok: false as const, error: "Template not found." };

    await tx
      .update(formTemplates)
      .set(
        locked
          ? {
              isLocked: true,
              lockedBy: userId,
              lockedAt: sql`now()`,
              updatedBy: userId,
              updatedAt: sql`now()`,
            }
          : {
              isLocked: false,
              lockedBy: null,
              lockedAt: null,
              updatedBy: userId,
              updatedAt: sql`now()`,
            },
      )
      .where(eq(formTemplates.id, templateId));

    return { ok: true as const };
  });
}

export async function submitTemplateForApproval(
  agencyId: string,
  userId: string,
  templateId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withAgency(agencyId, async (tx) => {
    const [tpl] = await tx
      .select()
      .from(formTemplates)
      .where(
        and(eq(formTemplates.id, templateId), isNull(formTemplates.deletedAt)),
      )
      .limit(1);
    if (!tpl) return { ok: false as const, error: "Template not found." };
    if (tpl.isLocked) {
      return { ok: false as const, error: "Locked templates cannot be submitted." };
    }
    if (tpl.status !== "draft" && tpl.status !== "rejected") {
      return {
        ok: false as const,
        error: "Only draft or rejected templates can be submitted.",
      };
    }
    if (tpl.createdBy && tpl.createdBy !== userId) {
      // Allow admins to submit on behalf — checked by caller role optionally
    }

    await tx
      .update(formTemplates)
      .set({
        status: "pending_approval",
        submittedBy: userId,
        submittedAt: sql`now()`,
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        updatedBy: userId,
        updatedAt: sql`now()`,
      })
      .where(eq(formTemplates.id, templateId));

    return { ok: true as const };
  });
}

export async function reviewTemplateApproval(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  opts: {
    templateId: string;
    decision: "approve" | "reject";
    note?: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!canManageSharing(role)) {
    return { ok: false, error: "Only admins can approve or reject templates." };
  }

  return withAgency(agencyId, async (tx) => {
    const [tpl] = await tx
      .select()
      .from(formTemplates)
      .where(
        and(
          eq(formTemplates.id, opts.templateId),
          isNull(formTemplates.deletedAt),
        ),
      )
      .limit(1);
    if (!tpl) return { ok: false as const, error: "Template not found." };
    if (tpl.status !== "pending_approval") {
      return {
        ok: false as const,
        error: "Template is not awaiting approval.",
      };
    }

    if (opts.decision === "approve") {
      await tx
        .update(formTemplates)
        .set({
          status: "published",
          visibility:
            tpl.scope === "personal" ? "organization" : tpl.visibility,
          reviewedBy: userId,
          reviewedAt: sql`now()`,
          reviewNote: opts.note?.trim().slice(0, 500) || null,
          updatedBy: userId,
          updatedAt: sql`now()`,
        })
        .where(eq(formTemplates.id, opts.templateId));
    } else {
      await tx
        .update(formTemplates)
        .set({
          status: "rejected",
          reviewedBy: userId,
          reviewedAt: sql`now()`,
          reviewNote:
            opts.note?.trim().slice(0, 500) || "Rejected — please revise.",
          updatedBy: userId,
          updatedAt: sql`now()`,
        })
        .where(eq(formTemplates.id, opts.templateId));
    }

    return { ok: true as const };
  });
}
