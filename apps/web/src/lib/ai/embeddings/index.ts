import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { voyageProvider } from "./voyage";
import type { EmbeddingProvider } from "./types";

export * from "./types";

let provider: EmbeddingProvider | null | undefined;

function parseVoyageFromEnvFile(filePath: string): string | null {
  try {
    const raw = readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^(?:export\s+)?VOYAGE_API_KEY\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[1].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (v) return v;
    }
  } catch {
    // unreadable
  }
  return null;
}

/** Walk cwd (and parents) for a .env that defines VOYAGE_API_KEY. */
function voyageKeyFromDotEnv(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, ".env");
    if (existsSync(candidate)) {
      const key = parseVoyageFromEnvFile(candidate);
      if (key) return key;
    }
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  // Common VPS layout when cwd is repo root or a nested Next chunk dir
  for (const extra of [
    join(process.cwd(), "apps/web/.env"),
    "/root/Avonix-AI/apps/web/.env",
  ]) {
    if (existsSync(extra)) {
      const key = parseVoyageFromEnvFile(extra);
      if (key) return key;
    }
  }
  return null;
}

/**
 * Resolve Voyage key. Empty strings from a poisoned PM2 daemon env must not
 * block reading the real value from apps/web/.env (dotenv never overrides).
 */
export function resolveVoyageApiKey(): string | null {
  const fromEnv = process.env.VOYAGE_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  return voyageKeyFromDotEnv();
}

/**
 * The configured embedding provider, or null when there is no key.
 *
 * Null is a supported state, not an error: retrieval falls back to Postgres
 * full-text search (ADR-005), so the chat answers — less well — without anyone
 * signing up for an account. Same rule as the email dev transport: no state
 * where a feature looks like it works and does not.
 */
export function embeddings(): EmbeddingProvider | null {
  if (provider !== undefined) return provider;

  const key = resolveVoyageApiKey();
  if (key && !process.env.VOYAGE_API_KEY?.trim()) {
    process.env.VOYAGE_API_KEY = key;
  }
  provider = key ? voyageProvider(key) : null;

  if (!provider) {
    console.warn(
      `[ai] VOYAGE_API_KEY is not set — retrieval will use full-text search instead of embeddings. (cwd=${process.cwd()})`,
    );
  }
  return provider;
}
