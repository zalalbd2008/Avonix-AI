"use server";

import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import {
  ACTIVE_CATEGORIES,
  INDUSTRY_CATEGORIES,
  PRESET_VARIANTS,
  applyExperienceToPayload,
  applyIndustryPreset,
  customizePresetWithBrand,
  detectSiteBrand,
  exportIndustryPresetJson,
  getIndustryPreset,
  importIndustryPresetJson,
  listIndustryPresets,
  matchIndustryPresets,
  pickBestPreset,
  type DetectedSiteBrand,
  type IndustryPresetId,
  type PresetVariantId,
} from "@/lib/cep/industry-presets";
import type { CepWidgetPayload } from "@/lib/db/schema";

async function loadWebsiteUrl(agencyId: string, websiteId: string) {
  const [row] = await withAgency(agencyId, (tx) =>
    tx
      .select({ url: websites.url, name: websites.name })
      .from(websites)
      .where(
        and(
          eq(websites.id, websiteId),
          eq(websites.agencyId, agencyId),
          isNull(websites.deletedAt),
        ),
      )
      .limit(1),
  );
  return row ?? null;
}

export async function actionListIndustryPresets() {
  await requireAgency();
  return {
    categories: INDUSTRY_CATEGORIES.filter((c) =>
      ACTIVE_CATEGORIES.includes(c.id),
    ),
    variants: PRESET_VARIANTS,
    presets: listIndustryPresets().map((p) => ({
      id: p.id,
      family: p.family,
      category: p.category,
      industryName: p.industryName,
      catalogBlurb: p.catalogBlurb,
      designPersonality: p.designPersonality,
      assistantName: p.assistantName,
      colors: p.colorPalette,
      businessGoal: p.businessGoal,
      conversionGoal: p.conversionGoal,
      experienceCount: 3,
    })),
    totals: {
      industries: listIndustryPresets().length,
      experiences: listIndustryPresets().length * 3,
    },
  };
}

export async function actionDetectSiteBrand(input: {
  websiteId: string;
}): Promise<
  | {
      ok: true;
      brand: DetectedSiteBrand;
      matches: Array<{
        id: string;
        score: number;
        confidence: number;
        name: string;
        category: string;
        suggestedVariant: PresetVariantId;
      }>;
    }
  | { ok: false; error: string }
> {
  const ctx = await requireAgency();
  const site = await loadWebsiteUrl(ctx.agencyId, input.websiteId);
  if (!site) return { ok: false, error: "Website not found." };

  try {
    const brand = await detectSiteBrand(site.url);
    if (!brand.businessName && site.name) {
      brand.businessName = site.name;
    }
    const matches = matchIndustryPresets(brand, 5).map((m) => ({
      id: m.preset.id,
      score: m.score,
      confidence: m.confidence,
      name: m.preset.industryName,
      category: m.preset.category,
      suggestedVariant: m.suggestedVariant,
    }));
    return { ok: true, brand, matches };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Site detection failed.",
    };
  }
}

export async function actionApplyIndustryPreset(input: {
  websiteId: string;
  presetId: IndustryPresetId;
  payload: CepWidgetPayload;
  variant?: PresetVariantId;
  detectAndCustomize?: boolean;
}): Promise<
  | {
      ok: true;
      payload: CepWidgetPayload;
      brand: DetectedSiteBrand | null;
      presetId: IndustryPresetId;
      presetName: string;
      variant: PresetVariantId;
    }
  | { ok: false; error: string }
> {
  const ctx = await requireAgency();
  const preset = getIndustryPreset(input.presetId);
  if (!preset) return { ok: false, error: "Unknown industry preset." };
  const variant = input.variant ?? "professional";

  let brand: DetectedSiteBrand | null = null;
  if (input.detectAndCustomize) {
    const site = await loadWebsiteUrl(ctx.agencyId, input.websiteId);
    if (!site) return { ok: false, error: "Website not found." };
    try {
      brand = await detectSiteBrand(site.url);
      if (!brand.businessName && site.name) brand.businessName = site.name;
    } catch {
      brand = null;
    }
  }

  const payload = applyIndustryPreset(input.payload, preset, brand, variant);
  return {
    ok: true,
    payload,
    brand,
    presetId: preset.id,
    presetName: preset.industryName,
    variant,
  };
}

export async function actionAutoSelectIndustryPreset(input: {
  websiteId: string;
  payload: CepWidgetPayload;
}): Promise<
  | {
      ok: true;
      payload: CepWidgetPayload;
      brand: DetectedSiteBrand;
      presetId: IndustryPresetId;
      presetName: string;
      variant: PresetVariantId;
      confidence: number;
      matches: Array<{
        id: string;
        score: number;
        confidence: number;
        name: string;
        suggestedVariant: PresetVariantId;
      }>;
    }
  | { ok: false; error: string }
> {
  const ctx = await requireAgency();
  const site = await loadWebsiteUrl(ctx.agencyId, input.websiteId);
  if (!site) return { ok: false, error: "Website not found." };

  try {
    const brand = await detectSiteBrand(site.url);
    if (!brand.businessName && site.name) brand.businessName = site.name;
    const matches = matchIndustryPresets(brand, 5).map((m) => ({
      id: m.preset.id,
      score: m.score,
      confidence: m.confidence,
      name: m.preset.industryName,
      suggestedVariant: m.suggestedVariant,
    }));
    const best = pickBestPreset(brand);
    const payload = applyIndustryPreset(
      input.payload,
      best.preset,
      brand,
      best.variant,
    );
    return {
      ok: true,
      payload,
      brand,
      presetId: best.preset.id,
      presetName: best.preset.industryName,
      variant: best.variant,
      confidence: best.confidence,
      matches,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Auto-select failed.",
    };
  }
}

export async function actionExportIndustryPresetJson(input: {
  payload: CepWidgetPayload;
}): Promise<{ ok: true; json: string } | { ok: false; error: string }> {
  await requireAgency();
  const exp = input.payload.experience;
  if (!exp) {
    const id = input.payload.industryPresetId;
    const preset = getIndustryPreset(id);
    if (!preset) {
      return { ok: false, error: "No industry preset applied to export." };
    }
    return { ok: true, json: exportIndustryPresetJson(preset) };
  }
  return { ok: true, json: exportIndustryPresetJson(exp) };
}

export async function actionImportIndustryPresetJson(input: {
  json: string;
  payload: CepWidgetPayload;
}): Promise<
  | { ok: true; payload: CepWidgetPayload }
  | { ok: false; error: string }
> {
  await requireAgency();
  const result = importIndustryPresetJson(input.json);
  if (!result.ok) return result;

  const experience = result.preset
    ? customizePresetWithBrand(
        result.preset,
        null,
        result.experience.variant ?? "professional",
      )
    : result.experience;

  const merged = {
    ...experience,
    ...result.experience,
    industryPresetId: result.experience.industryPresetId,
  };

  return {
    ok: true,
    payload: applyExperienceToPayload(input.payload, merged),
  };
}
