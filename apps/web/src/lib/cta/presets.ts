/**
 * Built-in CTA button presets (ADR-009).
 * One-click create → Custom Button Builder can override any field.
 */
import type { CtaAction, CtaActionType, CtaButtonPayload } from "@/lib/db/schema";

export type CtaPreset = {
  id: string;
  category: string;
  name: string;
  description?: string;
  payload: CtaButtonPayload;
};

function p(
  id: string,
  category: string,
  name: string,
  iconKey: string,
  actionType: CtaActionType,
  extra: Partial<Omit<CtaButtonPayload, "action">> & {
    action?: Partial<Omit<CtaAction, "type">>;
  } = {},
): CtaPreset {
  const { action: actionPatch, ...rest } = extra;
  return {
    id,
    category,
    name,
    payload: {
      label: name,
      iconKey,
      presetId: id,
      action: { type: actionType, ...actionPatch },
      style: { variant: "icon_text", size: "md", animation: "none" },
      ...rest,
    },
  };
}

export const CTA_PRESETS: CtaPreset[] = [
  // Communication
  p("call-now", "Communication", "Call Now", "phone", "phone"),
  p("call-back", "Communication", "Call Back", "callback", "phone"),
  p("whatsapp", "Communication", "WhatsApp", "whatsapp", "whatsapp"),
  p("whatsapp-business", "Communication", "WhatsApp Business", "whatsapp-business", "whatsapp"),
  p("ai-chat", "Communication", "AI Chat", "ai-chat", "ai_chat"),
  p("live-chat", "Communication", "Live Chat", "live-chat", "live_chat"),
  p("email", "Communication", "Email", "email", "email"),
  p("gmail", "Communication", "Gmail", "gmail", "email"),
  p("messenger", "Communication", "Messenger", "messenger", "messenger"),
  p("telegram", "Communication", "Telegram", "telegram", "telegram"),
  p("skype", "Communication", "Skype", "skype", "deep_link", {
    action: { url: "skype:" },
  }),
  p("viber", "Communication", "Viber", "viber", "deep_link", {
    action: { url: "viber://chat" },
  }),
  p("discord", "Communication", "Discord", "discord", "open_url"),
  p("line", "Communication", "LINE", "line", "deep_link"),
  p("wechat", "Communication", "WeChat", "wechat", "deep_link"),
  p("signal", "Communication", "Signal", "signal", "deep_link"),
  p("sms", "Communication", "SMS", "sms", "sms"),
  p("facetime", "Communication", "FaceTime", "facetime", "deep_link", {
    action: { url: "facetime:" },
  }),
  p("zoom", "Communication", "Zoom", "zoom", "open_url"),
  p("meet", "Communication", "Google Meet", "meet", "open_url"),
  p("teams", "Communication", "Microsoft Teams", "teams", "open_url"),
  // Appointment
  p("book-appointment", "Appointment", "Book Appointment", "calendar", "open_url"),
  p("schedule-meeting", "Appointment", "Schedule Meeting", "schedule", "open_url"),
  p("reserve-slot", "Appointment", "Reserve Slot", "reserve", "open_url"),
  p("doctor-appointment", "Appointment", "Doctor Appointment", "doctor", "open_url"),
  p("salon-booking", "Appointment", "Salon Booking", "salon", "open_url"),
  p("service-booking", "Appointment", "Service Booking", "car-service", "open_url"),
  p("hotel-reservation", "Appointment", "Hotel Reservation", "hotel", "open_url"),
  // Lead
  p("get-quote", "Lead", "Get Quote", "quote", "open_form"),
  p("free-estimate", "Lead", "Free Estimate", "estimate", "open_form"),
  p("request-callback", "Lead", "Request Callback", "callback", "open_form"),
  p("request-proposal", "Lead", "Request Proposal", "proposal", "open_form"),
  p("request-invoice", "Lead", "Request Invoice", "invoice", "open_form"),
  p("contact-sales", "Lead", "Contact Sales", "sales", "open_form"),
  p("free-consultation", "Lead", "Free Consultation", "consultation", "open_form"),
  p("free-trial", "Lead", "Free Trial", "trial", "open_url"),
  p("start-project", "Lead", "Start Project", "project", "open_form"),
  p("download-brochure", "Lead", "Download Brochure", "brochure", "download"),
  p("download-catalog", "Lead", "Download Catalog", "catalog", "download"),
  p("request-demo", "Lead", "Request Demo", "demo", "open_form"),
  p("join-waitlist", "Lead", "Join Waitlist", "waitlist", "open_form"),
  p("contact-expert", "Lead", "Contact Expert", "expert", "open_form"),
  // Ecommerce
  p("add-to-cart", "Ecommerce", "Add to Cart", "cart-add", "javascript"),
  p("buy-now", "Ecommerce", "Buy Now", "buy", "open_url"),
  p("wishlist", "Ecommerce", "Wishlist", "wishlist", "javascript"),
  p("compare", "Ecommerce", "Compare", "compare", "javascript"),
  p("checkout", "Ecommerce", "Checkout", "checkout", "open_url", {
    action: { url: "/checkout" },
  }),
  p("view-cart", "Ecommerce", "View Cart", "cart", "open_url", {
    action: { url: "/cart" },
  }),
  p("apply-coupon", "Ecommerce", "Apply Coupon", "coupon", "javascript"),
  p("track-order", "Ecommerce", "Track Order", "track-order", "open_url"),
  p("shipping-info", "Ecommerce", "Shipping Info", "shipping", "open_url"),
  // Navigation
  p("scroll-top", "Navigation", "Scroll to Top", "arrow-up", "scroll_top"),
  p("scroll-bottom", "Navigation", "Scroll to Bottom", "arrow-down", "scroll_bottom"),
  p("scroll-form", "Navigation", "Scroll to Form", "scroll-form", "scroll_to", {
    action: { selector: "#avonix-form, form, .wpcf7-form" },
  }),
  p("scroll-reviews", "Navigation", "Scroll to Reviews", "star", "scroll_to", {
    action: { selector: "#reviews, .reviews" },
  }),
  p("scroll-pricing", "Navigation", "Scroll to Pricing", "pricing", "scroll_to", {
    action: { selector: "#pricing, .pricing" },
  }),
  p("scroll-faq", "Navigation", "Scroll to FAQ", "faq", "scroll_to", {
    action: { selector: "#faq, .faq" },
  }),
  p("open-map", "Navigation", "Open Map", "map-pin", "maps"),
  p("navigate", "Navigation", "Navigate", "navigate", "maps"),
  p("home", "Navigation", "Home", "home", "open_url", { action: { url: "/" } }),
  p("back", "Navigation", "Back", "back", "javascript", {
    action: { js: "history.back()" },
  }),
  p("open-menu", "Navigation", "Open Menu", "menu", "javascript"),
  // Conversion
  p("get-started", "Conversion", "Get Started", "rocket", "open_url"),
  p("start-now", "Conversion", "Start Now", "rocket", "open_url"),
  p("claim-offer", "Conversion", "Claim Offer", "claim", "open_url"),
  p("limited-deal", "Conversion", "Limited Deal", "deal", "open_url"),
  p("redeem-coupon", "Conversion", "Redeem Coupon", "coupon", "open_url"),
  p("get-discount", "Conversion", "Get Discount", "discount", "open_url"),
  p("subscribe", "Conversion", "Subscribe", "subscribe", "open_form"),
  p("newsletter", "Conversion", "Join Newsletter", "newsletter", "open_form"),
  p("membership", "Conversion", "Join Membership", "membership", "open_url"),
  // Social
  p("facebook", "Social", "Facebook", "facebook", "open_url", { action: { newTab: true } }),
  p("instagram", "Social", "Instagram", "instagram", "open_url", { action: { newTab: true } }),
  p("x", "Social", "X", "x", "open_url", { action: { newTab: true } }),
  p("linkedin", "Social", "LinkedIn", "linkedin", "open_url", { action: { newTab: true } }),
  p("threads", "Social", "Threads", "threads", "open_url", { action: { newTab: true } }),
  p("tiktok", "Social", "TikTok", "tiktok", "open_url", { action: { newTab: true } }),
  p("snapchat", "Social", "Snapchat", "snapchat", "open_url", { action: { newTab: true } }),
  p("pinterest", "Social", "Pinterest", "pinterest", "open_url", { action: { newTab: true } }),
  p("reddit", "Social", "Reddit", "reddit", "open_url", { action: { newTab: true } }),
  p("youtube", "Social", "YouTube", "youtube", "open_url", { action: { newTab: true } }),
  p("vimeo", "Social", "Vimeo", "vimeo", "open_url", { action: { newTab: true } }),
  p("github", "Social", "GitHub", "github", "open_url", { action: { newTab: true } }),
  p("medium", "Social", "Medium", "medium", "open_url", { action: { newTab: true } }),
  // Business
  p("careers", "Business", "Careers", "careers", "open_url"),
  p("partnership", "Business", "Partnership", "partnership", "open_form"),
  p("pricing", "Business", "Pricing", "pricing", "scroll_to", {
    action: { selector: "#pricing" },
  }),
  p("portfolio", "Business", "Portfolio", "portfolio", "open_url"),
  p("case-study", "Business", "Case Study", "case-study", "open_url"),
  p("about-us", "Business", "About Us", "about", "open_url"),
  p("team", "Business", "Team", "team", "open_url"),
  p("services", "Business", "Services", "services", "open_url"),
  // Utility
  p("language", "Utility", "Language Switch", "language", "javascript"),
  p("dark-mode", "Utility", "Dark Mode", "dark", "javascript"),
  p("light-mode", "Utility", "Light Mode", "light", "javascript"),
  p("accessibility", "Utility", "Accessibility", "a11y", "javascript"),
  p("share-page", "Utility", "Share Page", "share", "share"),
  p("copy-link", "Utility", "Copy Link", "copy", "copy_link"),
  p("print", "Utility", "Print", "print", "print"),
  p("download", "Utility", "Download", "download", "download"),
  p("save", "Utility", "Save", "save", "javascript"),
  p("favorite", "Utility", "Favorite", "favorite", "javascript"),
  p("rate-us", "Utility", "Rate Us", "rate", "open_url"),
  // Auth
  p("login", "Auth", "Login", "login", "open_url", { action: { url: "/wp-login.php" } }),
  p("register", "Auth", "Register", "register", "open_url"),
  p("logout", "Auth", "Logout", "logout", "open_url"),
  p("my-account", "Auth", "My Account", "account", "open_url", {
    action: { url: "/my-account" },
  }),
  p("dashboard", "Auth", "Dashboard", "dashboard", "open_url"),
  // File / Media
  p("download-pdf", "File", "Download PDF", "pdf", "download"),
  p("download-doc", "File", "Download DOCX", "doc", "download"),
  p("download-zip", "File", "Download ZIP", "zip", "download"),
  p("play-video", "Media", "Play Video", "play", "open_url"),
  p("gallery", "Media", "Gallery", "gallery", "open_url"),
  p("audio", "Media", "Audio", "audio", "open_url"),
  // Emergency
  p("emergency", "Emergency", "Emergency", "emergency", "phone"),
  p("help", "Emergency", "Help", "help", "open_url"),
  p("ambulance", "Emergency", "Ambulance", "ambulance", "phone", {
    action: { phone: "999" },
  }),
  p("fire", "Emergency", "Fire", "fire", "phone"),
  p("police", "Emergency", "Police", "police", "phone"),
  p("hotline", "Emergency", "Hotline", "hotline", "phone"),
  // Custom
  p("custom-url", "Custom", "Custom URL", "external", "open_url"),
  p("open-popup", "Custom", "Open Popup", "popup", "open_popup"),
  p("open-modal", "Custom", "Open Modal", "popup", "open_modal"),
  p("open-form", "Custom", "Open Form", "form", "open_form"),
  p("trigger-workflow", "Custom", "Trigger Workflow", "workflow", "workflow"),
  p("run-javascript", "Custom", "Execute JavaScript", "sparkles", "javascript"),
  p("pixel-event", "Custom", "Fire Pixel", "sparkles", "pixel_event"),
];

export function listPresetCategories(): string[] {
  return [...new Set(CTA_PRESETS.map((p) => p.category))];
}

export function getPreset(id: string): CtaPreset | undefined {
  return CTA_PRESETS.find((p) => p.id === id);
}

/** Suggested starter groups for common page types. */
export const CTA_GROUP_TEMPLATES: Array<{
  id: string;
  name: string;
  description: string;
  presetIds: string[];
  pageHint: string;
}> = [
  {
    id: "home",
    name: "Home",
    description: "Call · WhatsApp · AI Chat",
    presetIds: ["call-now", "whatsapp", "ai-chat"],
    pageHint: "Homepage",
  },
  {
    id: "service",
    name: "Service Page",
    description: "Estimate · Book · Call",
    presetIds: ["free-estimate", "book-appointment", "call-now"],
    pageHint: "URL contains /service/",
  },
  {
    id: "pricing",
    name: "Pricing",
    description: "Buy Now · Contact Sales",
    presetIds: ["buy-now", "contact-sales"],
    pageHint: "URL contains /pricing",
  },
  {
    id: "product",
    name: "Product",
    description: "Buy · Chat · Wishlist",
    presetIds: ["buy-now", "live-chat", "wishlist"],
    pageHint: "WooCommerce product",
  },
  {
    id: "blog",
    name: "Blog",
    description: "Subscribe · Contact · Share",
    presetIds: ["newsletter", "contact-sales", "share-page"],
    pageHint: "Blog archive / single",
  },
  {
    id: "contact",
    name: "Contact",
    description: "Call · WhatsApp · Map",
    presetIds: ["call-now", "whatsapp", "open-map"],
    pageHint: "/contact",
  },
  {
    id: "thank-you",
    name: "Thank You",
    description: "Dashboard · Download · Share",
    presetIds: ["dashboard", "download", "share-page"],
    pageHint: "URL ends with /thank-you",
  },
];
