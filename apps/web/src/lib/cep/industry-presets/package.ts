import { getIndustryPreset } from "./catalog";
import { presetToExperience } from "./apply";
import type {
  CepIndustryExperience,
  CepIndustryPreset,
  IndustryPresetId,
} from "./types";

export const INDUSTRY_PRESET_PACKAGE_VERSION = 2 as const;

export type IndustryPresetPackage = {
  format: "avonix-cep-industry-preset";
  version: typeof INDUSTRY_PRESET_PACKAGE_VERSION;
  exportedAt: string;
  /** Full library preset when exporting from catalog; experience-only when from widget. */
  preset?: CepIndustryPreset;
  experience: CepIndustryExperience;
};

export function exportIndustryPresetPackage(
  source: CepIndustryPreset | CepIndustryExperience,
): IndustryPresetPackage {
  const isLibrary =
    "id" in source &&
    "family" in source &&
    "matchKeywords" in source &&
    "catalogBlurb" in source;

  if (isLibrary) {
    const preset = source as CepIndustryPreset;
    return {
      format: "avonix-cep-industry-preset",
      version: INDUSTRY_PRESET_PACKAGE_VERSION,
      exportedAt: new Date().toISOString(),
      preset,
      experience: presetToExperience(preset),
    };
  }

  return {
    format: "avonix-cep-industry-preset",
    version: INDUSTRY_PRESET_PACKAGE_VERSION,
    exportedAt: new Date().toISOString(),
    experience: source as CepIndustryExperience,
  };
}

export function exportIndustryPresetJson(
  source: CepIndustryPreset | CepIndustryExperience,
): string {
  return JSON.stringify(exportIndustryPresetPackage(source), null, 2);
}

export type ImportResult =
  | { ok: true; experience: CepIndustryExperience; preset: CepIndustryPreset | null }
  | { ok: false; error: string };

export function importIndustryPresetJson(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Package must be an object." };
  }

  const pkg = parsed as Partial<IndustryPresetPackage> & {
    industryPresetId?: string;
  };

  // Accept wrapped package or bare experience / preset.
  let experience: CepIndustryExperience | null = null;
  let preset: CepIndustryPreset | null = null;

  if (pkg.format === "avonix-cep-industry-preset" && pkg.experience) {
    experience = pkg.experience as CepIndustryExperience;
    if (pkg.preset && typeof pkg.preset === "object") {
      preset = pkg.preset as CepIndustryPreset;
    }
  } else if (
    "industryPresetId" in pkg &&
    "assistantName" in pkg &&
    "greeting" in pkg
  ) {
    experience = pkg as unknown as CepIndustryExperience;
  } else if (
    "id" in pkg &&
    "assistantName" in pkg &&
    "matchKeywords" in pkg
  ) {
    preset = pkg as unknown as CepIndustryPreset;
    experience = presetToExperience(preset);
  }

  if (!experience?.industryPresetId || !experience.assistantName) {
    return {
      ok: false,
      error:
        "Unrecognized preset package. Expected avonix-cep-industry-preset JSON.",
    };
  }

  if (!preset) {
    preset = getIndustryPreset(experience.industryPresetId as IndustryPresetId);
  }

  return { ok: true, experience, preset };
}
