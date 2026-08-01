import { INDUSTRY_PRESETS } from "./catalog";
import type { DetectedSiteBrand } from "./detect";
import type { CepIndustryPreset, IndustryPresetId } from "./types";

export type PresetMatch = {
  preset: CepIndustryPreset;
  score: number;
  matchedKeywords: string[];
};

/**
 * Score library presets against crawled site corpus.
 * Always returns the best existing preset — never invents a new design.
 */
export function matchIndustryPresets(
  brand: DetectedSiteBrand,
  limit = 5,
): PresetMatch[] {
  const corpus = brand.corpus || "";
  const scored: PresetMatch[] = INDUSTRY_PRESETS.map((preset) => {
    const matched: string[] = [];
    let score = 0;
    for (const kw of preset.matchKeywords) {
      const needle = kw.toLowerCase();
      if (!needle) continue;
      if (corpus.includes(needle)) {
        matched.push(kw);
        // Longer phrases are more specific.
        score += Math.min(12, 3 + Math.floor(needle.length / 4));
      }
    }
    // Soft boosts from detected services / booking
    for (const svc of brand.services) {
      if (preset.matchKeywords.some((k) => k.includes(svc) || svc.includes(k))) {
        score += 2;
      }
    }
    if (brand.hasBooking && preset.family === "healthcare") score += 1;
    if (
      brand.hasBooking === false &&
      preset.family === "creative_marketing" &&
      /\b(quote|brief|portfolio|seo|marketing)\b/i.test(preset.industryName)
    ) {
      score += 0.5;
    }
    return { preset, score, matchedKeywords: matched };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.preset.industryName.localeCompare(b.preset.industryName))
    .slice(0, limit);
}

export function pickBestPreset(
  brand: DetectedSiteBrand,
  fallbackId: IndustryPresetId = "general-medical-clinic",
): CepIndustryPreset {
  const top = matchIndustryPresets(brand, 1)[0];
  if (top) return top.preset;
  return (
    INDUSTRY_PRESETS.find((p) => p.id === fallbackId) ?? INDUSTRY_PRESETS[0]
  );
}
