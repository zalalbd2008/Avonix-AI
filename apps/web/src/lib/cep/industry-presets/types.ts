/**
 * Enterprise Industry Preset Library for Live Chat.
 * AI customizes these presets — it must never invent a widget design from scratch.
 */

export type IndustryFamily = "healthcare" | "creative_marketing";

export type IndustryPresetId =
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
  | "logo-design"
  | "branding-agency"
  | "business-card-design"
  | "graphic-design-studio"
  | "website-design"
  | "wordpress-agency"
  | "seo-local-seo"
  | "gbp-management"
  | "digital-marketing";

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

/** Rich experience layer stored on the widget payload (editable). */
export type CepIndustryExperience = {
  industryPresetId: IndustryPresetId;
  industryName: string;
  designPersonality: string;
  colorPalette: ColorPalette;
  headerDesign: string;
  assistantName: string;
  assistantRole: string;
  avatarStyle: string;
  greeting: string;
  suggestedQuestions: string[];
  quickActionGrid: QuickAction[];
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
  automationRules: AutomationRule[];
  displayRules: DisplayRule[];
  triggerRules: string[];
  exitIntentRules: string[];
  analyticsEvents: AnalyticsEvent[];
};

/** Full library entry: experience + applyable widget patch fields. */
export type CepIndustryPreset = CepIndustryExperience & {
  id: IndustryPresetId;
  family: IndustryFamily;
  /** Short catalog blurb for the studio picker. */
  catalogBlurb: string;
  /** Keywords used to match crawled site text (lowercase). */
  matchKeywords: string[];
};
