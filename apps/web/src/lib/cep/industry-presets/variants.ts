import type {
  CepIndustryExperience,
  CepIndustryPreset,
  PresetVariantId,
  QuickAction,
} from "./types";

/**
 * Resolve a catalog preset into a full experience for a variant.
 * Professional = base. Minimal = leaner. Premium = conversion-max.
 */
export function resolvePresetExperience(
  preset: CepIndustryPreset,
  variant: PresetVariantId = "professional",
): CepIndustryExperience {
  const base: CepIndustryExperience = {
    ...preset,
    variant: "professional",
  };

  if (variant === "professional") return base;

  if (variant === "minimal") {
    const quick = base.quickActionGrid.slice(0, 4);
    return {
      ...base,
      variant: "minimal",
      designPersonality: `${base.designPersonality} · minimal`,
      headerLayout: "Compact avatar + name · close only",
      headerTheme: "Clean single-tone header · no extra chrome",
      greeting: trimGreeting(base.greeting),
      quickActionGrid: quick,
      suggestedQuestions: base.suggestedQuestions.slice(0, 2),
      trustBadges: base.trustBadges.slice(0, 1),
      animations: ["subtle fade-in"],
      bubbleAnimation: "Simple fade — no pulse",
      smartTriggers: [],
      exitIntentRules: ["Soft callback offer only"],
      automationRules: base.automationRules.slice(0, 1),
      behaviorRules: [
        "Fewer cards · faster path to human or primary CTA",
        "Avoid multi-step funnels unless asked",
      ],
      salesStrategy: `${base.salesStrategy} Keep it short — qualify in ≤3 turns.`,
      aiPrompt: `${base.aiPrompt}\n\nVariant=minimal: be brief, show at most 4 actions, prefer one clear next step.`,
      desktopLayout: "Single-column lean cards · minimal chrome",
      mobileLayout: "4 large tap targets · no secondary clutter",
      mobileNotes: "4 large tap targets · no secondary clutter",
      desktopNotes: "Single-column lean cards · minimal chrome",
    };
  }

  // premium
  const premiumActions = ensureEight(base.quickActionGrid, base.primaryCta.label);
  return {
    ...base,
    variant: "premium",
    designPersonality: `${base.designPersonality} · conversion premium`,
    headerLayout: "Avatar + name + role · trust chip · tools · close",
    headerTheme: "Rich brand header · review/trust micro-line",
    greeting: premiumGreeting(base.greeting, base.industryName),
    quickActionGrid: premiumActions,
    suggestedQuestions: [
      ...base.suggestedQuestions,
      `How soon can we start with ${base.industryName}?`,
    ].slice(0, 6),
    trustBadges: [
      ...base.trustBadges,
      "Google reviews highlighted",
      "Fast response promise",
      "Secure lead capture",
    ].slice(0, 6),
    animations: [
      "staggered action-card entrance",
      "CTA pill pulse",
      "trust badge shimmer (subtle)",
    ],
    bubbleAnimation: "CTA pill + soft pulse (respect reduced motion)",
    smartTriggers: [
      ...base.smartTriggers,
      "Returning visitor → skip to last CTA",
      "High-intent page → auto-open after 2s",
    ],
    exitIntentRules: [
      "Show limited-slot / free estimate offer",
      "Capture email/SMS with one-field form",
      "Never block emergency CTAs",
    ],
    automationRules: [
      ...base.automationRules,
      {
        id: "review-ask",
        name: "Review ask",
        trigger: "successful booking/quote completed",
        action: "Schedule review request after delivery window",
      },
      {
        id: "premium-nurture",
        name: "Premium nurture",
        trigger: "quote started",
        action: "Multi-touch follow-up with social proof",
      },
    ],
    behaviorRules: [
      "Lead with social proof + primary CTA",
      "Always surface booking/quote/estimate path",
      "Offer callback + SMS + email channels",
    ],
    salesStrategy: `${base.salesStrategy} Premium variant: emphasize urgency, proof, and dual CTAs every 3 turns.`,
    leadCaptureStrategy: `${base.leadCaptureStrategy} Ask earlier; offer calendar + SMS callback.`,
    aiPrompt: `${base.aiPrompt}\n\nVariant=premium: maximize conversion with trust badges, reviews, dual CTAs, and proactive booking/quote offers — without being pushy or inventing claims.`,
    desktopLayout: "Card grid + trust strip + sticky primary CTA",
    tabletLayout: "Card grid with trust chips under greeting",
    mobileLayout: "Sticky bottom CTA · 8 compact cards · trust line",
    mobileNotes: "Sticky bottom CTA · 8 compact cards · trust line",
    desktopNotes: "Card grid + trust strip + sticky primary CTA",
    reviewCollectionFlow: base.reviewCollectionFlow,
  };
}

function trimGreeting(g: string) {
  const first = g.split(/(?<=[.!?])\s+/)[0] ?? g;
  return first.length > 140 ? `${first.slice(0, 137)}…` : first;
}

function premiumGreeting(g: string, industry: string) {
  if (/review|book|quote|estimate|choose an option/i.test(g)) return g;
  return `${g} Thousands trust ${industry} pros like us — pick an option below to get started.`;
}

function ensureEight(actions: QuickAction[], primaryLabel: string): QuickAction[] {
  const out = [...actions];
  const extras: QuickAction[] = [
    {
      id: "reviews",
      label: "See Reviews",
      icon: "sparkles",
      action: "send_text",
      value: "Show me recent reviews",
    },
    {
      id: "callback",
      label: "Call Me Back",
      icon: "phone",
      action: "send_text",
      value: "Please call me back",
    },
    {
      id: "primary",
      label: primaryLabel,
      icon: "calendar",
      action: "send_text",
      value: primaryLabel,
    },
  ];
  for (const e of extras) {
    if (out.length >= 8) break;
    if (!out.some((a) => a.id === e.id || a.label === e.label)) out.push(e);
  }
  return out.slice(0, 8);
}

export function listVariantExperiences(
  preset: CepIndustryPreset,
): CepIndustryExperience[] {
  return (["minimal", "professional", "premium"] as PresetVariantId[]).map((v) =>
    resolvePresetExperience(preset, v),
  );
}
