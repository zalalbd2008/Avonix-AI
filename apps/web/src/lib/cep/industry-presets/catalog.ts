import { CREATIVE_PRESETS } from "./creative";
import { HEALTHCARE_PRESETS } from "./healthcare";
import type {
  CepIndustryPreset,
  IndustryFamily,
  IndustryPresetId,
} from "./types";

export const INDUSTRY_PRESETS: CepIndustryPreset[] = [
  ...HEALTHCARE_PRESETS,
  ...CREATIVE_PRESETS,
];

const BY_ID = new Map<IndustryPresetId, CepIndustryPreset>(
  INDUSTRY_PRESETS.map((p) => [p.id, p]),
);

export function listIndustryPresets(family?: IndustryFamily): CepIndustryPreset[] {
  if (!family) return INDUSTRY_PRESETS;
  return INDUSTRY_PRESETS.filter((p) => p.family === family);
}

export function getIndustryPreset(
  id: IndustryPresetId | string | null | undefined,
): CepIndustryPreset | null {
  if (!id) return null;
  return BY_ID.get(id as IndustryPresetId) ?? null;
}

export function assertIndustryPresetLibrary(): void {
  if (INDUSTRY_PRESETS.length < 20) {
    throw new Error(
      `Industry preset library incomplete: expected ≥20, got ${INDUSTRY_PRESETS.length}`,
    );
  }
  const ids = new Set(INDUSTRY_PRESETS.map((p) => p.id));
  if (ids.size !== INDUSTRY_PRESETS.length) {
    throw new Error("Duplicate industry preset ids detected");
  }
}
