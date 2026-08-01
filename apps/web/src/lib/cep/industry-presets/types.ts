/**
 * Enterprise Industry Preset Library
 * AI customizes these presets — never invents a widget design from scratch.
 *
 * Category architecture supports 100+ presets.
 * Each industry has 3 variants: minimal | professional | premium.
 */

export type IndustryCategory =
  | "healthcare"
  | "dental"
  | "creative"
  | "web_digital"
  | "home_services"
  | "professional"
  /** Reserved for future library expansion */
  | "beauty"
  | "legal"
  | "financial"
  | "construction"
  | "automotive"
  | "hospitality"
  | "education"
  | "fitness"
  | "ecommerce"
  | "saas"
  | "technology"
  | "enterprise";

/** @deprecated use IndustryCategory */
export type IndustryFamily = IndustryCategory;

export type PresetVariantId = "minimal" | "professional" | "premium";

export const PRESET_VARIANTS: Array<{
  id: PresetVariantId;
  label: string;
  blurb: string;
}> = [
  {
    id: "minimal",
    label: "Minimal",
    blurb: "Clean, fast, fewer UI elements — speed-first.",
  },
  {
    id: "professional",
    label: "Professional",
    blurb: "Balanced corporate experience — default B2B/B2C.",
  },
  {
    id: "premium",
    label: "Premium / Conversion",
    blurb: "Max CTA, trust, reviews, booking & lead capture.",
  },
];

export type IndustryPresetId =
  // Healthcare (12)
  | "emergency-room"
  | "urgent-care"
  | "general-medical-clinic"
  | "hospital"
  | "family-doctor"
  | "dental-clinic"
  | "orthodontics"
  | "eye-clinic"
  | "diagnostic-lab"
  | "physical-therapy"
  | "mental-health"
  | "womens-health"
  // Dental specialties (5)
  | "cosmetic-dentistry"
  | "dental-implant"
  | "pediatric-dentistry"
  | "endodontics"
  | "oral-surgery"
  // Creative & branding (8)
  | "logo-design"
  | "branding-agency"
  | "business-card-design"
  | "graphic-design-studio"
  | "print-design"
  | "packaging-design"
  | "creative-design-agency"
  | "marketing-collateral"
  // Web & digital (8)
  | "website-design"
  | "wordpress-agency"
  | "seo-agency"
  | "local-seo-agency"
  | "gbp-management"
  | "digital-marketing"
  | "social-media-marketing"
  | "ppc-ads"
  // Home services (8)
  | "roofing"
  | "hvac"
  | "plumbing"
  | "electrician"
  | "pest-control"
  | "cleaning-service"
  | "landscaping"
  | "garage-door"
  // Professional services (9)
  | "law-firm"
  | "cpa-accounting"
  | "insurance-agency"
  | "real-estate"
  | "mortgage"
  | "property-management"
  | "financial-advisor"
  | "business-consultant"
  | "it-support";

export type ColorPalette = {
  primary: string;
  primaryEnd: string;
  header: string;
  background: string;
  text: string;
  accent: string;
  success: string;
  warning: string;
  surface: string;
  darkBackground: string;
  darkText: string;
  darkHeader: string;
};

export type QuickAction = {
  id: string;
  label: string;
  icon: string;
  action: "send_text" | "open_url" | "transfer_agent" | "start_form";
  value?: string;
};

export type FlowStep = {
  id: string;
  title: string;
  prompt: string;
  next?: string[];
};

export type AutomationRule = {
  id: string;
  name: string;
  trigger: string;
  action: string;
};

export type DisplayRule = {
  id: string;
  name: string;
  condition: string;
};

export type AnalyticsEvent = {
  id: string;
  name: string;
  when: string;
};

/** Full editable industry experience (stored on widget payload). */
export type CepIndustryExperience = {
  industryPresetId: IndustryPresetId;
  industryName: string;
  category: IndustryCategory;
  variant: PresetVariantId;
  designPersonality: string;
  businessGoal: string;
  conversionGoal: string;
  primaryCta: { label: string; action: string };
  secondaryCta: { label: string; action: string };
  headerLayout: string;
  headerTheme: string;
  headerDesign: string;
  colorPalette: ColorPalette;
  typography: string;
  assistantName: string;
  assistantRole: string;
  avatarStyle: string;
  greeting: string;
  quickActionGrid: QuickAction[];
  suggestedQuestions: string[];
  popularServices: string[];
  aiPersonality: string;
  salesStrategy: string;
  salesConversationFlow: string;
  leadCaptureStrategy: string;
  leadQualificationFlow: FlowStep[];
  conversationFlow: FlowStep[];
  appointmentFlow: FlowStep[];
  estimateFlow: FlowStep[];
  quoteFlow: FlowStep[];
  portfolioFlow: FlowStep[];
  pricingFlow: FlowStep[];
  faqFlow: FlowStep[];
  reviewCollectionFlow: FlowStep[];
  contactFlow: FlowStep[];
  fileUploadNotes: string;
  imageUploadNotes: string;
  locationSharingNotes: string;
  liveAgentFlow: FlowStep[];
  callBackRequest: string;
  smsRequest: string;
  emailRequest: string;
  humanHandoffRules: string[];
  humanEscalation: string;
  trustBadges: string[];
  trustIndicators: string[];
  footer: string;
  bubbleCta: string;
  bubbleAnimation: string;
  followUpSequence: string[];
  followUpLogic: string;
  aiPrompt: string;
  knowledgeBaseMapping: string[];
  recommendedIcons: string[];
  illustrationStyle: string;
  animations: string[];
  desktopLayout: string;
  tabletLayout: string;
  mobileLayout: string;
  /** @deprecated use mobileLayout */
  mobileNotes: string;
  /** @deprecated use desktopLayout */
  desktopNotes: string;
  darkModeNotes: string;
  accessibilityRules: string[];
  displayRules: DisplayRule[];
  behaviorRules: string[];
  automationRules: AutomationRule[];
  triggerRules: string[];
  smartTriggers: string[];
  exitIntentRules: string[];
  returningVisitorLogic: string;
  businessHoursLogic: string;
  offlineMode: string;
  analyticsEvents: AnalyticsEvent[];
};

/** Catalog entry — professional variant is the base; others resolve via variants engine. */
export type CepIndustryPreset = Omit<CepIndustryExperience, "variant"> & {
  id: IndustryPresetId;
  family: IndustryCategory;
  catalogBlurb: string;
  matchKeywords: string[];
};

export type IndustryCategoryMeta = {
  id: IndustryCategory;
  label: string;
  blurb: string;
};
