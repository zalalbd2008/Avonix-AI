import { definePreset, flow, qa } from "./build";
import type { CepIndustryPreset, ColorPalette } from "./types";

const a11y = [
  "WCAG 2.2 AA contrast on text and CTAs",
  "Keyboard-reachable quick actions",
  "Screen-reader labels on bubble and header",
  "Respect prefers-reduced-motion",
  "Focus ring visible on all interactive controls",
];

function healthBase(colors: ColorPalette, extra: Partial<Parameters<typeof definePreset>[0]> & {
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
}): CepIndustryPreset {
  return definePreset({
    family: "healthcare",
    colors,
    headerDesign: "Clinical trust bar · soft medical accent line · live status pill",
    avatarStyle: "Calm professional clinician silhouette with soft medical badge",
    quickActions: qa([
      ["symptoms", "Symptom guide", "stethoscope"],
      ["wait", "Wait times", "clock"],
      ["directions", "Directions", "map-pin"],
      ["insurance", "Insurance", "shield"],
      ["book", "Book visit", "calendar", "send_text", "I'd like to book a visit"],
      ["call", "Call now", "phone", "transfer_agent"],
      ["records", "Patient portal", "file-text"],
      ["emergency", "Is this an emergency?", "alert"],
    ]),
    suggestedQuestions: [
      "Do you take my insurance?",
      "What are today's wait times?",
      "How do I prepare for my visit?",
      "Can I book an appointment online?",
    ],
    leadCaptureStrategy:
      "Capture name + phone + reason for visit early; offer callback if queues are long.",
    conversationFlow: flow([
      ["greet", "Greet", "Welcome the visitor; ask how you can help today."],
      ["triage", "Triage", "Clarify urgency vs routine care without giving a diagnosis."],
      ["route", "Route", "Route to booking, directions, insurance, or human nurse line."],
      ["capture", "Capture", "Collect contact details before handoff when appropriate."],
    ]),
    appointmentFlow: flow([
      ["need", "Need", "Confirm visit type (new patient / follow-up / urgent)."],
      ["when", "Timing", "Offer soonest slots or callback window."],
      ["details", "Details", "Collect name, phone, preferred time, insurance if known."],
      ["confirm", "Confirm", "Confirm next step and what to bring."],
    ]),
    quoteFlow: flow([
      ["service", "Service", "Clarify the service or test they need pricing for."],
      ["coverage", "Coverage", "Ask about insurance vs self-pay."],
      ["estimate", "Estimate", "Share typical ranges; escalate for exact quotes."],
    ]),
    portfolioFlow: flow([
      ["proof", "Proof", "Share credentials, accreditations, and care quality highlights."],
    ]),
    pricingFlow: flow([
      ["selfpay", "Self-pay", "Explain self-pay options and financial counseling if available."],
      ["insure", "Insurance", "List accepted plans at a high level; verify with staff."],
    ]),
    faqFlow: flow([
      ["hours", "Hours", "Answer hours and holiday schedules."],
      ["parking", "Parking", "Share parking / entrance instructions."],
      ["prep", "Prep", "Share visit preparation checklist."],
    ]),
    contactFlow: flow([
      ["channel", "Channel", "Offer call, callback, or secure message."],
      ["collect", "Collect", "Capture name + phone + best time."],
    ]),
    humanHandoffRules: [
      "Chest pain, stroke signs, severe bleeding, or breathing trouble → urge 911 / ER immediately",
      "Medication questions requiring clinical judgment → nurse / clinician handoff",
      "Billing disputes after 2 bot turns → human agent",
    ],
    trustBadges: ["HIPAA-aware messaging", "Licensed clinicians on staff", "Accredited facility"],
    trustIndicators: ["Verified hours", "Insurance accepted list", "Patient reviews"],
    followUpSequence: [
      "T+15m: confirm they got directions / booking link",
      "T+24h: gentle check-in if no appointment booked",
      "T+72h: offer nurse callback for open questions",
    ],
    followUpLogic:
      "Only follow up if consent captured; suppress if emergency handoff already fired.",
    recommendedIcons: ["cross", "heart-pulse", "calendar", "phone", "map-pin", "shield"],
    illustrationStyle: "Clean medical line art · soft gradients · high trust, low noise",
    animations: ["gentle pulse on online status", "soft slide-in for quick actions"],
    mobileNotes: "Large tap targets · sticky Call / Directions · one-column quick actions",
    desktopNotes: "Two-column quick actions · richer FAQ cards beside transcript",
    darkModeNotes: "Deep navy surfaces · keep clinical red/teal accents for urgency cues",
    accessibilityRules: a11y,
    automationRules: [
      { id: "after-hours", name: "After hours", trigger: "outside working hours", action: "Show next open time + callback form" },
      { id: "er-redirect", name: "Emergency redirect", trigger: "visitor mentions chest pain/stroke", action: "Show emergency protocol + call 911 CTA" },
    ],
    displayRules: [
      { id: "all-pages", name: "Sitewide", condition: "everywhere except patient portal logout pages" },
    ],
    triggerRules: ["Open on first visit after 4s", "Re-open on exit intent for booking pages"],
    exitIntentRules: ["Offer callback if appointment not started", "Never block emergency CTAs"],
    analyticsEvents: [
      { id: "preset_applied", name: "Preset applied", when: "industry preset customized for site" },
      { id: "book_click", name: "Book CTA", when: "primary booking action clicked" },
      { id: "handoff", name: "Human handoff", when: "transfer to staff" },
    ],
    ...extra,
  });
}

export const HEALTHCARE_PRESETS: CepIndustryPreset[] = [
  healthBase(
    {
      primary: "#b91c1c",
      primaryEnd: "#dc2626",
      header: "#7f1d1d",
      background: "#fff7f7",
      text: "#1c1917",
      accent: "#f59e0b",
      success: "#15803d",
      warning: "#b45309",
      surface: "#ffffff",
      darkBackground: "#1c1917",
      darkText: "#fafaf9",
      darkHeader: "#450a0a",
    },
    {
      id: "emergency-room",
      industryName: "Emergency Room (ER)",
      catalogBlurb: "Triage-first ER experience with emergency protocols and wait guidance.",
      designPersonality: "Urgent · clear · life-critical prioritization",
      assistantName: "ER Navigator",
      assistantRole: "Emergency department digital triage guide",
      greeting:
        "If this is a medical emergency, call 911 now. I can help with wait times, directions to the ER, and what to expect.",
      matchKeywords: ["emergency room", "er", "trauma", "emergency department", "ed wait"],
      primaryCta: { label: "Get ER directions", action: "directions" },
      secondaryCta: { label: "Current wait time", action: "wait_times" },
      bubbleCta: "Need ER help?",
      footer: "For life-threatening emergencies call 911. This chat does not replace emergency care.",
      salesConversationFlow:
        "Prioritize safety over conversion. Guide to ER arrival logistics; never soft-sell.",
      aiPrompt:
        "You are an ER navigator. Never diagnose. Escalate emergencies to 911. Help with wait times, parking, entrance, and what to bring. Be calm and direct.",
      businessGoal: "Reduce confused arrivals and phone load while protecting patient safety",
      conversionGoal: "Qualified ER arrivals with correct entrance + prepared documents",
      quickActions: qa([
        ["911", "Call 911", "phone", "open_url", "tel:911"],
        ["wait", "ER wait time", "clock"],
        ["directions", "ER entrance", "map-pin"],
        ["trauma", "Trauma symptoms", "alert"],
        ["kids", "Pediatric ER", "heart"],
        ["insurance", "Insurance", "shield"],
        ["parking", "Parking", "car"],
        ["human", "Talk to nurse line", "headphones", "transfer_agent"],
      ]),
    },
  ),
  healthBase(
    {
      primary: "#0f766e",
      primaryEnd: "#14b8a6",
      header: "#115e59",
      background: "#f0fdfa",
      text: "#134e4a",
      accent: "#f97316",
      success: "#16a34a",
      warning: "#d97706",
      surface: "#ffffff",
      darkBackground: "#042f2e",
      darkText: "#ecfdf5",
      darkHeader: "#134e4a",
    },
    {
      id: "urgent-care",
      industryName: "Urgent Care Clinic",
      catalogBlurb: "Same-day care booking with symptom routing and insurance checks.",
      designPersonality: "Fast · friendly · clinic-ready",
      assistantName: "Care Concierge",
      assistantRole: "Urgent care intake assistant",
      greeting:
        "Hi — I can help you check if urgent care is right, see wait times, and save you a spot.",
      matchKeywords: ["urgent care", "walk-in clinic", "same-day care", "minor injury"],
      primaryCta: { label: "Save my spot", action: "book" },
      secondaryCta: { label: "Check symptoms", action: "symptoms" },
      bubbleCta: "Same-day care?",
      footer: "Not for emergencies — call 911 for life-threatening symptoms.",
      salesConversationFlow:
        "Qualify urgency → offer hold/book → capture insurance → confirm arrival window.",
      aiPrompt:
        "You help visitors decide between urgent care and ER, book same-day visits, and explain prep. Never diagnose. Escalate emergencies.",
      businessGoal: "Fill same-day capacity with the right acuity patients",
      conversionGoal: "Booked / held visit within the chat session",
    },
  ),
  healthBase(
    {
      primary: "#1d4ed8",
      primaryEnd: "#3b82f6",
      header: "#1e3a8a",
      background: "#f8fafc",
      text: "#0f172a",
      accent: "#0ea5e9",
      success: "#059669",
      warning: "#ca8a04",
      surface: "#ffffff",
      darkBackground: "#0f172a",
      darkText: "#f1f5f9",
      darkHeader: "#1e3a8a",
    },
    {
      id: "general-medical-clinic",
      industryName: "General Medical Clinic",
      catalogBlurb: "Primary-care style clinic with appointments, labs, and portal help.",
      designPersonality: "Warm clinical · organized · family-friendly",
      assistantName: "Clinic Assistant",
      assistantRole: "Medical clinic front-desk AI",
      greeting: "Welcome! I can help with appointments, clinic hours, insurance, and new-patient intake.",
      matchKeywords: ["medical clinic", "primary care", "family medicine", "outpatient clinic"],
      primaryCta: { label: "Book appointment", action: "book" },
      secondaryCta: { label: "New patient forms", action: "forms" },
      bubbleCta: "Book a visit",
      footer: "For emergencies call 911. Messages may be reviewed by clinic staff.",
      salesConversationFlow:
        "Understand need → schedule → collect demographics/insurance → confirm.",
      aiPrompt:
        "You are a medical clinic assistant. Help schedule visits, explain services, and capture leads. Do not diagnose or prescribe.",
      businessGoal: "Increase scheduled visits and reduce front-desk call volume",
      conversionGoal: "Completed appointment request",
    },
  ),
  healthBase(
    {
      primary: "#075985",
      primaryEnd: "#0284c7",
      header: "#0c4a6e",
      background: "#f0f9ff",
      text: "#0c4a6e",
      accent: "#6366f1",
      success: "#059669",
      warning: "#d97706",
      surface: "#ffffff",
      darkBackground: "#082f49",
      darkText: "#e0f2fe",
      darkHeader: "#0c4a6e",
    },
    {
      id: "hospital",
      industryName: "Hospital",
      catalogBlurb: "Multi-department hospital guide for visitors, patients, and families.",
      designPersonality: "Institutional trust · wayfinding · service directory",
      assistantName: "Hospital Guide",
      assistantRole: "Hospital visitor and patient navigator",
      greeting:
        "Welcome. I can help with departments, visiting hours, parking, billing, and finding the right care team.",
      matchKeywords: ["hospital", "medical center", "inpatient", "campus map", "visiting hours"],
      primaryCta: { label: "Find a doctor", action: "find_doctor" },
      secondaryCta: { label: "Visiting hours", action: "visiting" },
      bubbleCta: "Hospital help",
      footer: "Hospital information assistant · emergencies: call 911",
      salesConversationFlow:
        "Identify intent (patient/visitor/referrer) → route to department → capture follow-up.",
      aiPrompt:
        "You navigate a hospital campus: departments, visiting hours, parking, billing contacts. Escalate clinical questions to staff. Never diagnose.",
      businessGoal: "Improve wayfinding and reduce switchboard load",
      conversionGoal: "Doctor find / appointment / visitor info completion",
    },
  ),
  healthBase(
    {
      primary: "#4f46e5",
      primaryEnd: "#818cf8",
      header: "#3730a3",
      background: "#eef2ff",
      text: "#1e1b4b",
      accent: "#14b8a6",
      success: "#16a34a",
      warning: "#ca8a04",
      surface: "#ffffff",
      darkBackground: "#1e1b4b",
      darkText: "#e0e7ff",
      darkHeader: "#312e81",
    },
    {
      id: "family-doctor",
      industryName: "Family Doctor",
      catalogBlurb: "Personal family practice experience with continuity-of-care tone.",
      designPersonality: "Neighborly · trustworthy · longitudinal care",
      assistantName: "Practice Helper",
      assistantRole: "Family medicine office assistant",
      greeting:
        "Hi there — I can help schedule with your doctor, request refills guidance, or answer office questions.",
      matchKeywords: ["family doctor", "family practice", "gp", "physician office", "pcp"],
      primaryCta: { label: "Schedule visit", action: "book" },
      secondaryCta: { label: "Office hours", action: "hours" },
      bubbleCta: "Talk to the office",
      footer: "Not for emergencies. For urgent medical issues call 911 or go to the ER.",
      salesConversationFlow:
        "Recognize new vs returning patient → book → capture preferred provider.",
      aiPrompt:
        "Assist a family medicine practice with scheduling and office FAQs. No diagnosis or refill approvals — route clinical requests to staff.",
      businessGoal: "Keep the panel booked and reduce phone tag",
      conversionGoal: "Scheduled family practice appointment",
    },
  ),
  healthBase(
    {
      primary: "#0e7490",
      primaryEnd: "#06b6d4",
      header: "#155e75",
      background: "#ecfeff",
      text: "#164e63",
      accent: "#f472b6",
      success: "#059669",
      warning: "#d97706",
      surface: "#ffffff",
      darkBackground: "#083344",
      darkText: "#cffafe",
      darkHeader: "#155e75",
    },
    {
      id: "dental-clinic",
      industryName: "Dental Clinic",
      catalogBlurb: "Smile-focused dental intake with cleaning, implants interest, and insurance.",
      designPersonality: "Bright · reassuring · smile-forward",
      assistantName: "Smile Desk",
      assistantRole: "Dental clinic concierge",
      greeting:
        "Welcome! Looking for a cleaning, checkup, or cosmetic consult? I can help you book and answer common questions.",
      matchKeywords: ["dental", "dentist", "teeth cleaning", "dental clinic", "oral health"],
      primaryCta: { label: "Book dental visit", action: "book" },
      secondaryCta: { label: "Whitening / cosmetic", action: "cosmetic" },
      bubbleCta: "Book dentistry",
      footer: "Dental chat assistant · emergency dental pain? Call the office or ER if severe.",
      salesConversationFlow:
        "Need type → urgency → insurance → book consult or hygiene → offer financing FAQ.",
      aiPrompt:
        "You represent a dental clinic. Help book cleanings and consults, explain general services, capture leads. No clinical diagnosis.",
      businessGoal: "Fill hygiene and high-value consult chairs",
      conversionGoal: "Booked dental appointment or consult request",
      recommendedIcons: ["smile", "tooth", "calendar", "sparkles", "phone"],
    },
  ),
  healthBase(
    {
      primary: "#7c3aed",
      primaryEnd: "#a78bfa",
      header: "#5b21b6",
      background: "#f5f3ff",
      text: "#2e1065",
      accent: "#22d3ee",
      success: "#16a34a",
      warning: "#d97706",
      surface: "#ffffff",
      darkBackground: "#2e1065",
      darkText: "#ede9fe",
      darkHeader: "#4c1d95",
    },
    {
      id: "orthodontics",
      industryName: "Orthodontics",
      catalogBlurb: "Aligner/braces consult funnel with teen + adult pathways.",
      designPersonality: "Modern · aspirational · transformation-focused",
      assistantName: "Align Advisor",
      assistantRole: "Orthodontic consult specialist",
      greeting:
        "Curious about braces or clear aligners? I can help you start a free consult and estimate next steps.",
      matchKeywords: ["orthodont", "braces", "invisalign", "aligners", "smile correction"],
      primaryCta: { label: "Free smile consult", action: "consult" },
      secondaryCta: { label: "See before/after", action: "portfolio" },
      bubbleCta: "Straighten smile?",
      footer: "Results vary. Consult required for treatment recommendations.",
      salesConversationFlow:
        "Adult vs teen → braces vs aligners interest → consult booking → financing FAQ.",
      aiPrompt:
        "Help an orthodontic practice book consultations for braces/aligners. Be encouraging, never promise outcomes.",
      businessGoal: "Increase consult bookings for aligner/braces cases",
      conversionGoal: "Scheduled orthodontic consultation",
      portfolioFlow: flow([
        ["gallery", "Gallery", "Offer before/after examples by case type."],
        ["fit", "Fit", "Ask what bothers them about their smile."],
        ["book", "Book", "Convert to consult booking."],
      ]),
    },
  ),
  healthBase(
    {
      primary: "#0369a1",
      primaryEnd: "#38bdf8",
      header: "#0c4a6e",
      background: "#f0f9ff",
      text: "#0c4a6e",
      accent: "#84cc16",
      success: "#16a34a",
      warning: "#ca8a04",
      surface: "#ffffff",
      darkBackground: "#082f49",
      darkText: "#e0f2fe",
      darkHeader: "#0c4a6e",
    },
    {
      id: "eye-clinic",
      industryName: "Eye Clinic",
      catalogBlurb: "Vision care scheduling for exams, contacts, and specialty eye services.",
      designPersonality: "Crystal-clear · precise · vision-centric",
      assistantName: "Vision Desk",
      assistantRole: "Eye clinic scheduling assistant",
      greeting:
        "Hello! I can help schedule eye exams, contact lens fittings, or specialty evaluations.",
      matchKeywords: ["eye clinic", "optometr", "ophthalm", "vision", "contacts", "lasik"],
      primaryCta: { label: "Book eye exam", action: "book" },
      secondaryCta: { label: "LASIK / specialty", action: "specialty" },
      bubbleCta: "Book eye care",
      footer: "Sudden vision loss or eye trauma? Seek emergency care immediately.",
      salesConversationFlow:
        "Exam vs specialty → insurance/vision plan → book → remind about Rx/contacts.",
      aiPrompt:
        "Assist an eye clinic with exam bookings and service FAQs. Escalate acute vision emergencies.",
      businessGoal: "Increase comprehensive exam and specialty consult volume",
      conversionGoal: "Booked eye exam or specialty consult",
    },
  ),
  healthBase(
    {
      primary: "#334155",
      primaryEnd: "#64748b",
      header: "#1e293b",
      background: "#f8fafc",
      text: "#0f172a",
      accent: "#06b6d4",
      success: "#059669",
      warning: "#d97706",
      surface: "#ffffff",
      darkBackground: "#020617",
      darkText: "#e2e8f0",
      darkHeader: "#1e293b",
    },
    {
      id: "diagnostic-lab",
      industryName: "Diagnostic & Lab",
      catalogBlurb: "Lab testing guide with order requirements, locations, and results FAQs.",
      designPersonality: "Precise · procedural · compliance-minded",
      assistantName: "Lab Guide",
      assistantRole: "Diagnostics and laboratory navigator",
      greeting:
        "I can help you find test information, preparation instructions, locations, and how to get results.",
      matchKeywords: ["diagnostic", "laboratory", "lab test", "blood work", "imaging center", "mri", "ct scan"],
      primaryCta: { label: "Find a test / location", action: "find_test" },
      secondaryCta: { label: "Prep instructions", action: "prep" },
      bubbleCta: "Lab help",
      footer: "Results interpretation requires your ordering clinician.",
      salesConversationFlow:
        "Identify test → check order/referral need → location → prep → optional self-pay quote.",
      aiPrompt:
        "Help visitors with lab/imaging logistics and prep. Never interpret results clinically.",
      businessGoal: "Reduce no-shows and call volume for prep/logistics",
      conversionGoal: "Scheduled lab/imaging visit or quote request",
    },
  ),
  healthBase(
    {
      primary: "#15803d",
      primaryEnd: "#22c55e",
      header: "#14532d",
      background: "#f0fdf4",
      text: "#14532d",
      accent: "#ea580c",
      success: "#16a34a",
      warning: "#ca8a04",
      surface: "#ffffff",
      darkBackground: "#052e16",
      darkText: "#dcfce7",
      darkHeader: "#14532d",
    },
    {
      id: "physical-therapy",
      industryName: "Physical Therapy",
      catalogBlurb: "PT intake for injuries, sports rehab, and referral scheduling.",
      designPersonality: "Energetic recovery · coaching tone",
      assistantName: "Recovery Coach",
      assistantRole: "Physical therapy intake assistant",
      greeting:
        "Recovering from an injury or surgery? I can help you start PT and answer insurance questions.",
      matchKeywords: ["physical therapy", "physiotherapy", "rehab", "sports injury", "pt clinic"],
      primaryCta: { label: "Start PT evaluation", action: "book" },
      secondaryCta: { label: "Insurance & referrals", action: "insurance" },
      bubbleCta: "Start recovery",
      footer: "PT guidance is educational — your therapist designs your plan of care.",
      salesConversationFlow:
        "Injury/context → referral status → book eval → capture goals.",
      aiPrompt:
        "Help a PT clinic book evaluations and explain services. No personalized exercise prescriptions.",
      businessGoal: "Increase evaluation bookings and referral conversion",
      conversionGoal: "Scheduled PT initial evaluation",
    },
  ),
  healthBase(
    {
      primary: "#5b21b6",
      primaryEnd: "#8b5cf6",
      header: "#4c1d95",
      background: "#faf5ff",
      text: "#3b0764",
      accent: "#14b8a6",
      success: "#059669",
      warning: "#d97706",
      surface: "#ffffff",
      darkBackground: "#2e1065",
      darkText: "#f3e8ff",
      darkHeader: "#4c1d95",
    },
    {
      id: "mental-health",
      industryName: "Mental Health Clinic",
      catalogBlurb: "Compassionate behavioral health intake with crisis-safe routing.",
      designPersonality: "Calm · private · stigma-reducing",
      assistantName: "Care Companion",
      assistantRole: "Behavioral health intake guide",
      greeting:
        "You're in a private space here. I can help you explore services, insurance, and booking — and connect you to crisis resources if you need them now.",
      matchKeywords: ["mental health", "therapy", "counseling", "psychiatr", "behavioral health"],
      primaryCta: { label: "Request an appointment", action: "book" },
      secondaryCta: { label: "Crisis resources", action: "crisis" },
      bubbleCta: "Talk privately",
      footer: "If you are in crisis, call/text 988 (US) or local emergency services.",
      salesConversationFlow:
        "Safety first → service type → intake form → clinician match → booking.",
      humanHandoffRules: [
        "Active suicidal ideation → show crisis resources immediately + offer human",
        "Medication management questions → clinician handoff",
        "Insurance denials after 1 attempt → billing human",
      ],
      aiPrompt:
        "You support a mental health clinic with compassionate intake. Prioritize safety. Provide crisis resources. Never replace therapy. No diagnosis.",
      businessGoal: "Lower barrier to starting care while staying crisis-safe",
      conversionGoal: "Completed intake / appointment request",
      animations: ["very soft fade only", "no aggressive pulse"],
    },
  ),
];
