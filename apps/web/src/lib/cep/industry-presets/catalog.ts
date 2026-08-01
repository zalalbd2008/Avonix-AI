import { ACTIVE_CATEGORIES, INDUSTRY_CATEGORIES } from "./categories";
import { CREATIVE_PRESETS } from "./creative";
import { DENTAL_PRESETS } from "./dental";
import { HEALTHCARE_PRESETS } from "./healthcare";
import { HOME_SERVICES_PRESETS } from "./home-services";
import { PROFESSIONAL_PRESETS } from "./professional";
import { WEB_DIGITAL_PRESETS } from "./web-digital";
import type {
  CepIndustryPreset,
  IndustryCategory,
  IndustryPresetId,
} from "./types";

export const INDUSTRY_PRESETS: CepIndustryPreset[] = [
  ...HEALTHCARE_PRESETS,
  ...DENTAL_PRESETS,
  ...CREATIVE_PRESETS,
  ...WEB_DIGITAL_PRESETS,
  ...HOME_SERVICES_PRESETS,
  ...PROFESSIONAL_PRESETS,
];

const BY_ID = new Map<IndustryPresetId, CepIndustryPreset>(
  INDUSTRY_PRESETS.map((p) => [p.id, p]),
);

export function listIndustryPresets(
  category?: IndustryCategory,
): CepIndustryPreset[] {
  if (!category) return INDUSTRY_PRESETS;
  return INDUSTRY_PRESETS.filter((p) => p.category === category || p.family === category);
}

export function getIndustryPreset(
  id: IndustryPresetId | string | null | undefined,
): CepIndustryPreset | null {
  if (!id) return null;
  return BY_ID.get(id as IndustryPresetId) ?? null;
}

export function assertIndustryPresetLibrary(): void {
  if (INDUSTRY_PRESETS.length < 50) {
    throw new Error(
      `Industry preset library incomplete: expected ≥50, got ${INDUSTRY_PRESETS.length}`,
    );
  }
  const ids = new Set(INDUSTRY_PRESETS.map((p) => p.id));
  if (ids.size !== INDUSTRY_PRESETS.length) {
    throw new Error("Duplicate industry preset ids detected");
  }
}

export { ACTIVE_CATEGORIES, INDUSTRY_CATEGORIES };
