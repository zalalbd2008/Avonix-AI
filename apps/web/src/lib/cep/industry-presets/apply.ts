import type { CepWidgetPayload } from "@/lib/db/schema";
import type { DetectedSiteBrand } from "./detect";
import type {
  CepIndustryExperience,
  CepIndustryPreset,
} from "./types";

/** Strip catalog-only fields into the editable experience stored on the widget. */
export function presetToExperience(
  preset: CepIndustryPreset,
): CepIndustryExperience {
  const {
    id,
    family: _family,
    catalogBlurb: _blurb,
    matchKeywords: _kw,
    ...experience
  } = preset;
  return {
    ...experience,
    industryPresetId: id,
  };
}

/**
 * Customize a library preset with crawled brand signals.
 * Colors / name / logo / CTAs / contact context are patched — design language stays.
 */
export function customizePresetWithBrand(
  preset: CepIndustryPreset,
  brand: DetectedSiteBrand | null | undefined,
): CepIndustryExperience {
  const base = presetToExperience(preset);
  if (!brand) return base;

  const name = brand.businessName?.trim();
  const primary = brand.brandColors[0];
  const accent = brand.brandColors[1] ?? brand.brandColors[0];

  let greeting = base.greeting;
  if (name) {
    greeting = greeting.replace(/\b(our|the)\s+(clinic|hospital|studio|agency)\b/gi, name);
    if (!greeting.toLowerCase().includes(name.toLowerCase())) {
      greeting = `${greeting}\n\nYou're chatting with ${name}.`;
    }
  }

  const contactBits = [
    brand.phone ? `Phone: ${brand.phone}` : null,
    brand.email ? `Email: ${brand.email}` : null,
    brand.address ? `Address: ${brand.address}` : null,
  ].filter(Boolean);

  let aiPrompt = base.aiPrompt;
  if (name || contactBits.length || brand.services.length) {
    const extras = [
      name ? `Business name: ${name}.` : null,
      contactBits.length ? `Known contact info — ${contactBits.join(" · ")}.` : null,
      brand.services.length
        ? `Detected services/topics: ${brand.services.join(", ")}.`
        : null,
      brand.hasBooking || brand.hasAppointmentLanguage
        ? "Site appears to support appointment/booking language — prefer booking CTAs when relevant."
        : null,
      brand.primaryCta
        ? `Site primary CTA language leans toward: “${brand.primaryCta}”.`
        : null,
      "Never invent medical advice, prices, or case-study claims not grounded in site knowledge.",
      "Do not redesign the widget experience — stay within this industry preset's flows and tone.",
    ]
      .filter(Boolean)
      .join(" ");
    aiPrompt = `${base.aiPrompt}\n\nSite customization context: ${extras}`;
  }

  const colorPalette = { ...base.colorPalette };
  if (primary && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(primary)) {
    colorPalette.primary = primary;
    colorPalette.header = primary;
    if (accent && accent !== primary) {
      colorPalette.primaryEnd = accent;
      colorPalette.accent = accent;
    } else {
      colorPalette.primaryEnd = lighten(primary, 0.18);
    }
  }

  let primaryCta = base.primaryCta;
  if (brand.primaryCta && brand.primaryCta.length <= 40) {
    primaryCta = { ...primaryCta, label: brand.primaryCta };
  }

  const trustBadges = [...base.trustBadges];
  if (brand.phone) trustBadges.unshift(`Call ${brand.phone}`);
  if (name) trustBadges.unshift(name);

  return {
    ...base,
    colorPalette,
    greeting,
    primaryCta,
    aiPrompt,
    trustBadges: trustBadges.slice(0, 6),
    footer: name ? `${base.footer} · ${name}` : base.footer,
  };
}

/**
 * Apply an industry experience onto a CEP widget payload.
 * Preserves placement / sizes / unrelated settings; patches identity, theme, AI, modules, quick replies.
 */
export function applyExperienceToPayload(
  current: CepWidgetPayload,
  experience: CepIndustryExperience,
  opts?: { logoUrl?: string | null },
): CepWidgetPayload {
  const isHealthcare =
    experience.industryPresetId.includes("clinic") ||
    experience.industryPresetId.includes("hospital") ||
    experience.industryPresetId.includes("dental") ||
    experience.industryPresetId.includes("orthodont") ||
    experience.industryPresetId.includes("eye") ||
    experience.industryPresetId.includes("diagnostic") ||
    experience.industryPresetId.includes("physical") ||
    experience.industryPresetId.includes("mental") ||
    experience.industryPresetId.includes("emergency") ||
    experience.industryPresetId.includes("urgent") ||
    experience.industryPresetId.includes("family-doctor");

  const isCreative = !isHealthcare;

  const quickReplies = experience.quickActionGrid.slice(0, 6).map((q) => ({
    id: q.id,
    label: q.label,
    icon: q.icon,
    action: q.action,
    value: q.value,
  }));

  return {
    ...current,
    industryPresetId: experience.industryPresetId,
    experience,
    title: experience.assistantName,
    greeting: experience.greeting,
    placeholder: isCreative
      ? "Ask about projects, packages, or timelines…"
      : "Ask about visits, hours, or how we can help…",
    theme: {
      ...current.theme,
      primaryColor: experience.colorPalette.primary,
      primaryColorEnd: experience.colorPalette.primaryEnd,
      backgroundColor: experience.colorPalette.background,
      textColor: experience.colorPalette.text,
      headerColor: experience.colorPalette.header,
      linkColor: experience.colorPalette.accent,
      agentName: experience.assistantName,
      statusText: experience.assistantRole,
      homeContent: experience.greeting,
      launcherLabel: experience.bubbleCta,
      disclaimer: experience.footer,
      agreementBrandName:
        current.theme?.agreementBrandName || experience.assistantName,
      agreementLogoUrl:
        opts?.logoUrl || current.theme?.agreementLogoUrl || undefined,
      agreementIntro: `Hi! I am your ${experience.assistantRole}.`,
    },
    ai: {
      ...current.ai,
      systemPromptOverride: experience.aiPrompt,
    },
    modules: {
      ...current.modules,
      leadForm: true,
      appointment: isHealthcare || experience.appointmentFlow.length > 0,
      transferAgent: true,
      productCarousel: isCreative,
    },
    triggers: {
      ...current.triggers,
      delayMs: current.triggers?.delayMs ?? 3000,
      exitIntent: true,
    },
    quickReplies,
    botAvatarUrl: current.botAvatarUrl,
    agentAvatarUrl: current.agentAvatarUrl,
  };
}

export function applyIndustryPreset(
  current: CepWidgetPayload,
  preset: CepIndustryPreset,
  brand?: DetectedSiteBrand | null,
): CepWidgetPayload {
  const experience = customizePresetWithBrand(preset, brand);
  return applyExperienceToPayload(current, experience, {
    logoUrl: brand?.logoUrl,
  });
}

function lighten(hex: string, amount: number): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.min(255, ((num >> 16) & 255) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 255) + Math.round(255 * amount));
  const b = Math.min(255, (num & 255) + Math.round(255 * amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
