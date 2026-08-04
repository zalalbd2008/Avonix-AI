import type {
  AnalyticsEvent,
  AutomationRule,
  CepIndustryPreset,
  ColorPalette,
  DisplayRule,
  FlowStep,
  IndustryCategory,
  IndustryPresetId,
  QuickAction,
} from "./types";

export function flow(steps: Array<[string, string, string]>): FlowStep[] {
  return steps.map(([id, title, prompt], i) => ({
    id,
    title,
    prompt,
    next: i < steps.length - 1 ? [steps[i + 1][0]] : undefined,
  }));
}

export function qa(
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

export type IndustrySpec = {
  id: IndustryPresetId;
  category: IndustryCategory;
  industryName: string;
  catalogBlurb: string;
  designPersonality: string;
  colors: ColorPalette;
  assistantName: string;
  assistantRole: string;
  greeting: string;
  matchKeywords: string[];
  primaryCta: { label: string; action: string };
  secondaryCta: { label: string; action: string };
  bubbleCta: string;
  footer: string;
  businessGoal: string;
  conversionGoal: string;
  aiPrompt: string;
  salesStrategy: string;
  popularServices: string[];
  suggestedQuestions?: string[];
  quickActions?: QuickAction[];
  trustBadges?: string[];
  recommendedIcons?: string[];
};

const A11Y = [
  "WCAG 2.2 AA contrast on text and CTAs",
  "Keyboard-reachable quick actions",
  "Screen-reader labels on bubble and header",
  "Respect prefers-reduced-motion",
  "Focus ring visible on all interactive controls",
];

const ANALYTICS: AnalyticsEvent[] = [
  { id: "preset_applied", name: "Preset applied", when: "industry preset + variant customized" },
  { id: "quick_action", name: "Quick action", when: "visitor taps an action card" },
  { id: "lead_start", name: "Lead started", when: "lead qualification begins" },
  { id: "book_click", name: "Primary CTA", when: "primary conversion action clicked" },
  { id: "handoff", name: "Human handoff", when: "transfer to live agent" },
  { id: "exit_intent", name: "Exit intent", when: "exit-intent offer shown" },
];

function defaultQuickActions(category: IndustryCategory): QuickAction[] {
  if (category === "healthcare" || category === "dental") {
    return qa([
      ["book", "Book Appointment", "calendar", "send_text", "I'd like to book an appointment"],
      ["services", "Our Services", "stethoscope"],
      ["insurance", "Insurance", "shield"],
      ["hours", "Hours & Location", "map-pin"],
      ["emergency", "Emergency Help", "alert"],
      ["reviews", "Patient Reviews", "sparkles"],
      ["callback", "Request Callback", "phone"],
      ["human", "Talk to Staff", "headphones", "transfer_agent"],
    ]);
  }
  if (category === "home_services") {
    return qa([
      ["estimate", "Free Estimate", "calculator", "send_text", "I'd like a free estimate"],
      ["emergency", "Emergency Service", "alert"],
      ["services", "Our Services", "layers"],
      ["schedule", "Schedule Visit", "calendar"],
      ["photos", "Before / After", "image"],
      ["financing", "Financing", "briefcase"],
      ["callback", "Call Me Back", "phone"],
      ["human", "Talk to Dispatcher", "headphones", "transfer_agent"],
    ]);
  }
  if (category === "professional") {
    return qa([
      ["consult", "Book Consultation", "calendar", "send_text", "I'd like to book a consultation"],
      ["services", "Our Services", "briefcase"],
      ["process", "How It Works", "git-branch"],
      ["pricing", "Fees / Pricing", "layers"],
      ["docs", "What to Bring", "file-text"],
      ["reviews", "Client Reviews", "sparkles"],
      ["callback", "Request Callback", "phone"],
      ["human", "Talk to Advisor", "headphones", "transfer_agent"],
    ]);
  }
  // creative + web_digital
  return qa([
    ["quote", "Get a Quote", "calculator", "send_text", "I'd like a project quote"],
    ["portfolio", "See Portfolio", "image"],
    ["packages", "View Pricing", "layers"],
    ["brief", "Start a Brief", "file-text"],
    ["call", "Book a Call", "phone", "start_form"],
    ["process", "Our Process", "git-branch"],
    ["timeline", "Timeline", "clock"],
    ["human", "Talk to a Human", "headphones", "transfer_agent"],
  ]);
}

export function defineIndustry(spec: IndustrySpec): CepIndustryPreset {
  const cat = spec.category;
  const isCare = cat === "healthcare" || cat === "dental";
  const isService = cat === "home_services";
  const isPro = cat === "professional";

  const automation: AutomationRule[] = [
    {
      id: "after-hours",
      name: "After hours",
      trigger: "outside business hours",
      action: "Collect callback + promise next-business-day reply",
    },
    {
      id: "lead-nurture",
      name: "Lead nurture",
      trigger: "lead started not completed",
      action: "Send soft reminder with resume link",
    },
    ...(isCare
      ? [
          {
            id: "urgent-route",
            name: "Urgent route",
            trigger: "visitor signals emergency symptoms",
            action: "Show emergency protocol + call CTA",
          },
        ]
      : []),
  ];

  const display: DisplayRule[] = [
    {
      id: "sitewide",
      name: "Sitewide",
      condition: "everywhere except checkout / admin / portal logout",
    },
  ];

  return {
    id: spec.id,
    industryPresetId: spec.id,
    family: cat,
    category: cat,
    industryName: spec.industryName,
    catalogBlurb: spec.catalogBlurb,
    designPersonality: spec.designPersonality,
    colorPalette: spec.colors,
    matchKeywords: spec.matchKeywords,
    headerLayout: "Avatar + name + role · tools · close",
    headerTheme: "Industry primary header with soft status pill",
    headerDesign: "Trust bar · brand accent line · live status",
    typography: "Modern enterprise sans · clear hierarchy · AA contrast",
    assistantName: spec.assistantName,
    assistantRole: spec.assistantRole,
    avatarStyle: "Professional brand avatar with industry motif",
    greeting: spec.greeting,
    quickActionGrid: spec.quickActions ?? defaultQuickActions(cat),
    suggestedQuestions: spec.suggestedQuestions ?? [
      "What services do you offer?",
      "How do I get started?",
      "What are your hours?",
      "Can I speak with someone?",
    ],
    popularServices: spec.popularServices,
    primaryCta: spec.primaryCta,
    secondaryCta: spec.secondaryCta,
    businessGoal: spec.businessGoal,
    conversionGoal: spec.conversionGoal,
    aiPersonality: `${spec.designPersonality}. Helpful, concise, industry-fluent, never invent facts.`,
    salesStrategy: spec.salesStrategy,
    salesConversationFlow: spec.salesStrategy,
    leadCaptureStrategy: isCare
      ? "Capture name + phone + reason early; offer callback if queues are long."
      : isService
        ? "Capture name + phone + ZIP + job type before estimate details."
        : isPro
          ? "Capture name + email + matter/goal before deep advice."
          : "Capture name + email + project type before deep portfolio browsing.",
    leadQualificationFlow: flow([
      ["intent", "Intent", "Clarify what they need in one sentence."],
      ["fit", "Fit", "Confirm service fit and timeline/urgency."],
      ["contact", "Contact", "Collect best contact channel."],
      ["next", "Next step", "Route to book, estimate, quote, or human."],
    ]),
    conversationFlow: flow([
      ["greet", "Greet", "Welcome and offer quick actions."],
      ["qualify", "Qualify", "Understand need without interrogating."],
      ["proof", "Proof", "Share relevant services, proof, or FAQs."],
      ["convert", "Convert", "Drive primary CTA or handoff."],
    ]),
    appointmentFlow: flow([
      ["type", "Type", "Confirm appointment / consult type."],
      ["when", "When", "Offer soonest windows or callback."],
      ["details", "Details", "Collect name, phone, preferences."],
      ["confirm", "Confirm", "Confirm next step and prep notes."],
    ]),
    estimateFlow: flow([
      ["scope", "Scope", "Clarify job/project scope."],
      ["location", "Location", "Confirm service area / ZIP if relevant."],
      ["photos", "Photos", "Ask for photos when helpful."],
      ["estimate", "Estimate", "Offer range or schedule on-site estimate."],
    ]),
    quoteFlow: flow([
      ["deliverables", "Deliverables", "List what they need delivered."],
      ["budget", "Budget", "Ask budget band without pressure."],
      ["timing", "Timing", "Confirm deadline."],
      ["quote", "Quote", "Share package ranges or escalate custom quote."],
    ]),
    portfolioFlow: flow([
      ["niche", "Niche", "Ask style / industry preference."],
      ["samples", "Samples", "Surface matching examples."],
      ["next", "Next", "Invite quote or call."],
    ]),
    pricingFlow: flow([
      ["packages", "Packages", "Explain good / better / best options."],
      ["addons", "Add-ons", "Mention common add-ons."],
      ["close", "Close", "Route to quote, book, or checkout."],
    ]),
    faqFlow: flow([
      ["hours", "Hours", "Answer hours and availability."],
      ["process", "Process", "Explain how engagement works."],
      ["prep", "Prep", "Share what to prepare."],
    ]),
    reviewCollectionFlow: flow([
      ["ask", "Ask", "Politely ask if they had a good experience."],
      ["link", "Link", "Share review link when appropriate."],
      ["thanks", "Thanks", "Thank them and offer further help."],
    ]),
    contactFlow: flow([
      ["channel", "Channel", "Offer call, SMS, email, or form."],
      ["collect", "Collect", "Capture name + preferred channel."],
    ]),
    liveAgentFlow: flow([
      ["detect", "Detect", "Recognize human request or complex case."],
      ["context", "Context", "Summarize visitor need for the agent."],
      ["queue", "Queue", "Place in queue and set expectations."],
    ]),
    fileUploadNotes: "Accept PDF/docs for intake when relevant; never require PHI over insecure channels.",
    imageUploadNotes: "Accept job/site/smile/portfolio reference photos when helpful.",
    locationSharingNotes: "Optional ZIP/address for routing and service-area checks.",
    callBackRequest: "Collect name + phone + best time window.",
    smsRequest: "Collect mobile + consent before SMS follow-up.",
    emailRequest: "Collect email + topic summary.",
    humanHandoffRules: [
      "Angry visitor after 2 turns → human",
      "Explicit “talk to human” → transfer",
      "High-value confirmed intent → sales/clinical handoff",
    ],
    humanEscalation:
      "Escalate when confidence is low, urgency is high, or the visitor requests a person.",
    trustBadges: spec.trustBadges ?? [
      "Verified business",
      "Secure messaging",
      "Real humans available",
    ],
    trustIndicators: ["Reviews", "Credentials", "Response time"],
    footer: spec.footer,
    bubbleCta: spec.bubbleCta,
    bubbleAnimation: "Soft pop-in + optional CTA pill pulse (respect reduced motion)",
    followUpSequence: [
      "T+1h: helpful resource matching their intent",
      "T+24h: soft CTA reminder",
      "T+5d: case study / tip with opt-out",
    ],
    followUpLogic: "Pause if booked/opted out; accelerate when budget/urgency confirmed.",
    aiPrompt: `${spec.aiPrompt}\n\nNever invent prices, guarantees, medical advice, or legal outcomes. Stay inside this industry preset's flows and tone. Do not redesign the widget experience.`,
    knowledgeBaseMapping: [
      "services",
      "pricing",
      "faqs",
      "about",
      "contact",
      "reviews",
    ],
    recommendedIcons: spec.recommendedIcons ?? [
      "calendar",
      "phone",
      "sparkles",
      "briefcase",
    ],
    illustrationStyle: "Premium industry motif · clean line art · high trust",
    animations: [
      "staggered action-card entrance",
      "soft hover lift",
      "status pulse",
    ],
    desktopLayout: "Two-column action cards · richer FAQ beside transcript",
    tabletLayout: "Same card grid · slightly tighter padding",
    mobileLayout: "Thumb-friendly cards · sticky primary CTA",
    mobileNotes: "Thumb-friendly cards · sticky primary CTA",
    desktopNotes: "Two-column action cards · richer FAQ beside transcript",
    darkModeNotes: "Deep surfaces · preserve brand primary accents",
    accessibilityRules: A11Y,
    displayRules: display,
    behaviorRules: [
      "Open with greeting + action cards",
      "Prefer preset flows over freeform guessing",
      "Always offer human handoff",
    ],
    automationRules: automation,
    triggerRules: [
      "Delay 3s on key service pages",
      "Re-engage on pricing/booking pages",
    ],
    smartTriggers: [
      "Service-page dwell > 20s → suggest primary CTA",
      "Scroll 60% on pricing → offer quote/book card",
    ],
    exitIntentRules: [
      "Offer mini-form or callback",
      "Never block emergency CTAs",
    ],
    returningVisitorLogic:
      "Greet as returning; resume last intent; skip redundant qualification when possible.",
    businessHoursLogic:
      "Show live status in-hours; offline callback form after hours.",
    offlineMode:
      "Collect name + contact + message; set clear next-response expectation.",
    analyticsEvents: ANALYTICS,
  };
}
