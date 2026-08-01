import { definePreset, flow, qa } from "./build";
import type { CepIndustryPreset, ColorPalette } from "./types";

const a11y = [
  "WCAG 2.2 AA contrast on text and CTAs",
  "Keyboard-reachable quick actions",
  "Screen-reader labels on bubble and header",
  "Respect prefers-reduced-motion",
  "Focus ring visible on all interactive controls",
];

function creativeBase(
  colors: ColorPalette,
  extra: Partial<Parameters<typeof definePreset>[0]> & {
    id: CepIndustryPreset["id"];
    industryName: string;
    catalogBlurb: string;
    designPersonality: string;
    assistantName: string;
    assistantRole: string;
    greeting: string;
    matchKeywords: string[];
    primaryCta: { label: string; action: string };
    secondaryCta: { label: string; action: string };
    aiPrompt: string;
    businessGoal: string;
    conversionGoal: string;
    bubbleCta: string;
    footer: string;
    salesConversationFlow: string;
  },
): CepIndustryPreset {
  return definePreset({
    family: "creative_marketing",
    colors,
    headerDesign: "Studio masthead · bold brand stripe · creative status chip",
    avatarStyle: "Stylized creative director mark · geometric / craft motif",
    quickActions: qa([
      ["quote", "Get a Quote", "calculator", "send_text", "I'd like a project quote"],
      ["portfolio", "See Our Portfolio", "image"],
      ["packages", "View Pricing", "layers"],
      ["brief", "Start a Brief", "file-text", "send_text", "I want to start a project brief"],
      ["call", "Book a Call", "phone", "send_text", "I'd like to book a discovery call"],
      ["human", "Talk to a Designer", "headphones", "transfer_agent"],
    ]),
    suggestedQuestions: [
      "How much does a typical project cost?",
      "Can I see recent work?",
      "What's your turnaround time?",
      "Do you work with startups?",
    ],
    leadCaptureStrategy:
      "Capture name + email + project type before deep portfolio browsing; offer calendar for serious buyers.",
    conversationFlow: flow([
      ["greet", "Greet", "Welcome and ask what they're looking to create or grow."],
      ["qualify", "Qualify", "Budget band, timeline, and decision stage."],
      ["proof", "Proof", "Share relevant case studies or package fit."],
      ["convert", "Convert", "Book discovery call or collect brief + deposit CTA."],
    ]),
    appointmentFlow: flow([
      ["call-type", "Call type", "Discovery vs project kickoff."],
      ["slot", "Slot", "Offer available consult windows."],
      ["prep", "Prep", "Send brief checklist before the call."],
    ]),
    quoteFlow: flow([
      ["scope", "Scope", "Clarify deliverables and revisions."],
      ["band", "Budget", "Ask budget range without being pushy."],
      ["estimate", "Estimate", "Share package ranges; escalate custom quotes."],
    ]),
    portfolioFlow: flow([
      ["niche", "Niche", "Ask industry / style preference."],
      ["samples", "Samples", "Surface 2–3 matching examples."],
      ["next", "Next", "Invite quote or call."],
    ]),
    pricingFlow: flow([
      ["packages", "Packages", "Explain good / better / best packages."],
      ["addons", "Add-ons", "Mention common add-ons."],
      ["close", "Close", "Route to quote form or checkout."],
    ]),
    faqFlow: flow([
      ["process", "Process", "Explain kickoff → drafts → delivery."],
      ["revisions", "Revisions", "Clarify revision policy."],
      ["files", "Files", "List deliverable formats."],
    ]),
    contactFlow: flow([
      ["channel", "Channel", "Call, email, or brief form."],
      ["collect", "Collect", "Name, email, company, project summary."],
    ]),
    humanHandoffRules: [
      "Custom enterprise RFPs → human strategist",
      "Angry revision disputes → human account lead",
      "Budget confirmed above top package → sales handoff",
    ],
    trustBadges: ["Client logos available", "Clear revision policy", "Secure file delivery"],
    trustIndicators: ["Years in market", "NPS / reviews", "Case study metrics"],
    followUpSequence: [
      "T+1h: send portfolio pack matching their niche",
      "T+24h: offer discovery call slots",
      "T+5d: soft bump with a relevant case study",
    ],
    followUpLogic:
      "Pause follow-ups if they booked a call or opted out; accelerate if budget confirmed.",
    recommendedIcons: ["pen-tool", "layout", "sparkles", "briefcase", "phone", "image"],
    illustrationStyle: "Editorial craft · bold shapes · portfolio-grade polish",
    animations: ["subtle hover lift on cards", "smooth panel open"],
    mobileNotes: "Thumb-friendly quote CTA · stacked portfolio cards",
    desktopNotes: "Side-by-side portfolio + chat · richer package comparison",
    darkModeNotes: "Ink blacks · neon accent sparingly · preserve brand primary",
    accessibilityRules: a11y,
    automationRules: [
      { id: "quote-nurture", name: "Quote nurture", trigger: "quote started not submitted", action: "Remind with 1-click resume link" },
      { id: "after-hours", name: "After hours", trigger: "outside studio hours", action: "Collect brief + promise next-business-day reply" },
    ],
    displayRules: [
      { id: "marketing-pages", name: "Service pages", condition: "Show on services, pricing, and contact; softer on blog" },
    ],
    triggerRules: ["Delay 3s on service pages", "Exit intent on pricing with quote CTA"],
    exitIntentRules: ["Offer mini-brief form", "Show limited consult slots this week"],
    analyticsEvents: [
      { id: "preset_applied", name: "Preset applied", when: "industry preset customized" },
      { id: "quote_start", name: "Quote started", when: "visitor begins quote flow" },
      { id: "call_booked", name: "Call booked", when: "discovery call scheduled" },
    ],
    ...extra,
  });
}

export const CREATIVE_PRESETS: CepIndustryPreset[] = [
  creativeBase(
    {
      primary: "#6d28d9",
      primaryEnd: "#a78bfa",
      header: "#5b21b6",
      background: "#faf5ff",
      text: "#2e1065",
      accent: "#f59e0b",
      success: "#16a34a",
      warning: "#ca8a04",
      surface: "#ffffff",
      darkBackground: "#2e1065",
      darkText: "#f3e8ff",
      darkHeader: "#5b21b6",
    },
    {
      id: "logo-design",
      industryName: "Logo Design Agency",
      catalogBlurb: "Logo-first studio funnel with brief capture and package tiers.",
      designPersonality: "Craft-obsessed · iconic · mark-maker energy",
      assistantName: "Alex",
      assistantRole: "Your Logo Design Assistant",
      greeting:
        "Hi! Need a new logo or a redesign? Pick an option below and I’ll guide you.",
      matchKeywords: ["logo design", "logo designer", "brand mark", "logotype", "wordmark"],
      primaryCta: { label: "I need a New Logo", action: "brief" },
      secondaryCta: { label: "See Our Portfolio", action: "portfolio" },
      bubbleCta: "Hi! Need a logo?",
      footer: "Concepts are custom — no clip-art logos.",
      salesConversationFlow:
        "Brand stage → industry → style prefs → package → brief → deposit/call.",
      aiPrompt:
        "You represent a logo design studio. Qualify projects, share process, capture briefs. Do not invent fake portfolio claims.",
      businessGoal: "Increase qualified logo project briefs",
      conversionGoal: "Submitted logo brief or booked discovery call",
      quickActions: qa([
        ["new", "I need a New Logo", "pen-tool", "send_text", "I need a new logo"],
        ["redesign", "Redesign My Logo", "sparkles", "send_text", "I want to redesign my logo"],
        ["pricing", "View Pricing", "layers"],
        ["portfolio", "See Our Portfolio", "image"],
        ["branding", "Branding Package", "briefcase", "send_text", "Tell me about branding packages"],
        ["human", "Talk to a Designer", "headphones", "transfer_agent"],
      ]),
    },
  ),
  creativeBase(
    {
      primary: "#be123c",
      primaryEnd: "#fb7185",
      header: "#9f1239",
      background: "#fff1f2",
      text: "#4c0519",
      accent: "#0f766e",
      success: "#15803d",
      warning: "#d97706",
      surface: "#ffffff",
      darkBackground: "#4c0519",
      darkText: "#ffe4e6",
      darkHeader: "#881337",
    },
    {
      id: "branding-agency",
      industryName: "Branding Agency",
      catalogBlurb: "Full identity systems — strategy, voice, and visual language.",
      designPersonality: "Strategic · premium · systems thinking",
      assistantName: "Brand Strategist Bot",
      assistantRole: "Brand identity consultant",
      greeting:
        "Building or refreshing a brand? I can walk you through identity packages and book a strategy session.",
      matchKeywords: ["brand identity", "branding agency", "brand strategy", "visual identity", "rebrand"],
      primaryCta: { label: "Book strategy session", action: "call" },
      secondaryCta: { label: "Identity packages", action: "pricing" },
      bubbleCta: "Build your brand",
      footer: "Strategy-led branding · custom proposals for complex rebrands",
      salesConversationFlow:
        "Startup vs rebrand → stakeholders → timeline → package or custom proposal.",
      aiPrompt:
        "Help a branding agency qualify identity projects and book strategy calls. Emphasize systems, not just logos.",
      businessGoal: "Win multi-deliverable identity retainers",
      conversionGoal: "Strategy session booked",
    },
  ),
  creativeBase(
    {
      primary: "#1e3a8a",
      primaryEnd: "#3b82f6",
      header: "#1e3a8a",
      background: "#eff6ff",
      text: "#1e3a8a",
      accent: "#f59e0b",
      success: "#059669",
      warning: "#d97706",
      surface: "#ffffff",
      darkBackground: "#172554",
      darkText: "#dbeafe",
      darkHeader: "#1e3a8a",
    },
    {
      id: "business-card-design",
      industryName: "Business Card Design",
      catalogBlurb: "Fast card design + print-ready files with upsell to brand kits.",
      designPersonality: "Crisp · tactile · print-aware",
      assistantName: "Card Studio",
      assistantRole: "Business card design assistant",
      greeting:
        "Need business cards that feel premium in-hand? I can help with design packages and print-ready delivery.",
      matchKeywords: ["business card", "visiting card", "print design card", "name card"],
      primaryCta: { label: "Order card design", action: "quote" },
      secondaryCta: { label: "See templates / styles", action: "portfolio" },
      bubbleCta: "Design cards",
      footer: "Print-ready CMYK files · optional print partner referrals",
      salesConversationFlow:
        "Quantity/finish → style → package → upsell letterhead/brand kit.",
      aiPrompt:
        "Assist with business card design orders, finishes, and file delivery FAQs. Upsell brand kits when relevant.",
      businessGoal: "High-volume card projects with brand-kit upsells",
      conversionGoal: "Paid card design order or quote",
    },
  ),
  creativeBase(
    {
      primary: "#7c3aed",
      primaryEnd: "#c084fc",
      header: "#6d28d9",
      background: "#faf5ff",
      text: "#3b0764",
      accent: "#f97316",
      success: "#16a34a",
      warning: "#ca8a04",
      surface: "#ffffff",
      darkBackground: "#2e1065",
      darkText: "#f3e8ff",
      darkHeader: "#5b21b6",
    },
    {
      id: "graphic-design-studio",
      industryName: "Graphic Design Studio",
      catalogBlurb: "Multi-format design studio for campaigns, social, and print.",
      designPersonality: "Versatile · visual · campaign-ready",
      assistantName: "Studio Desk",
      assistantRole: "Graphic design project coordinator",
      greeting:
        "From social kits to print campaigns — tell me what you need designed and I’ll route you to the right package.",
      matchKeywords: ["graphic design", "design studio", "flyer", "social media graphics", "creative studio"],
      primaryCta: { label: "Start a design brief", action: "brief" },
      secondaryCta: { label: "View studio work", action: "portfolio" },
      bubbleCta: "Need design?",
      footer: "Custom creative · licensed assets only",
      salesConversationFlow:
        "Asset type → volume → deadline → package → brief.",
      aiPrompt:
        "Coordinate graphic design inquiries across social, print, and campaign assets. Capture scope cleanly.",
      businessGoal: "Increase multi-asset project volume",
      conversionGoal: "Brief submitted or call booked",
    },
  ),
  creativeBase(
    {
      primary: "#0f766e",
      primaryEnd: "#2dd4bf",
      header: "#115e59",
      background: "#f0fdfa",
      text: "#134e4a",
      accent: "#f43f5e",
      success: "#16a34a",
      warning: "#d97706",
      surface: "#ffffff",
      darkBackground: "#042f2e",
      darkText: "#ccfbf1",
      darkHeader: "#115e59",
    },
    {
      id: "website-design",
      industryName: "Website Design Agency",
      catalogBlurb: "Website UX/UI design funnel with sitemap and build handoff options.",
      designPersonality: "Product-polished · conversion-literate · modern web",
      assistantName: "Web Desk",
      assistantRole: "Website design consultant",
      greeting:
        "Planning a new site or redesign? I can help scope pages, timeline, and design packages.",
      matchKeywords: ["website design", "web design", "ui ux", "redesign website", "landing page design"],
      primaryCta: { label: "Scope my website", action: "brief" },
      secondaryCta: { label: "See site designs", action: "portfolio" },
      bubbleCta: "Design my site",
      footer: "Design systems ready for Webflow, WordPress, or custom build partners",
      salesConversationFlow:
        "New vs redesign → pages/features → CMS preference → package → discovery.",
      aiPrompt:
        "Help a website design agency qualify web projects and book discovery calls. Ask about goals, pages, and integrations.",
      businessGoal: "Win website design retainers and redesigns",
      conversionGoal: "Discovery call or detailed brief",
    },
  ),
  creativeBase(
    {
      primary: "#1d4ed8",
      primaryEnd: "#60a5fa",
      header: "#1e40af",
      background: "#eff6ff",
      text: "#1e3a8a",
      accent: "#f59e0b",
      success: "#059669",
      warning: "#d97706",
      surface: "#ffffff",
      darkBackground: "#172554",
      darkText: "#dbeafe",
      darkHeader: "#1e3a8a",
    },
    {
      id: "wordpress-agency",
      industryName: "WordPress Agency",
      catalogBlurb: "WordPress build, care plans, and migration support.",
      designPersonality: "Practical · CMS-fluent · performance-minded",
      assistantName: "WP Concierge",
      assistantRole: "WordPress agency assistant",
      greeting:
        "Need a WordPress site, redesign, or care plan? I can help with packages, timelines, and support options.",
      matchKeywords: ["wordpress", "woocommerce", "wp agency", "elementor", "wordpress maintenance"],
      primaryCta: { label: "Get a WP quote", action: "quote" },
      secondaryCta: { label: "Care plans", action: "care" },
      bubbleCta: "WordPress help",
      footer: "Managed WordPress · security & updates available",
      salesConversationFlow:
        "Build vs care vs migration → plugins/features → hosting → quote.",
      aiPrompt:
        "Represent a WordPress agency. Qualify builds, WooCommerce, migrations, and retainers. Capture technical requirements.",
      businessGoal: "Grow WP builds and monthly care retainers",
      conversionGoal: "Quote request or care plan signup interest",
    },
  ),
  creativeBase(
    {
      primary: "#047857",
      primaryEnd: "#34d399",
      header: "#065f46",
      background: "#ecfdf5",
      text: "#064e3b",
      accent: "#2563eb",
      success: "#16a34a",
      warning: "#d97706",
      surface: "#ffffff",
      darkBackground: "#022c22",
      darkText: "#d1fae5",
      darkHeader: "#065f46",
    },
    {
      id: "seo-local-seo",
      industryName: "SEO & Local SEO Agency",
      catalogBlurb: "Local pack + organic growth with audit-led sales motion.",
      designPersonality: "Data-backed · local-dominant · ROI-spoken",
      assistantName: "SEO Scout",
      assistantRole: "SEO and local search advisor",
      greeting:
        "Want more map-pack and organic leads? I can outline SEO options and book a free visibility audit.",
      matchKeywords: ["seo", "local seo", "google maps", "search ranking", "organic traffic"],
      primaryCta: { label: "Free SEO audit", action: "audit" },
      secondaryCta: { label: "Local SEO packages", action: "pricing" },
      bubbleCta: "Rank higher",
      footer: "SEO takes time — we set expectations honestly",
      salesConversationFlow:
        "Local vs national → competitors → current site → audit → retainer proposal.",
      aiPrompt:
        "Help an SEO agency book audits and explain local vs organic services. No fake ranking guarantees.",
      businessGoal: "Book SEO audits that convert to retainers",
      conversionGoal: "Audit booked or form submitted",
    },
  ),
  creativeBase(
    {
      primary: "#c2410c",
      primaryEnd: "#fb923c",
      header: "#9a3412",
      background: "#fff7ed",
      text: "#7c2d12",
      accent: "#2563eb",
      success: "#16a34a",
      warning: "#ca8a04",
      surface: "#ffffff",
      darkBackground: "#431407",
      darkText: "#ffedd5",
      darkHeader: "#9a3412",
    },
    {
      id: "gbp-management",
      industryName: "Google Business Profile Management",
      catalogBlurb: "GBP optimization, posts, reviews, and local presence management.",
      designPersonality: "Local-first · review-driven · Maps fluent",
      assistantName: "Maps Manager",
      assistantRole: "Google Business Profile specialist",
      greeting:
        "Is your Google Business Profile winning the map pack? I can help with management plans and a free profile check.",
      matchKeywords: ["google business profile", "google my business", "gmb", "gbp", "maps listing", "reviews"],
      primaryCta: { label: "Free GBP check", action: "audit" },
      secondaryCta: { label: "Management plans", action: "pricing" },
      bubbleCta: "Fix my GBP",
      footer: "We optimize listings — Google controls ranking algorithms",
      salesConversationFlow:
        "Locations count → review health → posts/Q&A → plan → onboarding.",
      aiPrompt:
        "Help a GBP management agency qualify multi-location clients and book profile audits. Focus on reviews, categories, photos, posts.",
      businessGoal: "Sell monthly GBP management seats",
      conversionGoal: "GBP audit or plan inquiry",
    },
  ),
  creativeBase(
    {
      primary: "#db2777",
      primaryEnd: "#f472b6",
      header: "#9d174d",
      background: "#fdf2f8",
      text: "#831843",
      accent: "#4f46e5",
      success: "#059669",
      warning: "#d97706",
      surface: "#ffffff",
      darkBackground: "#500724",
      darkText: "#fce7f3",
      darkHeader: "#9d174d",
    },
    {
      id: "digital-marketing",
      industryName: "Digital Marketing Agency",
      catalogBlurb: "Full-funnel ads, content, and growth retainers.",
      designPersonality: "Growth-obsessed · multi-channel · KPI clear",
      assistantName: "Growth Desk",
      assistantRole: "Digital marketing strategist assistant",
      greeting:
        "Looking for leads, not vanity metrics? I can map channels and book a growth strategy call.",
      matchKeywords: [
        "digital marketing",
        "ppc",
        "facebook ads",
        "google ads",
        "marketing agency",
        "lead generation",
      ],
      primaryCta: { label: "Book growth call", action: "call" },
      secondaryCta: { label: "Channel packages", action: "pricing" },
      bubbleCta: "Grow leads",
      footer: "Performance marketing with transparent reporting",
      salesConversationFlow:
        "Goal → channels tried → monthly budget → offer audit/call → proposal.",
      aiPrompt:
        "Qualify digital marketing retainers across ads, content, and lifecycle. Ask budget and goals. No guaranteed ROAS claims.",
      businessGoal: "Close multi-channel marketing retainers",
      conversionGoal: "Strategy call booked",
    },
  ),
];
