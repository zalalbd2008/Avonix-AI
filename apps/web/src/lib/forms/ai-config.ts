/**
 * Browser-safe AI form config helpers.
 * Keep DB / Anthropic out of this file — `fields.ts` is imported by client components.
 */
import type { FormAiConfig } from "@/lib/db/schema";

export const DEFAULT_AI: FormAiConfig = {
  enabled: true,
  leadScoring: true,
  spamDetection: true,
  duplicateDetection: true,
  categoryDetection: true,
  suggestedFollowUp: true,
  rewriteMessage: false,
  autofill: false,
  useLlm: true,
  applyToCrm: true,
  categories: [
    "web design",
    "development",
    "seo",
    "ads",
    "branding",
    "support",
    "other",
  ],
};

export function normalizeAi(raw?: FormAiConfig | null): FormAiConfig {
  const categories = (raw?.categories ?? DEFAULT_AI.categories ?? [])
    .map((c) => c.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 24);
  return {
    enabled: raw?.enabled !== false,
    leadScoring: raw?.leadScoring !== false,
    spamDetection: raw?.spamDetection !== false,
    duplicateDetection: raw?.duplicateDetection !== false,
    categoryDetection: raw?.categoryDetection !== false,
    suggestedFollowUp: raw?.suggestedFollowUp !== false,
    rewriteMessage: Boolean(raw?.rewriteMessage),
    autofill: Boolean(raw?.autofill),
    useLlm: raw?.useLlm !== false,
    applyToCrm: raw?.applyToCrm !== false,
    categories: categories.length ? categories : DEFAULT_AI.categories,
  };
}

export function publicAiForEmbed(ai: FormAiConfig): {
  enabled: boolean;
  autofill: boolean;
  rewriteMessage: boolean;
} {
  const n = normalizeAi(ai);
  return {
    enabled: n.enabled !== false,
    autofill: Boolean(n.autofill),
    rewriteMessage: Boolean(n.rewriteMessage || n.autofill),
  };
}
