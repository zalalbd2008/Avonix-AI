/**
 * Server-console Platform Owner recovery (ADR-012 Layer 6).
 *
 *   PLATFORM_RECOVERY_CONFIRM=YES \
 *   PLATFORM_EMERGENCY_KEY='avx_erk_…' \
 *   PLATFORM_OWNER_NEW_PASSWORD='…' \
 *   npm run platform:recover-owner
 *
 * Target a specific seat (recommended when multiple owners exist):
 *   PLATFORM_OWNER_EMAIL=you@company.com
 * Optional: PLATFORM_ENABLE_BREAK_GLASS=YES
 */
import { createHash } from "node:crypto";
import { config } from "dotenv";
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";

config({ path: ".env.local", quiet: true });

const url = process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("ADMIN_DATABASE_URL or DATABASE_URL must be set");

const sql = postgres(url, { max: 1 });

function hashSecret(raw: string) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

async function main() {
  if (process.env.PLATFORM_RECOVERY_CONFIRM !== "YES") {
    throw new Error(
      "Refusing to run. Set PLATFORM_RECOVERY_CONFIRM=YES on the server.",
    );
  }

  const emergencyKey = process.env.PLATFORM_EMERGENCY_KEY?.trim() ?? "";
  if (!emergencyKey) {
    throw new Error("PLATFORM_EMERGENCY_KEY is required.");
  }

  const newPassword = process.env.PLATFORM_OWNER_NEW_PASSWORD ?? "";
  if (newPassword.length < 12) {
    throw new Error("PLATFORM_OWNER_NEW_PASSWORD must be at least 12 characters.");
  }

  const targetEmail = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();

  const owners = targetEmail
    ? await sql`
        SELECT pa.user_id, pa.emergency_key_hash, pa.purpose, u.email
        FROM platform_accounts pa
        JOIN "user" u ON u.id = pa.user_id
        WHERE pa.platform_owner = true AND lower(u.email) = ${targetEmail}`
    : await sql`
        SELECT pa.user_id, pa.emergency_key_hash, pa.purpose, u.email
        FROM platform_accounts pa
        JOIN "user" u ON u.id = pa.user_id
        WHERE pa.platform_owner = true
        ORDER BY CASE pa.purpose
          WHEN 'primary' THEN 0
          WHEN 'backup' THEN 1
          WHEN 'cofounder' THEN 2
          ELSE 3
        END, pa.created_at ASC`;

  if (!owners.length) {
    throw new Error(
      targetEmail
        ? `No Platform Owner found for ${targetEmail}.`
        : "No Platform Owner found. Run platform:bootstrap first.",
    );
  }

  if (!targetEmail && owners.length > 1) {
    const emails = owners.map((o) => o.email).join(", ");
    throw new Error(
      `Multiple Platform Owners exist (${emails}). Set PLATFORM_OWNER_EMAIL to choose one.`,
    );
  }

  const owner = owners[0]!;
  const keyHash = hashSecret(emergencyKey);

  if (!owner.emergency_key_hash || owner.emergency_key_hash !== keyHash) {
    await sql`
      INSERT INTO platform_security_events (user_id, event, detail)
      VALUES (${owner.user_id}, 'platform.recover.denied', 'Invalid emergency key')`;
    throw new Error("Emergency recovery key did not match.");
  }

  const passwordHash = await hashPassword(newPassword);

  await sql.begin(async (tx) => {
    await tx`
      UPDATE account
      SET password = ${passwordHash}, updated_at = now()
      WHERE user_id = ${owner.user_id} AND provider_id = 'credential'`;

    await tx`
      UPDATE platform_accounts
      SET mfa_enabled = false,
          status = 'active',
          last_recovered_at = now(),
          updated_at = now()
      WHERE user_id = ${owner.user_id}`;

    await tx`DELETE FROM session WHERE user_id = ${owner.user_id}`;

    if (process.env.PLATFORM_ENABLE_BREAK_GLASS === "YES") {
      await tx`
        UPDATE platform_accounts
        SET status = 'active',
            break_glass_enabled_at = now(),
            updated_at = now()
        WHERE break_glass = true`;
      await tx`
        INSERT INTO platform_security_events (user_id, event, detail)
        VALUES (${owner.user_id}, 'platform.break_glass.enabled', 'Enabled via recover-owner')`;
    }

    await tx`
      INSERT INTO platform_security_events (user_id, event, detail)
      VALUES (
        ${owner.user_id},
        'platform.recover.success',
        'Password reset; sessions cleared; MFA flag cleared'
      )`;
  });

  console.log(`Recovered Platform Owner ${owner.email} (${owner.purpose}).`);
  console.log("All sessions for that user were revoked.");
  if (process.env.PLATFORM_ENABLE_BREAK_GLASS === "YES") {
    console.log("Emergency Recovery account set to active — disable it after use.");
  }
}

main()
  .then(async () => {
    await sql.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await sql.end().catch(() => {});
    process.exit(1);
  });
