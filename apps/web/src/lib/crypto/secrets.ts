/**
 * AES-256-GCM helpers for platform-stored secrets (API keys).
 * Key material: PLATFORM_SECRETS_KEY (32+ chars) or BETTER_AUTH_SECRET.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "v1";

function masterKey(): Buffer {
  const raw =
    process.env.PLATFORM_SECRETS_KEY?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim() ||
    "";
  if (!raw) {
    throw new Error(
      "PLATFORM_SECRETS_KEY or BETTER_AUTH_SECRET is required to store API keys.",
    );
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

/** Encrypt plaintext → `v1:iv:tag:ciphertext` (all base64url). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    enc.toString("base64url"),
  ].join(":");
}

/** Decrypt `v1:iv:tag:ciphertext`. Returns null on failure. */
export function decryptSecret(blob: string): string | null {
  try {
    const parts = String(blob || "").split(":");
    if (parts.length !== 4 || parts[0] !== PREFIX) return null;
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const data = Buffer.from(parts[3], "base64url");
    const decipher = createDecipheriv("aes-256-gcm", masterKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}

export function maskSecret(value: string): string {
  const v = value.trim();
  if (v.length <= 8) return "••••••••";
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}
