import type { CepWidgetPayload } from "@/lib/db/schema";
import type { DetectedSiteBrand } from "./detect";
import type {
  CepIndustryExperience,
  CepIndustryPreset,
  PresetVariantId,
} from "./types";
import { resolvePresetExperience } from "./variants";

export function presetToExperience(
  preset: CepIndustryPreset,
  variant: PresetVariantId = "professional",
): CepIndustryExperience {
  return resolvePresetExperience(preset, variant);
}

/**
 * Customize a library preset (+ variant) with crawled brand signals.
 * Design language stays — only branding/content patches.
 */
export function customizePresetWithBrand(
  preset: CepIndustryPreset,
  brand: DetectedSiteBrand | null | undefined,
  variant: PresetVariantId = "professional",
): CepIndustryExperience {
  const base = resolvePresetExperience(preset, variant);
  if (!brand) return base;

  const name = brand.businessName?.trim();
  const primary = brand.brandColors[0];
  const accent = brand.brandColors[1] ?? brand.brandColors[0];

  let greeting = base.greeting;
  if (name && !greeting.toLowerCase().includes(name.toLowerCase())) {
    greeting = `${greeting}\n\nYou're chatting with ${name}.`;
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
        ? "Site appears to support appointment/booking language — prefer booking CTAs."
        : null,
      brand.primaryCta
        ? `Site primary CTA language leans toward: “${brand.primaryCta}”.`
        : null,
      `Preset variant: ${variant}.`,
      "Never invent claims not grounded in site knowledge.",
      "Do not redesign the widget — stay within this industry preset experience.",
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

  const popularServices =
    brand.services.length > 0
      ? [...brand.services.slice(0, 6), ...base.popularServices].slice(0, 8)
      : base.popularServices;

  return {
    ...base,
    colorPalette,
    greeting,
    primaryCta,
    aiPrompt,
    popularServices,
    trustBadges: trustBadges.slice(0, 6),
    footer: name ? `${base.footer} · ${name}` : base.footer,
    knowledgeBaseMapping: [
      ...base.knowledgeBaseMapping,
      ...(brand.faqs.length ? ["faqs"] : []),
      ...(brand.hasBooking ? ["booking"] : []),
    ],
  };
}

export function applyExperienceToPayload(
  current: CepWidgetPayload,
  experience: CepIndustryExperience,
  opts?: { logoUrl?: string | null; brandFaqs?: Array<{ q: string; a: string }> },
): CepWidgetPayload {
  const care =
    experience.category === "healthcare" || experience.category === "dental";
  const creativeish =
    experience.category === "creative" || experience.category === "web_digital";

  const quickReplies = experience.quickActionGrid.slice(0, 8).map((q) => ({
    id: q.id,
    label: q.label,
    icon: q.icon,
    action: q.action,
    value: q.value,
  }));

  const faqFromBrand =
    opts?.brandFaqs && opts.brandFaqs.length
      ? {
          enabled: true,
          items: opts.brandFaqs.slice(0, 8).map((f, i) => ({
            id: `brand-faq-${i}`,
            label: f.q.slice(0, 48),
            answer: f.a,
          })),
        }
      : undefined;

  return {
    ...current,
    industryPresetId: experience.industryPresetId,
    experience,
    title: experience.assistantName,
    greeting: experience.greeting,
    placeholder: care
      ? "Ask about visits, hours, or how we can help…"
      : creativeish
        ? "Ask about projects, packages, or timelines…"
        : "Ask about services, pricing, or next steps…",
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
      replyEtaText:
        experience.variant === "premium"
          ? "We typically reply in under 2 minutes."
          : experience.variant === "minimal"
            ? "We’ll reply as soon as we can."
            : "We typically reply in under 2 minutes.",
    },
    ai: {
      ...current.ai,
      systemPromptOverride: experience.aiPrompt,
    },
    modules: {
      ...current.modules,
      leadForm: true,
      appointment:
        care ||
        experience.category === "home_services" ||
        experience.appointmentFlow.length > 0,
      transferAgent: true,
      productCarousel: creativeish,
    },
    triggers: {
      ...current.triggers,
      delayMs:
        experience.variant === "premium"
          ? 2000
          : (current.triggers?.delayMs ?? 3000),
      exitIntent: experience.variant !== "minimal",
    },
    quickReplies,
    faq: faqFromBrand ?? current.faq,
    botAvatarUrl: current.botAvatarUrl,
    agentAvatarUrl: current.agentAvatarUrl,
  };
}

export function applyIndustryPreset(
  current: CepWidgetPayload,
  preset: CepIndustryPreset,
  brand?: DetectedSiteBrand | null,
  variant: PresetVariantId = "professional",
): CepWidgetPayload {
  const experience = customizePresetWithBrand(preset, brand, variant);
  return applyExperienceToPayload(current, experience, {
    logoUrl: brand?.logoUrl,
    brandFaqs: brand?.faqs,
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
