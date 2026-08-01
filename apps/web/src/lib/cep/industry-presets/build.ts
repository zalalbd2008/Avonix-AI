import type {
  CepIndustryPreset,
  ColorPalette,
  FlowStep,
  IndustryFamily,
  IndustryPresetId,
  QuickAction,
} from "./types";

function flow(steps: Array<[string, string, string]>): FlowStep[] {
  return steps.map(([id, title, prompt], i) => ({
    id,
    title,
    prompt,
    next: i < steps.length - 1 ? [steps[i + 1][0]] : undefined,
  }));
}

function qa(
  items: Array<[string, string, string, QuickAction["action"]?, string?]>,
): QuickAction[] {
  return items.map(([id, label, icon, action = "send_text", value]) => ({
    id,
    label,
    icon,
    action,
    value: value ?? label,
  }));
}

export type PresetDraft = {
  id: IndustryPresetId;
  family: IndustryFamily;
  industryName: string;
  catalogBlurb: string;
  designPersonality: string;
  colors: ColorPalette;
  headerDesign: string;
  assistantName: string;
  assistantRole: string;
  avatarStyle: string;
  greeting: string;
  matchKeywords: string[];
  quickActions: QuickAction[];
  suggestedQuestions: string[];
  primaryCta: { label: string; action: string };
  secondaryCta: { label: string; action: string };
  leadCaptureStrategy: string;
  conversationFlow: FlowStep[];
  appointmentFlow: FlowStep[];
  quoteFlow: FlowStep[];
  portfolioFlow: FlowStep[];
  pricingFlow: FlowStep[];
  faqFlow: FlowStep[];
  contactFlow: FlowStep[];
  humanHandoffRules: string[];
  trustBadges: string[];
  trustIndicators: string[];
  footer: string;
  bubbleCta: string;
  salesConversationFlow: string;
  followUpSequence: string[];
  followUpLogic: string;
  aiPrompt: string;
  businessGoal: string;
  conversionGoal: string;
  recommendedIcons: string[];
  illustrationStyle: string;
  animations: string[];
  mobileNotes: string;
  desktopNotes: string;
  darkModeNotes: string;
  accessibilityRules: string[];
  automationRules: CepIndustryPreset["automationRules"];
  displayRules: CepIndustryPreset["displayRules"];
  triggerRules: string[];
  exitIntentRules: string[];
  analyticsEvents: CepIndustryPreset["analyticsEvents"];
};

export function definePreset(d: PresetDraft): CepIndustryPreset {
  return {
    id: d.id,
    industryPresetId: d.id,
    family: d.family,
    industryName: d.industryName,
    catalogBlurb: d.catalogBlurb,
    designPersonality: d.designPersonality,
    colorPalette: d.colors,
    headerDesign: d.headerDesign,
    assistantName: d.assistantName,
    assistantRole: d.assistantRole,
    avatarStyle: d.avatarStyle,
    greeting: d.greeting,
    matchKeywords: d.matchKeywords,
    quickActionGrid: d.quickActions,
    suggestedQuestions: d.suggestedQuestions,
    primaryCta: d.primaryCta,
    secondaryCta: d.secondaryCta,
    leadCaptureStrategy: d.leadCaptureStrategy,
    conversationFlow: d.conversationFlow,
    appointmentFlow: d.appointmentFlow,
    quoteFlow: d.quoteFlow,
    portfolioFlow: d.portfolioFlow,
    pricingFlow: d.pricingFlow,
    faqFlow: d.faqFlow,
    contactFlow: d.contactFlow,
    humanHandoffRules: d.humanHandoffRules,
    trustBadges: d.trustBadges,
    trustIndicators: d.trustIndicators,
    footer: d.footer,
    bubbleCta: d.bubbleCta,
    salesConversationFlow: d.salesConversationFlow,
    followUpSequence: d.followUpSequence,
    followUpLogic: d.followUpLogic,
    aiPrompt: d.aiPrompt,
    businessGoal: d.businessGoal,
    conversionGoal: d.conversionGoal,
    recommendedIcons: d.recommendedIcons,
    illustrationStyle: d.illustrationStyle,
    animations: d.animations,
    mobileNotes: d.mobileNotes,
    desktopNotes: d.desktopNotes,
    darkModeNotes: d.darkModeNotes,
    accessibilityRules: d.accessibilityRules,
    automationRules: d.automationRules,
    displayRules: d.displayRules,
    triggerRules: d.triggerRules,
    exitIntentRules: d.exitIntentRules,
    analyticsEvents: d.analyticsEvents,
  };
}

export { flow, qa };
