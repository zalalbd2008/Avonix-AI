"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformOwner } from "@/lib/auth/session";
import {
  clearPlatformOrgCookie,
  writePlatformOrgCookie,
} from "@/lib/auth/platform-org";
import { adminDb } from "@/lib/db/admin";
import {
  agencies,
  connectorKeys,
  memberships,
  pluginUninstallTokens,
} from "@/lib/db/schema";
import {
  mergeBillingOverrides,
  type BillingOverrides,
} from "@/lib/billing/profile";
import { purgeOrphanedOrgMembers } from "@/lib/delete/entities";
import { recordPlatformEvent } from "@/lib/platform/owner";
import { ensureNoFreeOrTrialPlans } from "@/lib/platform/organizations";
import type { UpdatePlatformOrganizationInput } from "@/lib/platform/types";

/** Product tiers — Starter · Professional · Agency · Enterprise */
const PLANS = ["starter", "professional", "agency", "enterprise"] as const;
const STATUSES = ["active", "past_due", "canceled"] as const;

function revalidateOrgPaths(agencyId?: string) {
  revalidatePath("/platform/workspaces");
  revalidatePath("/platform");
  if (agencyId) {
    revalidatePath(`/platform/workspaces/${agencyId}`);
  }
}

function parseOptionalLimit(value: number | null | undefined): number | undefined {
  if (value === null) return undefined; // clear
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0) return undefined;
  return Math.floor(value);
}

export async function enterOrganizationAsPlatformOwner(
  agencyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const owner = await requirePlatformOwner();
  const id = agencyId?.trim();
  if (!id) return { ok: false, error: "Missing organization id." };

  await ensureNoFreeOrTrialPlans();

  const [existing] = await adminDb
    .select({ id: agencies.id, name: agencies.name })
    .from(agencies)
    .where(and(eq(agencies.id, id), isNull(agencies.deletedAt)))
    .limit(1);

  if (!existing) return { ok: false, error: "Organization not found." };

  await writePlatformOrgCookie(id);
  await recordPlatformEvent({
    userId: owner.userId,
    event: "platform.organization.entered",
    detail: `${existing.name} (${id})`,
  });

  redirect("/dashboard");
}

export async function exitPlatformOrganizationAccess(): Promise<void> {
  await requirePlatformOwner();
  await clearPlatformOrgCookie();
  redirect("/platform/workspaces");
}

export async function updatePlatformOrganization(
  input: UpdatePlatformOrganizationInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const owner = await requirePlatformOwner();
  const agencyId = input.agencyId?.trim();
  if (!agencyId) return { ok: false, error: "Missing organization id." };

  const [existing] = await adminDb
    .select({
      id: agencies.id,
      name: agencies.name,
      plan: agencies.plan,
      status: agencies.status,
      billingOverrides: agencies.billingOverrides,
    })
    .from(agencies)
    .where(and(eq(agencies.id, agencyId), isNull(agencies.deletedAt)))
    .limit(1);

  if (!existing) return { ok: false, error: "Organization not found." };

  const patch: Partial<typeof agencies.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) return { ok: false, error: "Name must be at least 2 characters." };
    if (name.length > 120) return { ok: false, error: "Name is too long." };
    patch.name = name;
  }

  if (input.plan !== undefined) {
    if (!PLANS.includes(input.plan)) {
      return { ok: false, error: "Invalid plan." };
    }
    patch.plan = input.plan;
    patch.trialEndsAt = null;
  }

  if (input.status !== undefined) {
    if (!STATUSES.includes(input.status)) {
      return { ok: false, error: "Invalid status. Trialing is not used." };
    }
    patch.status = input.status;
    if (input.status === "active") {
      patch.trialEndsAt = null;
    }
  }

  const overrides = mergeBillingOverrides(existing.billingOverrides);
  let overridesTouched = false;

  if (input.suspended !== undefined) {
    overrides.suspended = input.suspended;
    overridesTouched = true;
  }

  if (input.complimentary !== undefined) {
    overrides.complimentary = input.complimentary;
    if (input.complimentary) {
      overrides.complimentaryPlan = input.complimentaryPlan ?? "professional";
      overrides.suspended = false;
      if (patch.plan === undefined) {
        patch.plan = overrides.complimentaryPlan;
      }
      if (patch.status === undefined) {
        patch.status = "active";
        patch.trialEndsAt = null;
      }
    } else {
      delete overrides.complimentaryPlan;
    }
    overridesTouched = true;
  }

  const setOrClear = (
    key: keyof BillingOverrides,
    value: number | null | undefined,
  ) => {
    if (value === undefined) return;
    overridesTouched = true;
    if (value === null) {
      delete overrides[key];
      return;
    }
    const n = parseOptionalLimit(value);
    if (n === undefined) {
      delete overrides[key];
      return;
    }
    (overrides as Record<string, number>)[key] = n;
  };

  setOrClear("maxClients", input.maxClients);
  setOrClear("maxWebsites", input.maxWebsites);
  setOrClear("maxUsers", input.maxUsers);
  setOrClear("bonusAiCredits", input.bonusAiCredits);
  setOrClear("bonusWebsites", input.bonusWebsites);

  if (overridesTouched) {
    patch.billingOverrides = overrides;
  }

  await adminDb.update(agencies).set(patch).where(eq(agencies.id, agencyId));

  await recordPlatformEvent({
    userId: owner.userId,
    event: "platform.organization.updated",
    detail: `${existing.name} (${agencyId})`,
  });

  revalidateOrgPaths(agencyId);
  return { ok: true };
}

export async function deletePlatformOrganization(
  agencyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const owner = await requirePlatformOwner();
  const id = agencyId?.trim();
  if (!id) return { ok: false, error: "Missing organization id." };

  const [existing] = await adminDb
    .select({ id: agencies.id, name: agencies.name })
    .from(agencies)
    .where(and(eq(agencies.id, id), isNull(agencies.deletedAt)))
    .limit(1);

  if (!existing) return { ok: false, error: "Organization not found." };

  const memberRows = await adminDb
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(eq(memberships.agencyId, id));
  const memberIds = memberRows.map((r) => r.userId);

  const keyRows = await adminDb
    .select({ hash: connectorKeys.secretHash })
    .from(connectorKeys)
    .where(
      and(eq(connectorKeys.agencyId, id), isNull(connectorKeys.revokedAt)),
    );

  if (keyRows.length) {
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await adminDb
      .insert(pluginUninstallTokens)
      .values(
        keyRows.map((r) => ({
          secretHash: r.hash,
          expiresAt,
        })),
      )
      .onConflictDoNothing({ target: pluginUninstallTokens.secretHash });
  }

  await adminDb.delete(agencies).where(eq(agencies.id, id));
  await purgeOrphanedOrgMembers(memberIds);

  await recordPlatformEvent({
    userId: owner.userId,
    event: "platform.organization.deleted",
    detail: `${existing.name} (${id})`,
  });

  revalidateOrgPaths();
  return { ok: true };
}
