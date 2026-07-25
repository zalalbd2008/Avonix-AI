/**
 * Add an additional Platform Owner seat (ADR-012).
 * Cap: platform_settings.max_platform_owners (default 4).
 *
 *   PLATFORM_OWNER_EMAIL=backup@company.com \
 *   PLATFORM_OWNER_PASSWORD='…' \
 *   PLATFORM_OWNER_PURPOSE=backup \
 *   PLATFORM_OWNER_LABEL='Platform Owner #2 · Backup' \
 *   npm run platform:add-owner
 *
 * Purposes: primary | backup | emergency | cofounder | custom
 */
import { createHash, randomBytes } from "node:crypto";
import { config } from "dotenv";
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";
import { validateSignupEmail } from "../src/lib/email/email-policy";

config({ path: ".env.local", quiet: true });

const url = process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("ADMIN_DATABASE_URL or DATABASE_URL must be set");

const sql = postgres(url, { max: 1 });

const PURPOSES = new Set([
  "primary",
  "backup",
  "emergency",
  "cofounder",
  "custom",
]);

function id() {
  return randomBytes(24).toString("base64url");
}

function hashSecret(raw: string) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function recoveryCodes(n = 10) {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const raw = randomBytes(6).toString("hex").toUpperCase();
    out.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`);
  }
  return out;
}

function emergencyKey() {
  return `avx_erk_${randomBytes(32).toString("base64url")}`;
}

async function main() {
  const emailCheck = validateSignupEmail(
    process.env.PLATFORM_OWNER_EMAIL ?? "",
  );
  if (!emailCheck.ok) {
    throw new Error(`PLATFORM_OWNER_EMAIL: ${emailCheck.error}`);
  }
  const email = emailCheck.email;
  const password = process.env.PLATFORM_OWNER_PASSWORD ?? "";
  if (password.length < 12) {
    throw new Error("PLATFORM_OWNER_PASSWORD must be at least 12 characters.");
  }

  const purposeRaw =
    process.env.PLATFORM_OWNER_PURPOSE?.trim().toLowerCase() || "backup";
  if (!PURPOSES.has(purposeRaw)) {
    throw new Error(
      `PLATFORM_OWNER_PURPOSE must be one of: ${[...PURPOSES].join(", ")}`,
    );
  }
  const purpose = purposeRaw;

  const recoveryEmail =
    process.env.PLATFORM_OWNER_RECOVERY_EMAIL?.trim().toLowerCase() || email;
  const recoveryPhone = process.env.PLATFORM_OWNER_RECOVERY_PHONE?.trim() || null;
  const name = process.env.PLATFORM_OWNER_NAME?.trim() || "Platform Owner";

  await sql`
    INSERT INTO platform_settings (id, max_platform_owners)
    VALUES ('default', 4)
    ON CONFLICT (id) DO NOTHING`;

  const [settings] = await sql`
    SELECT max_platform_owners FROM platform_settings WHERE id = 'default'`;
  const max = settings?.max_platform_owners ?? 4;

  const [countRow] = await sql`
    SELECT count(*)::int AS n FROM platform_accounts WHERE platform_owner = true`;
  const used = countRow?.n ?? 0;

  if (used === 0) {
    throw new Error(
      "No Platform Owner yet. Run npm run platform:bootstrap first.",
    );
  }
  if (used >= max) {
    throw new Error(`Maximum Platform Owners reached (${max}).`);
  }

  const [existingUser] = await sql`
    SELECT id FROM "user" WHERE lower(email) = ${email} LIMIT 1`;
  if (existingUser) {
    throw new Error(`A user with email ${email} already exists.`);
  }

  const seat = used + 1;
  const label =
    process.env.PLATFORM_OWNER_LABEL?.trim() ||
    `Platform Owner #${seat} · ${purpose}`;
  const status =
    purpose === "emergency" || process.env.PLATFORM_OWNER_DISABLED === "YES"
      ? "disabled"
      : "active";

  const codes = recoveryCodes(10);
  const erk = emergencyKey();
  const passwordHash = await hashPassword(password);
  const userId = id();
  const accountId = id();
  const now = new Date();

  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
      VALUES (${userId}, ${name}, ${email}, true, ${now}, ${now})`;

    await tx`
      INSERT INTO account (
        id, account_id, provider_id, user_id, password, created_at, updated_at
      ) VALUES (
        ${accountId}, ${userId}, 'credential', ${userId}, ${passwordHash}, ${now}, ${now}
      )`;

    await tx`
      INSERT INTO platform_accounts (
        user_id, platform_owner, break_glass, status, purpose, label,
        recovery_email, recovery_phone, emergency_key_hash, mfa_enabled
      ) VALUES (
        ${userId}, true, false, ${status}, ${purpose}, ${label},
        ${recoveryEmail}, ${recoveryPhone}, ${hashSecret(erk)}, false
      )`;

    for (const code of codes) {
      await tx`
        INSERT INTO platform_recovery_codes (user_id, code_hash)
        VALUES (${userId}, ${hashSecret(code)})`;
    }

    await tx`
      INSERT INTO platform_security_events (user_id, event, detail)
      VALUES (
        ${userId},
        'platform.owner.added',
        ${`${email} purpose=${purpose} status=${status} (${seat}/${max})`}
      )`;
  });

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  PLATFORM OWNER ADDED — STORE OFFLINE NOW");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Owner email:     ${email}`);
  console.log(`  Seat:            ${purpose} (${seat}/${max})`);
  console.log(`  Status:          ${status}`);
  console.log(`  Label:           ${label}`);
  console.log("");
  console.log("  Recovery codes (one-time each):");
  for (const c of codes) console.log(`    ${c}`);
  console.log("");
  console.log("  Emergency recovery key (Layer 5):");
  console.log(`    ${erk}`);
  console.log("");
  console.log("  This output will not be shown again.");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
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
