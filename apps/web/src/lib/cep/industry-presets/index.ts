export type {
  AnalyticsEvent,
  AutomationRule,
  CepIndustryExperience,
  CepIndustryPreset,
  ColorPalette,
  DisplayRule,
  FlowStep,
  IndustryFamily,
  IndustryPresetId,
  QuickAction,
} from "./types";

export {
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
  INDUSTRY_PRESET_PACKAGE_VERSION,
  exportIndustryPresetJson,
  exportIndustryPresetPackage,
  importIndustryPresetJson,
  type ImportResult,
  type IndustryPresetPackage,
} from "./package";
