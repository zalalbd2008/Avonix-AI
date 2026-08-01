import { eq } from "drizzle-orm";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";
import { db } from "@/lib/db";
import {
  platformSettings,
  type CepAiProvider,
  type PlatformAiKeysCipher,
} from "@/lib/db/schema";
import {
  PLATFORM_AI_KEY_PROVIDERS,
  type AiKeyStatus,
} from "@/lib/platform/ai-keys-shared";

export {
  PLATFORM_AI_KEY_PROVIDERS,
  type AiKeyStatus,
} from "@/lib/platform/ai-keys-shared";

let cache: { at: number; keys: Partial<Record<CepAiProvider, string>> } | null =
  null;
const CACHE_MS = 15_000;

export function invalidatePlatformAiKeysCache() {
  cache = null;
}

function envKeyFor(provider: CepAiProvider): string | null {
  switch (provider) {
    case "openrouter":
      return process.env.OPENROUTER_API_KEY?.trim() || null;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY?.trim() || null;
    case "openai":
      return process.env.OPENAI_API_KEY?.trim() || null;
    case "google":
      return (
        process.env.GOOGLE_AI_API_KEY?.trim() ||
        process.env.GEMINI_API_KEY?.trim() ||
        null
      );
    case "groq":
      return process.env.GROQ_API_KEY?.trim() || null;
    case "mistral":
      return process.env.MISTRAL_API_KEY?.trim() || null;
    case "azure_openai":
      return process.env.AZURE_OPENAI_API_KEY?.trim() || null;
    case "custom_openai":
      return process.env.CUSTOM_LLM_API_KEY?.trim() || null;
    default:
      return null;
  }
}

async function readCipherMap(): Promise<PlatformAiKeysCipher> {
  const [row] = await db
    .select({ aiKeys: platformSettings.aiKeys })
    .from(platformSettings)
    .where(eq(platformSettings.id, "default"))
    .limit(1);
  return row?.aiKeys ?? {};
}

/** Decrypted platform DB keys only (no env). */
export async function getDecryptedPlatformAiKeys(): Promise<
  Partial<Record<CepAiProvider, string>>
> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.keys;
  const cipher = await readCipherMap();
  const out: Partial<Record<CepAiProvider, string>> = {};
  for (const { id } of PLATFORM_AI_KEY_PROVIDERS) {
    const blob = cipher[id];
    if (!blob) continue;
    const plain = decryptSecret(blob);
    if (plain) out[id] = plain;
  }
  cache = { at: Date.now(), keys: out };
  return out;
}

/** Resolve key: platform DB first, then env. */
export async function resolveAiApiKey(
  provider: CepAiProvider,
): Promise<string | null> {
  const fromDb = (await getDecryptedPlatformAiKeys())[provider];
  if (fromDb) return fromDb;
  return envKeyFor(provider);
}

export async function hasAiProviderKey(
  provider: CepAiProvider,
): Promise<boolean> {
  if (provider === "azure_openai") {
    const key = await resolveAiApiKey("azure_openai");
    return Boolean(key && process.env.AZURE_OPENAI_ENDPOINT);
  }
  if (provider === "custom_openai") {
    const key = await resolveAiApiKey("custom_openai");
    return Boolean(key && process.env.CUSTOM_LLM_BASE_URL);
  }
  return Boolean(await resolveAiApiKey(provider));
}

export async function listAiKeyStatuses(): Promise<AiKeyStatus[]> {
  const dbKeys = await getDecryptedPlatformAiKeys();
  return PLATFORM_AI_KEY_PROVIDERS.map((p) => {
    const inDb = Boolean(dbKeys[p.id]);
    const inEnv = Boolean(envKeyFor(p.id));
    const source: AiKeyStatus["source"] = inDb
      ? "platform"
      : inEnv
        ? "env"
        : "none";
    return {
      provider: p.id,
      label: p.label,
      envHint: p.envHint,
      inDb,
      inEnv,
      source,
    };
  });
}

/** Upsert/clear encrypted keys. Empty string clears that provider. */
export async function savePlatformAiKeys(
  patch: Partial<Record<CepAiProvider, string>>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const current = await readCipherMap();
    const next: PlatformAiKeysCipher = { ...current };

    for (const [rawId, rawVal] of Object.entries(patch)) {
      const id = rawId as CepAiProvider;
      if (!PLATFORM_AI_KEY_PROVIDERS.some((p) => p.id === id)) continue;
      const val = (rawVal ?? "").trim();
      if (!val) {
        delete next[id];
        continue;
      }
      // Keep existing if UI sent the unchanged mask placeholder
      if (val.includes("…") || val.includes("...")) continue;
      next[id] = encryptSecret(val);
    }

    await db
      .insert(platformSettings)
      .values({
        id: "default",
        maxPlatformOwners: 4,
        aiKeys: next,
      })
      .onConflictDoUpdate({
        target: platformSettings.id,
        set: {
          aiKeys: next,
          updatedAt: new Date(),
        },
      });

    invalidatePlatformAiKeysCache();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save API keys.";
    return { ok: false, error: msg };
  }
}
