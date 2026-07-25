"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { requirePlatformOwner } from "@/lib/auth/session";
import { adminDb } from "@/lib/db/admin";
import {
  account,
  agencies,
  memberships,
  organizationInvitations,
  orgRolePermissions,
  orgRoles,
  user,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { validateSignupEmail } from "@/lib/email/email-policy";
import { inviteEmail } from "@/lib/email/templates/invite";
import { orgAccessEmail } from "@/lib/email/templates/org-access";
import {
  mergeBillingOverrides,
  type BillingOverrides,
} from "@/lib/billing/profile";
import {
  isPlatformOwnerEmail,
  recordPlatformEvent,
} from "@/lib/platform/owner";
import {
  ROLE_TEMPLATES,
  platformOrgSeatById,
  type PlatformOrgSeatId,
} from "@/lib/team/permissions";

const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

function newId() {
  return randomBytes(24).toString("base64url");
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "organization"
  );
}

function hashInviteToken(raw: string) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export type CreatePlatformOrganizationInput = {
  name: string;
  plan: "starter" | "professional" | "agency" | "enterprise";
  seatId: PlatformOrgSeatId | string;
  adminEmail: string;
  accessMode: "invite" | "access";
  password?: string;
  maxClients?: number | null;
  maxWebsites?: number | null;
  maxUsers?: number | null;
  bonusAiCredits?: number | null;
  bonusWebsites?: number | null;
  complimentary?: boolean;
};

export type CreatePlatformOrganizationResult =
  | {
      ok: true;
      agencyId: string;
      mode: "invite" | "access";
      inviteUrl?: string;
    }
  | { ok: false; error: string };

async function seedTemplateRoles(agencyId: string) {
  for (const tpl of ROLE_TEMPLATES) {
    const existing = await adminDb
      .select({ id: orgRoles.id })
      .from(orgRoles)
      .where(and(eq(orgRoles.agencyId, agencyId), eq(orgRoles.name, tpl.name)))
      .limit(1);

    let roleId = existing[0]?.id;
    if (!roleId) {
      const [created] = await adminDb
        .insert(orgRoles)
        .values({
          agencyId,
          name: tpl.name,
          description: tpl.description,
          isSystem: true,
        })
        .returning({ id: orgRoles.id });
      roleId = created?.id;
    }
    if (!roleId || !tpl.permissions.length) continue;

    for (const permission of tpl.permissions) {
      await adminDb
        .insert(orgRolePermissions)
        .values({ agencyId, roleId, permission })
        .onConflictDoNothing();
    }
  }
}

/**
 * Platform Owner provisions a customer organization with seat + limits,
 * then either invites the admin by email or creates a passworded account.
 */
export async function createPlatformOrganization(
  input: CreatePlatformOrganizationInput,
): Promise<CreatePlatformOrganizationResult> {
  const owner = await requirePlatformOwner();

  const name = input.name?.trim() ?? "";
  if (name.length < 2) {
    return { ok: false, error: "Organization name is required." };
  }
  if (name.length > 120) {
    return { ok: false, error: "Organization name is too long." };
  }

  if (!["starter", "professional", "agency", "enterprise"].includes(input.plan)) {
    return { ok: false, error: "Invalid plan." };
  }

  const seat = platformOrgSeatById(input.seatId);
  if (!seat) return { ok: false, error: "Select a valid role seat." };

  const emailCheck = validateSignupEmail(input.adminEmail ?? "");
  if (!emailCheck.ok) return { ok: false, error: emailCheck.error };
  const adminEmail = emailCheck.email;

  if (await isPlatformOwnerEmail(adminEmail)) {
    return {
      ok: false,
      error:
        "That email is a Platform Owner. Use a separate email for the organization admin.",
    };
  }

  if (input.accessMode !== "invite" && input.accessMode !== "access") {
    return { ok: false, error: "Choose invite or password access." };
  }

  const password = input.password?.trim() ?? "";
  if (input.accessMode === "access" && password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const [existingUser] = await adminDb
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, adminEmail))
    .limit(1);

  let orphanUserId: string | null = null;
  if (existingUser) {
    const [existingMembership] = await adminDb
      .select({ id: memberships.id })
      .from(memberships)
      .where(eq(memberships.userId, existingUser.id))
      .limit(1);

    if (existingMembership) {
      return {
        ok: false,
        error:
          "That email already belongs to another organization. Use Invite mode, or pick a different email.",
      };
    }

    if (input.accessMode === "access") {
      // Leftover login from a previously deleted org — reuse instead of blocking.
      orphanUserId = existingUser.id;
    }
  }

  const overrides: BillingOverrides = mergeBillingOverrides({});
  const applyLimit = (
    key: keyof BillingOverrides,
    value: number | null | undefined,
  ) => {
    if (value === undefined || value === null) return;
    if (!Number.isFinite(value) || value < 0) return;
    (overrides as Record<string, number>)[key] = Math.floor(value);
  };
  applyLimit("maxClients", input.maxClients);
  applyLimit("maxWebsites", input.maxWebsites);
  applyLimit("maxUsers", input.maxUsers);
  applyLimit("bonusAiCredits", input.bonusAiCredits);
  applyLimit("bonusWebsites", input.bonusWebsites);

  const plan = input.plan;
  if (input.complimentary) {
    overrides.complimentary = true;
    overrides.complimentaryPlan = plan;
  }

  const agencyId = crypto.randomUUID();
  const slug = `${slugify(name)}-${agencyId.slice(0, 6)}`;
  const now = new Date();

  try {
    await adminDb.insert(agencies).values({
      id: agencyId,
      name,
      slug,
      plan,
      status: "active",
      billingOverrides: overrides,
      createdAt: now,
      updatedAt: now,
    });

    await seedTemplateRoles(agencyId);

    let customRoleId: string | null = null;
    if (seat.customRoleName) {
      const [role] = await adminDb
        .select({ id: orgRoles.id })
        .from(orgRoles)
        .where(
          and(
            eq(orgRoles.agencyId, agencyId),
            eq(orgRoles.name, seat.customRoleName),
          ),
        )
        .limit(1);
      customRoleId = role?.id ?? null;
    }

    const roleLabel = seat.customRoleName ?? seat.label;

    if (input.accessMode === "access") {
      const passwordHash = await hashPassword(password);
      let userId = orphanUserId;

      if (userId) {
        await adminDb
          .update(user)
          .set({
            name: name.slice(0, 80),
            emailVerified: true,
            updatedAt: now,
          })
          .where(eq(user.id, userId));

        const [cred] = await adminDb
          .select({ id: account.id })
          .from(account)
          .where(
            and(eq(account.userId, userId), eq(account.providerId, "credential")),
          )
          .limit(1);

        if (cred) {
          await adminDb
            .update(account)
            .set({ password: passwordHash, updatedAt: now })
            .where(eq(account.id, cred.id));
        } else {
          await adminDb.insert(account).values({
            id: newId(),
            accountId: userId,
            providerId: "credential",
            userId,
            password: passwordHash,
            createdAt: now,
            updatedAt: now,
          });
        }
      } else {
        userId = newId();
        await adminDb.insert(user).values({
          id: userId,
          name: name.slice(0, 80),
          email: adminEmail,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        });

        await adminDb.insert(account).values({
          id: newId(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        });
      }

      await adminDb.insert(memberships).values({
        agencyId,
        userId,
        role: seat.memberRole,
        customRoleId: seat.memberRole === "member" ? customRoleId : null,
        acceptedAt: now,
      });

      await sendEmail(
        orgAccessEmail({
          to: adminEmail,
          organizationName: name,
          roleLabel,
          email: adminEmail,
          password,
          signInUrl: `${appUrl()}/sign-in`,
        }),
      );

      await recordPlatformEvent({
        userId: owner.userId,
        event: "platform.organization.created",
        detail: `${name} · access · ${adminEmail} · ${seat.id}`,
      });

      revalidatePath("/platform/workspaces");
      revalidatePath("/platform");
      return { ok: true, agencyId, mode: "access" };
    }

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashInviteToken(rawToken);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await adminDb.insert(organizationInvitations).values({
      agencyId,
      email: adminEmail,
      memberRole: seat.memberRole,
      customRoleId: seat.memberRole === "member" ? customRoleId : null,
      tokenHash,
      status: "pending",
      invitedByUserId: owner.userId,
      expiresAt,
    });

    const inviteUrl = `${appUrl()}/invite/${rawToken}`;
    await sendEmail(
      inviteEmail({
        to: adminEmail,
        organizationName: name,
        roleLabel,
        url: inviteUrl,
        expiresDays: 14,
      }),
    );

    await recordPlatformEvent({
      userId: owner.userId,
      event: "platform.organization.created",
      detail: `${name} · invite · ${adminEmail} · ${seat.id}`,
    });

    revalidatePath("/platform/workspaces");
    revalidatePath("/platform");
    return { ok: true, agencyId, mode: "invite", inviteUrl };
  } catch (e) {
    console.error("createPlatformOrganization", e);
    try {
      await adminDb.delete(agencies).where(eq(agencies.id, agencyId));
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      error: "Could not create the organization. Try again.",
    };
  }
}
