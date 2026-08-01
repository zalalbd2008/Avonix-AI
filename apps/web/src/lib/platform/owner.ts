/**
 * Platform Owner helpers (ADR-012) — no tenant RLS; admin DB URL for CLI.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  DEFAULT_MAX_PLATFORM_OWNERS,
  platformAccounts,
  platformRecoveryCodes,
  platformSecurityEvents,
  platformSettings,
  user,
  type PlatformOwnerPurpose,
} from "@/lib/db/schema";

export function hashSecret(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(6).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`);
  }
  return codes;
}

export function generateEmergencyKey(): string {
  return `avx_erk_${randomBytes(32).toString("base64url")}`;
}

export async function getPlatformSettings() {
  const [row] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.id, "default"))
    .limit(1);
  return (
    row ?? {
      id: "default" as const,
      maxPlatformOwners: DEFAULT_MAX_PLATFORM_OWNERS,
      aiKeys: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  );
}

export async function countPlatformOwners(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(platformAccounts)
    .where(eq(platformAccounts.platformOwner, true));
  return row?.n ?? 0;
}

/**
 * Whether another Platform Owner seat can be created.
 * Returns a clear error string when the global cap is reached.
 */
export async function assertCanCreatePlatformOwner(): Promise<
  { ok: true; remaining: number; max: number } | { ok: false; error: string }
> {
  const settings = await getPlatformSettings();
  const max = settings.maxPlatformOwners ?? DEFAULT_MAX_PLATFORM_OWNERS;
  const used = await countPlatformOwners();
  if (used >= max) {
    return {
      ok: false,
      error: `Maximum Platform Owners reached (${max}).`,
    };
  }
  return { ok: true, remaining: max - used, max };
}

export async function listPlatformOwners() {
  return db
    .select()
    .from(platformAccounts)
    .where(eq(platformAccounts.platformOwner, true));
}

export async function getPlatformOwnerAccount() {
  const [row] = await db
    .select()
    .from(platformAccounts)
    .where(eq(platformAccounts.platformOwner, true))
    .limit(1);
  return row ?? null;
}

export async function isPlatformOwner(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: platformAccounts.id, status: platformAccounts.status })
    .from(platformAccounts)
    .where(
      and(
        eq(platformAccounts.userId, userId),
        eq(platformAccounts.platformOwner, true),
      ),
    )
    .limit(1);
  return Boolean(row && row.status === "active");
}

/**
 * Platform Owner emails must never hold organization memberships (ADR-013).
 * One identity, one surface — not both Platform and Org Admin.
 */
export async function isPlatformOwnerEmail(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const [row] = await db
    .select({
      id: platformAccounts.id,
      status: platformAccounts.status,
    })
    .from(platformAccounts)
    .innerJoin(user, eq(user.id, platformAccounts.userId))
    .where(
      and(
        eq(platformAccounts.platformOwner, true),
        eq(user.email, normalized),
      ),
    )
    .limit(1);
  return Boolean(row && row.status === "active");
}

/** Reject joining/creating orgs when the user is an active Platform Owner. */
export async function assertNotPlatformOwnerForOrg(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (await isPlatformOwner(userId)) {
    return {
      ok: false,
      error:
        "Platform Owner accounts cannot join or create organizations. Use a separate email for Organization Admin.",
    };
  }
  return { ok: true };
}

export async function recordPlatformEvent(opts: {
  userId?: string | null;
  event: string;
  detail?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await db.insert(platformSecurityEvents).values({
    userId: opts.userId ?? null,
    event: opts.event,
    detail: opts.detail ?? null,
    ipAddress: opts.ipAddress ?? null,
    userAgent: opts.userAgent ?? null,
  });
}

export async function replaceRecoveryCodes(userId: string, codes: string[]) {
  await db
    .delete(platformRecoveryCodes)
    .where(eq(platformRecoveryCodes.userId, userId));
  if (!codes.length) return;
  await db.insert(platformRecoveryCodes).values(
    codes.map((code) => ({
      userId,
      codeHash: hashSecret(code.trim().toUpperCase()),
    })),
  );
}

export async function consumeRecoveryCode(
  userId: string,
  code: string,
): Promise<boolean> {
  const codeHash = hashSecret(code.trim().toUpperCase());
  const [row] = await db
    .select()
    .from(platformRecoveryCodes)
    .where(
      and(
        eq(platformRecoveryCodes.userId, userId),
        eq(platformRecoveryCodes.codeHash, codeHash),
        isNull(platformRecoveryCodes.usedAt),
      ),
    )
    .limit(1);
  if (!row) return false;
  await db
    .update(platformRecoveryCodes)
    .set({ usedAt: new Date(), updatedAt: new Date() })
    .where(eq(platformRecoveryCodes.id, row.id));
  return true;
}

export type { PlatformOwnerPurpose };
