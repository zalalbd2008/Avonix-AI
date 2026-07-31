import type {
  PopupCategory,
  PopupLayout,
  PopupPageTarget,
  PopupPayload,
  PopupPriority,
  PopupType,
} from "@/lib/db/schema";

export const POPUP_EDITOR_TABS = [
  { id: "general", label: "General" },
  { id: "content", label: "Content" },
  { id: "design", label: "Design" },
  { id: "components", label: "Components" },
  { id: "animation", label: "Animation" },
  { id: "triggers", label: "Triggers" },
  { id: "conditions", label: "Conditions" },
  { id: "behavior", label: "Behavior" },
  { id: "targeting", label: "Targeting" },
  { id: "frequency", label: "Frequency" },
  { id: "automation", label: "Automation" },
  { id: "analytics", label: "Analytics" },
  { id: "advanced", label: "Advanced" },
] as const;

export type PopupEditorTab = (typeof POPUP_EDITOR_TABS)[number]["id"];

export const POPUP_CLOSE_ICONS: {
  id: NonNullable<import("@/lib/db/schema").PopupTheme["closeIcon"]>;
  label: string;
  glyph: string;
}[] = [
  { id: "x", label: "× classic", glyph: "×" },
  { id: "x_bold", label: "✕ bold", glyph: "✕" },
  { id: "plus", label: "+ plus", glyph: "+" },
  { id: "circle_x", label: "⊗ circled", glyph: "⊗" },
];

export const POPUP_CLOSE_ANIMATIONS: {
  id: NonNullable<import("@/lib/db/schema").PopupTheme["closeAnimation"]>;
  label: string;
}[] = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade in" },
  { id: "pulse", label: "Pulse" },
  { id: "bounce", label: "Bounce" },
  { id: "spin", label: "Spin" },
];

export const POPUP_CLOSE_HOVER_ANIMATIONS: {
  id: NonNullable<import("@/lib/db/schema").PopupTheme["closeHoverAnimation"]>;
  label: string;
}[] = [
  { id: "none", label: "None" },
  { id: "scale", label: "Scale up" },
  { id: "rotate", label: "Rotate" },
  { id: "spin", label: "Spin" },
  { id: "pulse", label: "Pulse" },
];

export function popupCloseGlyph(
  icon?: import("@/lib/db/schema").PopupTheme["closeIcon"],
): string {
  return POPUP_CLOSE_ICONS.find((i) => i.id === icon)?.glyph ?? "×";
}


export const POPUP_CATEGORIES: { value: PopupCategory; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "offer", label: "Offer" },
  { value: "welcome", label: "Welcome" },
  { value: "coupon", label: "Coupon" },
  { value: "survey", label: "Survey" },
  { value: "newsletter", label: "Newsletter" },
  { value: "appointment", label: "Appointment" },
  { value: "exit", label: "Exit" },
  { value: "announcement", label: "Announcement" },
  { value: "custom", label: "Custom" },
];

export const POPUP_LAYOUTS: { value: PopupLayout; label: string }[] = [
  { value: "center_modal", label: "Modal" },
  { value: "floating_box", label: "Floating Box" },
  { value: "slide_left", label: "Slide Left" },
  { value: "slide_right", label: "Slide Right" },
  { value: "bottom_bar", label: "Bottom Bar" },
  { value: "top_bar", label: "Top Bar" },
  { value: "drawer", label: "Drawer" },
  { value: "fullscreen", label: "Fullscreen" },
  { value: "full_overlay", label: "Full Overlay" },
  { value: "floating_bubble", label: "Floating Bubble" },
  { value: "sticky_card", label: "Sticky Card" },
  { value: "floating_card", label: "Floating Card" },
  { value: "slide_in", label: "Slide In" },
];

export const POPUP_TYPES: {
  value: PopupType;
  label: string;
  hint: string;
  category: PopupCategory;
}[] = [
  { value: "welcome", label: "Welcome", hint: "First visit · brand intro", category: "welcome" },
  { value: "exit_intent", label: "Exit Intent", hint: "Desktop edge · mobile back", category: "exit" },
  { value: "scroll", label: "Scroll", hint: "25% · 50% · 75% · 90%", category: "lead" },
  { value: "time_delay", label: "Time Delay", hint: "5s · 10s · 20s · 60s", category: "lead" },
  { value: "inactivity", label: "Inactivity", hint: "No move · click · scroll", category: "lead" },
  { value: "lead_capture", label: "Lead Capture", hint: "Embed Form Builder form", category: "lead" },
  { value: "appointment", label: "Appointment", hint: "Book · calendar", category: "appointment" },
  { value: "coupon", label: "Coupon", hint: "Discount · code · expiry", category: "coupon" },
  { value: "newsletter", label: "Newsletter", hint: "Email capture form", category: "newsletter" },
  { value: "chat", label: "Chat", hint: "Need help? · start chat", category: "lead" },
  { value: "survey", label: "Survey", hint: "NPS · emoji · feedback", category: "survey" },
  { value: "multi_step", label: "Multi Step", hint: "Questions → form → submit", category: "lead" },
  { value: "custom", label: "Custom", hint: "Blank experience", category: "custom" },
];

export const POPUP_PRIORITIES: {
  value: PopupPriority;
  label: string;
  rank: number;
}[] = [
  { value: "emergency", label: "Emergency", rank: 5 },
  { value: "critical", label: "Critical", rank: 15 },
  { value: "campaign", label: "Campaign", rank: 30 },
  { value: "lead_generation", label: "Lead", rank: 50 },
  { value: "newsletter", label: "Newsletter", rank: 70 },
  { value: "announcement", label: "Announcement", rank: 80 },
  { value: "welcome", label: "Welcome", rank: 90 },
];

export const POPUP_COMPONENT_KINDS: { value: string; label: string }[] = [
  { value: "columns", label: "Columns" },
  { value: "headline", label: "Headline" },
  { value: "paragraph", label: "Paragraph" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "divider", label: "Divider" },
  { value: "spacer", label: "Spacer" },
  { value: "countdown", label: "Countdown" },
  { value: "progress", label: "Progress" },
  { value: "stars", label: "Stars / Rating" },
  { value: "testimonials", label: "Testimonials" },
  { value: "faq", label: "FAQ" },
  { value: "coupon", label: "Coupon" },
  { value: "qr", label: "QR Code" },
  { value: "badge", label: "Badge" },
  { value: "social_proof", label: "Social Proof" },
  { value: "live_visitors", label: "Live Visitor Count" },
  { value: "trust_badges", label: "Trust Badges" },
  { value: "custom_html", label: "Custom HTML" },
];

export const DEFAULT_POPUP_EXCLUDE_PATHS = [
  "/privacy",
  "/terms",
  "/cookie",
  "/login",
  "/register",
  "/wp-login",
  "/wp-admin",
  "/cart",
  "/checkout",
  "/my-account",
  "/account",
  "/feed",
  "/sitemap",
];

export function slugifyPopupName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "popup";
}

export function summarizePageTarget(target: PopupPageTarget): string {
  if (!target || target.mode === "everywhere") {
    const ex = target?.excludePaths?.length
      ? ` · exclude ${target.excludePaths.length}`
      : "";
    return `All pages${ex}`;
  }
  const parts: string[] = [];
  if (target.surfaces?.length) parts.push(target.surfaces.join(", "));
  if (target.rules?.length) {
    parts.push(target.rules.map((r) => `${r.op} ${r.value}`).join(" · "));
  }
  const body = parts.length ? parts.join(" · ") : "no rules";
  return target.mode === "include" ? `Only: ${body}` : `Except: ${body}`;
}

/** Purple gradient header + lavender CTA — matches campaign reference mock. */
export function applyCampaignHeaderLook(payload: PopupPayload): PopupPayload {
  return {
    ...payload,
    design: {
      ...payload.design,
      layout: "center_modal",
      padding: 0,
      radius: 18,
      maxWidth: 550,
      shadow: true,
      grid: {
        ...payload.design.grid,
        mode: "header_band",
        align: payload.design.grid?.align ?? "left",
        gap: payload.design.grid?.gap ?? 12,
        stackOnMobile: true,
      },
        theme: {
          ...payload.design.theme,
          backgroundColor: "#ffffff",
          headerBackgroundColor: "#1e1b4b",
          textColor: "#0f172a",
          splitTopColor: "#1e1b4b",
          splitBottomColor: "#7c3aed",
          buttonBackground: "#a5b4fc",
          buttonTextColor: "#ffffff",
          buttonRadius: 6,
          closeBackground: "#ef4444",
          closeColor: "#ffffff",
        },
    },
    content: {
      ...payload.content,
      scarcityText: payload.content.scarcityText || "LIMITED TIME",
      headline: payload.content.headline || "New Campaign Heading",
      description: payload.content.description || "Sub-text here",
      headlineStyle: {
        fontSize: 26,
        fontWeight: 700,
        align: "left",
        lineHeight: 1.2,
        ...payload.content.headlineStyle,
        color: payload.content.headlineStyle?.color ?? "#0f172a",
      },
      descriptionStyle: {
        fontSize: 14,
        fontWeight: 400,
        align: "left",
        ...payload.content.descriptionStyle,
        color: payload.content.descriptionStyle?.color ?? "#ffffff",
      },
      replaceFormButtons: true,
      primaryCta: {
        ...(payload.content.primaryCta ?? {}),
        label: payload.content.primaryCta?.label || "Submit",
        action: payload.content.primaryCta?.action ?? "submit_form",
      },
    },
  };
}

export function defaultPopupPayload(type: PopupType = "welcome"): PopupPayload {
  const meta = POPUP_TYPES.find((t) => t.value === type);
  const category = meta?.category ?? "custom";
  const priority: PopupPriority =
    type === "welcome"
      ? "welcome"
      : type === "newsletter"
        ? "newsletter"
        : type === "coupon" || type === "exit_intent"
          ? "campaign"
          : type === "survey"
            ? "announcement"
            : "lead_generation";

  const rank =
    POPUP_PRIORITIES.find((p) => p.value === priority)?.rank ?? 100;

  const base: PopupPayload = {
    slug: slugifyPopupName(meta?.label ?? "popup"),
    category,
    type,
    priority,
    priorityRank: rank,
    triggers: {},
    audience: {
      pageTarget: {
        mode: "everywhere",
        excludePaths: [...DEFAULT_POPUP_EXCLUDE_PATHS],
      },
    },
    frequency: { mode: "once", maxPerDay: 1, maxPerSession: 1 },
    conflicts: {
      suppressIfChatOpen: true,
      suppressIfFormOpen: true,
      waitIfVideoPlaying: true,
      delayIfTypingMs: 2000,
      ifOtherActive: "skip",
    },
    design: {
      layout: "center_modal",
      size: "md",
      animation: "fade",
      closeAnimation: "fade",
      animationDurationMs: 280,
      overlay: "dark",
      overlayOpacity: 0.55,
      radius: 16,
      shadow: true,
      maxWidth: 550,
      padding: 24,
      grid: { mode: "stack", align: "left", gap: 12, stackOnMobile: true },
      theme: {
        backgroundColor: "#ffffff",
        buttonBackground: "#ff6600",
        buttonTextColor: "#ffffff",
        buttonRadius: 10,
      },
    },
    content: {
      headline: "Welcome",
      description: "Tell visitors why you’re here.",
      formStyleMode: "inherit",
      primaryCta: { label: "Get started", action: "close_popup" },
    },
    buttons: [
      {
        id: "primary",
        label: "Get started",
        variant: "primary",
        action: "close_popup",
      },
    ],
    components: [],
    behavior: { onSubmit: ["close", "success_message"], successMessage: "Thanks!" },
    schedule: {},
    automation: {},
    close: {
      showCloseButton: true,
      esc: true,
      clickOutside: true,
      neverClose: false,
    },
    devices: ["desktop", "tablet", "mobile"],
  };

  switch (type) {
    case "welcome":
      base.triggers = { onLoad: true, delayMs: [1500] };
      base.content = {
        ...base.content,
        headline: "Welcome aboard",
        description: "Brand introduction and first-visit offer.",
      };
      break;
    case "exit_intent":
      base.category = "exit";
      base.triggers = {
        exitIntent: { desktop: true, mobileBack: true, closeTab: false },
      };
      base.content = {
        ...base.content,
        headline: "Wait — before you go",
        description: "Last-chance offer for exiting visitors.",
        primaryCta: { label: "Claim offer", action: "claim_offer" },
      };
      break;
    case "scroll":
      base.triggers = { scrollPercent: [50] };
      base.content.headline = "Still exploring?";
      break;
    case "time_delay":
      base.triggers = { delayMs: [10000] };
      break;
    case "inactivity":
      base.triggers = {
        inactivityMs: [30000],
        inactivityKinds: ["movement", "click", "scroll"],
      };
      break;
    case "lead_capture":
      base.category = "lead";
      base.design = {
        ...base.design,
        padding: 0,
        radius: 18,
        maxWidth: 550,
        grid: {
          mode: "header_band",
          align: "left",
          gap: 12,
          stackOnMobile: true,
        },
        theme: {
          backgroundColor: "#ffffff",
          headerBackgroundColor: "#1e1b4b",
          textColor: "#0f172a",
          splitTopColor: "#1e1b4b",
          splitBottomColor: "#7c3aed",
          buttonBackground: "#a5b4fc",
          buttonTextColor: "#ffffff",
          buttonRadius: 6,
          closeBackground: "#ef4444",
          closeColor: "#ffffff",
        },
      };
      base.content = {
        ...base.content,
        scarcityText: "LIMITED TIME",
        headline: "New Campaign Heading",
        description: "Sub-text here",
        headlineStyle: {
          fontSize: 26,
          fontWeight: 700,
          color: "#0f172a",
          align: "left",
          lineHeight: 1.2,
        },
        descriptionStyle: {
          fontSize: 14,
          fontWeight: 400,
          color: "#ffffff",
          align: "left",
        },
        formId: undefined,
        replaceFormButtons: true,
        primaryCta: { label: "Submit", action: "submit_form" },
      };
      base.buttons = [
        {
          id: "primary",
          label: "Submit",
          variant: "primary",
          action: "submit_form",
        },
      ];
      base.triggers = { onLoad: true, delayMs: [800] };
      break;
    case "newsletter":
    case "appointment":
    case "survey":
    case "multi_step":
      base.content = {
        ...base.content,
        headline:
          type === "newsletter"
            ? "Get updates"
            : type === "appointment"
              ? "Book an appointment"
              : type === "survey"
                ? "How are we doing?"
                : "Get in touch",
        description: "Select an existing form from Form Builder below.",
        formId: undefined,
        primaryCta: { label: "Continue", action: "submit_form" },
      };
      if (type === "newsletter") {
        base.triggers = { scrollPercent: [70], delayMs: [90000] };
      }
      break;
    case "coupon":
      base.content = {
        ...base.content,
        headline: "Special discount",
        discountLabel: "15% OFF",
        couponCode: "SAVE15",
        primaryCta: { label: "Copy code", action: "copy_coupon" },
      };
      break;
    case "chat":
      base.content = {
        ...base.content,
        headline: "Need help?",
        description: "Chat with our team.",
        primaryCta: { label: "Start chat", action: "live_chat" },
      };
      break;
    default:
      break;
  }

  return base;
}
