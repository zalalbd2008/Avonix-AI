export type {
  AnalyticsEvent,
  AutomationRule,
  CepIndustryExperience,
  CepIndustryPreset,
  ColorPalette,
  DisplayRule,
  FlowStep,
  IndustryCategory,
  IndustryCategoryMeta,
  IndustryFamily,
  IndustryPresetId,
  PresetVariantId,
  QuickAction,
} from "./types";

export { PRESET_VARIANTS } from "./types";

export {
  ACTIVE_CATEGORIES,
  INDUSTRY_CATEGORIES,
  INDUSTRY_PRESETS,
  assertIndustryPresetLibrary,
  getIndustryPreset,
  listIndustryPresets,
} from "./catalog";

export { detectSiteBrand, type DetectedSiteBrand } from "./detect";
export {
  matchIndustryPresets,
  pickBestPreset,
  type PresetMatch,
} from "./match";
export {
  applyExperienceToPayload,
  applyIndustryPreset,
  customizePresetWithBrand,
  presetToExperience,
} from "./apply";
export {
  resolvePresetExperience,
  listVariantExperiences,
} from "./variants";
export {
  INDUSTRY_PRESET_PACKAGE_VERSION,
  exportIndustryPresetJson,
  exportIndustryPresetPackage,
  importIndustryPresetJson,
  type ImportResult,
  type IndustryPresetPackage,
} from "./package";
