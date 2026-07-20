import { voyageProvider } from "./voyage";
import type { EmbeddingProvider } from "./types";

export * from "./types";

let provider: EmbeddingProvider | null | undefined;

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

  const key = process.env.VOYAGE_API_KEY;
  provider = key ? voyageProvider(key) : null;

  if (!provider) {
    console.warn(
      "[ai] VOYAGE_API_KEY is not set — retrieval will use full-text search instead of embeddings.",
    );
  }
  return provider;
}
