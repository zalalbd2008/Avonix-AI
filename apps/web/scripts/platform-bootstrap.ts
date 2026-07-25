/**
 * Install-time Platform Owner bootstrap (ADR-012).
 *
 * Creates the primary Platform Owner (+ optional disabled break-glass).
 * Additional seats: `npm run platform:add-owner` (max from platform_settings).
 *
 *   PLATFORM_OWNER_EMAIL=you@company.com \
 *   PLATFORM_OWNER_PASSWORD='…' \
 *   PLATFORM_OWNER_RECOVERY_EMAIL=backup@company.com \
 *   PLATFORM_OWNER_RECOVERY_PHONE='+8801…' \
 *   npm run platform:bootstrap
 *
 * Prints recovery codes + emergency key ONCE — store offline.
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

  const recoveryEmail =
    process.env.PLATFORM_OWNER_RECOVERY_EMAIL?.trim().toLowerCase() || email;
  const recoveryPhone = process.env.PLATFORM_OWNER_RECOVERY_PHONE?.trim() || null;
  const name = process.env.PLATFORM_OWNER_NAME?.trim() || "Platform Owner";
  const label =
    process.env.PLATFORM_OWNER_LABEL?.trim() || "Platform Owner #1 · Primary";

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

  if (used >= max) {
    throw new Error(`Maximum Platform Owners reached (${max}).`);
  }
  if (used > 0) {
    throw new Error(
      `Platform Owners already exist (${used}/${max}). Use npm run platform:add-owner for additional seats.`,
    );
  }

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
        ${userId}, true, false, 'active', 'primary', ${label},
        ${recoveryEmail}, ${recoveryPhone}, ${hashSecret(erk)}, false
      )`;

    for (const code of codes) {
      await tx`
        INSERT INTO platform_recovery_codes (user_id, code_hash)
        VALUES (${userId}, ${hashSecret(code)})`;
    }

    // Emergency twin — disabled until recovery enables it (not a Platform Owner seat)
    const bgUserId = id();
    const bgAccountId = id();
    const bgEmail =
      process.env.PLATFORM_BREAK_GLASS_EMAIL?.trim().toLowerCase() ||
      `breakglass+${email.split("@")[0]}@${email.split("@")[1]}`;
    const bgPassword =
      process.env.PLATFORM_BREAK_GLASS_PASSWORD ||
      randomBytes(24).toString("base64url");
    const bgHash = await hashPassword(bgPassword);

    await tx`
      INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
      VALUES (${bgUserId}, 'Emergency Recovery', ${bgEmail}, true, ${now}, ${now})`;
    await tx`
      INSERT INTO account (
        id, account_id, provider_id, user_id, password, created_at, updated_at
      ) VALUES (
        ${bgAccountId}, ${bgUserId}, 'credential', ${bgUserId}, ${bgHash}, ${now}, ${now}
      )`;
    await tx`
      INSERT INTO platform_accounts (
        user_id, platform_owner, break_glass, status, purpose, label,
        recovery_email, recovery_phone, mfa_enabled
      ) VALUES (
        ${bgUserId}, false, true, 'disabled', 'emergency',
        'Emergency Recovery Account',
        ${recoveryEmail}, ${recoveryPhone}, false
      )`;

    await tx`
      INSERT INTO platform_security_events (user_id, event, detail)
      VALUES (
        ${userId},
        'platform.bootstrap',
        ${`Primary Owner ${email}; emergency ${bgEmail} created disabled (${1}/${max} seats)`}
      )`;

    (globalThis as { __bg?: { email: string; password: string } }).__bg = {
      email: bgEmail,
      password: bgPassword,
    };
  });

  const bg = (globalThis as { __bg?: { email: string; password: string } }).__bg;

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  PLATFORM OWNER BOOTSTRAP COMPLETE — STORE OFFLINE NOW");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Owner email:     ${email}`);
  console.log(`  Seat:            primary (1/${max})`);
  console.log(`  Recovery email:  ${recoveryEmail}`);
  console.log(`  Recovery phone:  ${recoveryPhone ?? "(none)"}`);
  console.log("");
  console.log("  Recovery codes (one-time each):");
  for (const c of codes) console.log(`    ${c}`);
  console.log("");
  console.log("  Emergency recovery key (Layer 5):");
  console.log(`    ${erk}`);
  console.log("");
  if (bg) {
    console.log("  Emergency Recovery account (DISABLED until recover enables it):");
    console.log(`    email:    ${bg.email}`);
    console.log(`    password: ${bg.password}`);
  }
  console.log("");
  console.log("  Add more owners (max " + max + "): npm run platform:add-owner");
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
