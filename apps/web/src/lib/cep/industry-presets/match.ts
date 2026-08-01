import { INDUSTRY_PRESETS } from "./catalog";
import type { DetectedSiteBrand } from "./detect";
import type { CepIndustryPreset, IndustryPresetId, PresetVariantId } from "./types";

export type PresetMatch = {
  preset: CepIndustryPreset;
  score: number;
  /** 0–100 confidence for studio display */
  confidence: number;
  matchedKeywords: string[];
  suggestedVariant: PresetVariantId;
};

function suggestVariant(brand: DetectedSiteBrand, preset: CepIndustryPreset): PresetVariantId {
  const corpus = brand.corpus || "";
  const conversionHeavy =
    brand.hasBooking ||
    /\b(book|appointment|estimate|quote|free consult|financing|reviews?)\b/i.test(corpus);
  const lean =
    corpus.length < 800 ||
    /\b(minimal|simple|fast)\b/i.test(corpus);

  if (conversionHeavy && (preset.category === "home_services" || preset.category === "dental" || preset.category === "web_digital")) {
    return "premium";
  }
  if (lean && preset.category === "professional") return "minimal";
  if (conversionHeavy) return "premium";
  return "professional";
}

/**
 * Score library presets against crawled site corpus.
 * Always returns an existing preset — never invents a design.
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
        score += Math.min(14, 4 + Math.floor(needle.length / 3));
      }
    }
    for (const svc of brand.services) {
      if (preset.matchKeywords.some((k) => k.includes(svc) || svc.includes(k))) {
        score += 2;
      }
    }
    if (brand.hasBooking && (preset.category === "healthcare" || preset.category === "dental")) {
      score += 2;
    }
    if (brand.hasBooking && preset.category === "home_services") score += 1.5;
    return {
      preset,
      score,
      confidence: 0,
      matchedKeywords: matched,
      suggestedVariant: suggestVariant(brand, preset),
    };
  });

  const ranked = scored
    .filter((s) => s.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.preset.industryName.localeCompare(b.preset.industryName),
    );

  const top = ranked[0]?.score || 1;
  return ranked.slice(0, limit).map((m) => ({
    ...m,
    confidence: Math.min(99, Math.round((m.score / top) * 92 + (m.matchedKeywords.length > 1 ? 5 : 0))),
  }));
}

export function pickBestPreset(
  brand: DetectedSiteBrand,
  fallbackId: IndustryPresetId = "general-medical-clinic",
): { preset: CepIndustryPreset; variant: PresetVariantId; confidence: number } {
  const top = matchIndustryPresets(brand, 1)[0];
  if (top) {
    return {
      preset: top.preset,
      variant: top.suggestedVariant,
      confidence: top.confidence,
    };
  }
  const preset =
    INDUSTRY_PRESETS.find((p) => p.id === fallbackId) ?? INDUSTRY_PRESETS[0]!;
  return { preset, variant: "professional", confidence: 35 };
}
