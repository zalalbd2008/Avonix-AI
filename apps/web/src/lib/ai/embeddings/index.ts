import { readFileSync } from "fs";
import { join } from "path";
import { voyageProvider } from "./voyage";
import type { EmbeddingProvider } from "./types";

export * from "./types";

let provider: EmbeddingProvider | null | undefined;

/**
 * Resolve Voyage key. Empty strings from a poisoned PM2 daemon env must not
 * block reading the real value from apps/web/.env (dotenv never overrides).
 */
export function resolveVoyageApiKey(): string | null {
  const fromEnv = process.env.VOYAGE_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  try {
    const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^VOYAGE_API_KEY\s*=\s*(.*)$/);
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
    // no .env / unreadable
  }
  return null;
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
    // So the rest of the process sees the same key for this boot.
    process.env.VOYAGE_API_KEY = key;
  }
  provider = key ? voyageProvider(key) : null;

  if (!provider) {
    console.warn(
      "[ai] VOYAGE_API_KEY is not set — retrieval will use full-text search instead of embeddings.",
    );
  }
  return provider;
}
