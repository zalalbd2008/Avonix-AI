import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PREFIX = "avx";

/**
 * Connector keys.
 *
 * The key authenticates one website's plugin. We store only its SHA-256 hash,
 * so a leaked database backup cannot be used to post leads as somebody's site.
 * The plaintext exists in one response, once, and is never recoverable — the
 * recovery path is rotation, not retrieval.
 *
 * SHA-256 rather than bcrypt/argon2 on purpose: this is a 160-bit random token,
 * not a human-chosen password. There is nothing to brute-force, and the hash is
 * on the hot path of every form submission, so a deliberately slow KDF would
 * only slow us down.
 */
export function generateConnectorKey() {
  const secret = randomBytes(20).toString("hex"); // 160 bits
  const key = `${PREFIX}_${secret}`;
  return {
    key,
    hash: hashConnectorKey(key),
    prefix: key.slice(0, 12),
  };
}

export function hashConnectorKey(key: string) {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export function looksLikeConnectorKey(key: string) {
  return /^avx_[0-9a-f]{40}$/.test(key);
}

/**
 * Compare two hashes without leaking, through timing, how many leading
 * characters matched.
 *
 * The lookup is by hash so this is belt-and-braces, but the cost is a few
 * microseconds and the failure mode it guards against is silent.
 */
export function hashesMatch(a: string, b: string) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Pull the key out of `Authorization: Bearer …` or `X-Avonix-Key`. */
export function readConnectorKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();

  const header = request.headers.get("x-avonix-key");
  return header?.trim() || null;
}
