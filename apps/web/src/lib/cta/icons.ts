/**
 * CTA icon registry — expandable packs. Keys are stable; packs can map to
 * Font Awesome / Lucide / Material later. First slice ships emoji fallbacks.
 */
export type CtaIconDef = {
  key: string;
  label: string;
  category: string;
  emoji: string;
  packs?: string[];
};

export const CTA_ICONS: CtaIconDef[] = [
  // Communication
  { key: "phone", label: "Call", category: "Communication", emoji: "📞", packs: ["lucide", "fa", "material"] },
  { key: "callback", label: "Callback", category: "Communication", emoji: "📲", packs: ["lucide", "fa"] },
  { key: "whatsapp", label: "WhatsApp", category: "Communication", emoji: "💬", packs: ["fa", "simple"] },
  { key: "whatsapp-business", label: "WhatsApp Business", category: "Communication", emoji: "💼", packs: ["fa"] },
  { key: "ai-chat", label: "AI Chat", category: "Communication", emoji: "🤖", packs: ["lucide", "fa"] },
  { key: "live-chat", label: "Live Chat", category: "Communication", emoji: "💬", packs: ["lucide", "fa"] },
  { key: "email", label: "Email", category: "Communication", emoji: "📧", packs: ["lucide", "fa", "material"] },
  { key: "gmail", label: "Gmail", category: "Communication", emoji: "✉", packs: ["simple"] },
  { key: "messenger", label: "Messenger", category: "Communication", emoji: "💌", packs: ["fa", "simple"] },
  { key: "telegram", label: "Telegram", category: "Communication", emoji: "✈", packs: ["fa", "simple"] },
  { key: "skype", label: "Skype", category: "Communication", emoji: "💙", packs: ["fa", "simple"] },
  { key: "viber", label: "Viber", category: "Communication", emoji: "🎧", packs: ["fa", "simple"] },
  { key: "discord", label: "Discord", category: "Communication", emoji: "💬", packs: ["fa", "simple"] },
  { key: "line", label: "LINE", category: "Communication", emoji: "🟢", packs: ["simple"] },
  { key: "wechat", label: "WeChat", category: "Communication", emoji: "💚", packs: ["fa", "simple"] },
  { key: "signal", label: "Signal", category: "Communication", emoji: "💙", packs: ["simple"] },
  { key: "sms", label: "SMS", category: "Communication", emoji: "📱", packs: ["lucide", "fa", "material"] },
  { key: "facetime", label: "FaceTime", category: "Communication", emoji: "📹", packs: ["lucide"] },
  { key: "zoom", label: "Zoom", category: "Communication", emoji: "🎥", packs: ["simple"] },
  { key: "meet", label: "Google Meet", category: "Communication", emoji: "📹", packs: ["simple"] },
  { key: "teams", label: "Microsoft Teams", category: "Communication", emoji: "📹", packs: ["simple"] },
  // Appointment
  { key: "calendar", label: "Book Appointment", category: "Appointment", emoji: "📅", packs: ["lucide", "fa", "material"] },
  { key: "schedule", label: "Schedule Meeting", category: "Appointment", emoji: "📆", packs: ["lucide", "fa"] },
  { key: "reserve", label: "Reserve Slot", category: "Appointment", emoji: "🗓", packs: ["lucide"] },
  { key: "doctor", label: "Doctor", category: "Appointment", emoji: "👨‍⚕️", packs: ["fa"] },
  { key: "salon", label: "Salon", category: "Appointment", emoji: "💇", packs: ["fa"] },
  { key: "car-service", label: "Service Booking", category: "Appointment", emoji: "🚗", packs: ["lucide", "fa"] },
  { key: "hotel", label: "Hotel", category: "Appointment", emoji: "🏨", packs: ["fa", "material"] },
  // Lead
  { key: "quote", label: "Get Quote", category: "Lead", emoji: "📝", packs: ["lucide", "fa"] },
  { key: "estimate", label: "Free Estimate", category: "Lead", emoji: "💲", packs: ["lucide", "fa"] },
  { key: "proposal", label: "Request Proposal", category: "Lead", emoji: "📄", packs: ["lucide", "fa"] },
  { key: "invoice", label: "Request Invoice", category: "Lead", emoji: "🧾", packs: ["lucide", "fa"] },
  { key: "sales", label: "Contact Sales", category: "Lead", emoji: "📥", packs: ["lucide", "fa"] },
  { key: "consultation", label: "Free Consultation", category: "Lead", emoji: "💡", packs: ["lucide", "fa"] },
  { key: "trial", label: "Free Trial", category: "Lead", emoji: "🎁", packs: ["lucide", "fa"] },
  { key: "project", label: "Start Project", category: "Lead", emoji: "📌", packs: ["lucide", "fa"] },
  { key: "brochure", label: "Download Brochure", category: "Lead", emoji: "📂", packs: ["lucide", "fa"] },
  { key: "catalog", label: "Download Catalog", category: "Lead", emoji: "📖", packs: ["lucide", "fa"] },
  { key: "demo", label: "Request Demo", category: "Lead", emoji: "🎯", packs: ["lucide", "fa"] },
  { key: "waitlist", label: "Join Waitlist", category: "Lead", emoji: "⏳", packs: ["lucide", "fa"] },
  { key: "expert", label: "Contact Expert", category: "Lead", emoji: "👨‍💼", packs: ["lucide", "fa"] },
  // Ecommerce
  { key: "cart-add", label: "Add to Cart", category: "Ecommerce", emoji: "🛒", packs: ["lucide", "fa", "material"] },
  { key: "buy", label: "Buy Now", category: "Ecommerce", emoji: "⚡", packs: ["lucide", "fa"] },
  { key: "wishlist", label: "Wishlist", category: "Ecommerce", emoji: "❤️", packs: ["lucide", "fa", "material"] },
  { key: "compare", label: "Compare", category: "Ecommerce", emoji: "⚖", packs: ["lucide", "fa"] },
  { key: "checkout", label: "Checkout", category: "Ecommerce", emoji: "💳", packs: ["lucide", "fa"] },
  { key: "cart", label: "View Cart", category: "Ecommerce", emoji: "🧺", packs: ["lucide", "fa"] },
  { key: "coupon", label: "Apply Coupon", category: "Ecommerce", emoji: "🎟", packs: ["lucide", "fa"] },
  { key: "track-order", label: "Track Order", category: "Ecommerce", emoji: "📦", packs: ["lucide", "fa"] },
  { key: "shipping", label: "Shipping Info", category: "Ecommerce", emoji: "🚚", packs: ["lucide", "fa"] },
  // Navigation
  { key: "arrow-up", label: "Scroll Top", category: "Navigation", emoji: "⬆", packs: ["lucide", "fa", "material"] },
  { key: "arrow-down", label: "Scroll Bottom", category: "Navigation", emoji: "⬇", packs: ["lucide", "fa"] },
  { key: "scroll-form", label: "Scroll to Form", category: "Navigation", emoji: "📄", packs: ["lucide", "fa"] },
  { key: "star", label: "Scroll Reviews", category: "Navigation", emoji: "⭐", packs: ["lucide", "fa", "material"] },
  { key: "pricing", label: "Scroll Pricing", category: "Navigation", emoji: "💰", packs: ["lucide", "fa"] },
  { key: "faq", label: "Scroll FAQ", category: "Navigation", emoji: "❓", packs: ["lucide", "fa"] },
  { key: "map-pin", label: "Open Map", category: "Navigation", emoji: "📍", packs: ["lucide", "fa", "material"] },
  { key: "navigate", label: "Navigate", category: "Navigation", emoji: "🧭", packs: ["lucide", "fa"] },
  { key: "home", label: "Home", category: "Navigation", emoji: "🏠", packs: ["lucide", "fa", "material"] },
  { key: "back", label: "Back", category: "Navigation", emoji: "🔙", packs: ["lucide", "fa", "material"] },
  { key: "menu", label: "Open Menu", category: "Navigation", emoji: "☰", packs: ["lucide", "fa", "material"] },
  { key: "external", label: "External Link", category: "Navigation", emoji: "🔗", packs: ["lucide", "fa"] },
  // Conversion
  { key: "rocket", label: "Get Started", category: "Conversion", emoji: "🚀", packs: ["lucide", "fa"] },
  { key: "claim", label: "Claim Offer", category: "Conversion", emoji: "🎉", packs: ["lucide", "fa"] },
  { key: "deal", label: "Limited Deal", category: "Conversion", emoji: "🔥", packs: ["lucide", "fa"] },
  { key: "discount", label: "Get Discount", category: "Conversion", emoji: "💵", packs: ["lucide", "fa"] },
  { key: "subscribe", label: "Subscribe", category: "Conversion", emoji: "📬", packs: ["lucide", "fa"] },
  { key: "newsletter", label: "Newsletter", category: "Conversion", emoji: "📰", packs: ["lucide", "fa"] },
  { key: "membership", label: "Join Membership", category: "Conversion", emoji: "🏆", packs: ["lucide", "fa"] },
  // Social
  { key: "facebook", label: "Facebook", category: "Social", emoji: "📘", packs: ["fa", "simple"] },
  { key: "instagram", label: "Instagram", category: "Social", emoji: "📸", packs: ["fa", "simple"] },
  { key: "x", label: "X", category: "Social", emoji: "𝕏", packs: ["fa", "simple"] },
  { key: "linkedin", label: "LinkedIn", category: "Social", emoji: "💼", packs: ["fa", "simple"] },
  { key: "threads", label: "Threads", category: "Social", emoji: "🧵", packs: ["simple"] },
  { key: "tiktok", label: "TikTok", category: "Social", emoji: "🎵", packs: ["fa", "simple"] },
  { key: "snapchat", label: "Snapchat", category: "Social", emoji: "👻", packs: ["fa", "simple"] },
  { key: "pinterest", label: "Pinterest", category: "Social", emoji: "📌", packs: ["fa", "simple"] },
  { key: "reddit", label: "Reddit", category: "Social", emoji: "🔴", packs: ["fa", "simple"] },
  { key: "youtube", label: "YouTube", category: "Social", emoji: "▶️", packs: ["fa", "simple"] },
  { key: "vimeo", label: "Vimeo", category: "Social", emoji: "🎬", packs: ["fa", "simple"] },
  { key: "github", label: "GitHub", category: "Social", emoji: "🐙", packs: ["fa", "simple"] },
  { key: "medium", label: "Medium", category: "Social", emoji: "Ⓜ", packs: ["fa", "simple"] },
  // Business
  { key: "careers", label: "Careers", category: "Business", emoji: "💼", packs: ["lucide", "fa"] },
  { key: "partnership", label: "Partnership", category: "Business", emoji: "🤝", packs: ["lucide", "fa"] },
  { key: "portfolio", label: "Portfolio", category: "Business", emoji: "📄", packs: ["lucide", "fa"] },
  { key: "case-study", label: "Case Study", category: "Business", emoji: "📚", packs: ["lucide", "fa"] },
  { key: "about", label: "About Us", category: "Business", emoji: "🏢", packs: ["lucide", "fa"] },
  { key: "team", label: "Team", category: "Business", emoji: "👥", packs: ["lucide", "fa", "material"] },
  { key: "services", label: "Services", category: "Business", emoji: "📢", packs: ["lucide", "fa"] },
  // Utility
  { key: "language", label: "Language", category: "Utility", emoji: "🌐", packs: ["lucide", "fa", "material"] },
  { key: "dark", label: "Dark Mode", category: "Utility", emoji: "🌙", packs: ["lucide", "fa"] },
  { key: "light", label: "Light Mode", category: "Utility", emoji: "☀", packs: ["lucide", "fa"] },
  { key: "a11y", label: "Accessibility", category: "Utility", emoji: "♿", packs: ["lucide", "fa"] },
  { key: "share", label: "Share", category: "Utility", emoji: "📤", packs: ["lucide", "fa", "material"] },
  { key: "copy", label: "Copy Link", category: "Utility", emoji: "📋", packs: ["lucide", "fa"] },
  { key: "print", label: "Print", category: "Utility", emoji: "🖨", packs: ["lucide", "fa"] },
  { key: "download", label: "Download", category: "Utility", emoji: "📥", packs: ["lucide", "fa", "material"] },
  { key: "save", label: "Save", category: "Utility", emoji: "📑", packs: ["lucide", "fa"] },
  { key: "favorite", label: "Favorite", category: "Utility", emoji: "❤️", packs: ["lucide", "fa"] },
  { key: "rate", label: "Rate Us", category: "Utility", emoji: "⭐", packs: ["lucide", "fa"] },
  { key: "search", label: "Search", category: "Utility", emoji: "🔍", packs: ["lucide", "fa", "material"] },
  { key: "qr", label: "QR Code", category: "Utility", emoji: "▦", packs: ["lucide", "fa"] },
  // Auth
  { key: "login", label: "Login", category: "Auth", emoji: "🔑", packs: ["lucide", "fa"] },
  { key: "register", label: "Register", category: "Auth", emoji: "✍", packs: ["lucide", "fa"] },
  { key: "logout", label: "Logout", category: "Auth", emoji: "🚪", packs: ["lucide", "fa"] },
  { key: "account", label: "My Account", category: "Auth", emoji: "👤", packs: ["lucide", "fa", "material"] },
  { key: "dashboard", label: "Dashboard", category: "Auth", emoji: "📊", packs: ["lucide", "fa"] },
  // File / Media
  { key: "pdf", label: "PDF", category: "File", emoji: "📕", packs: ["lucide", "fa"] },
  { key: "doc", label: "Document", category: "File", emoji: "📘", packs: ["lucide", "fa"] },
  { key: "zip", label: "ZIP", category: "File", emoji: "📦", packs: ["lucide", "fa"] },
  { key: "play", label: "Play Video", category: "Media", emoji: "▶", packs: ["lucide", "fa", "material"] },
  { key: "gallery", label: "Gallery", category: "Media", emoji: "🖼", packs: ["lucide", "fa"] },
  { key: "audio", label: "Audio", category: "Media", emoji: "🎵", packs: ["lucide", "fa"] },
  // Emergency
  { key: "emergency", label: "Emergency", category: "Emergency", emoji: "🚨", packs: ["lucide", "fa"] },
  { key: "help", label: "Help", category: "Emergency", emoji: "🆘", packs: ["lucide", "fa"] },
  { key: "ambulance", label: "Ambulance", category: "Emergency", emoji: "🚑", packs: ["fa"] },
  { key: "fire", label: "Fire", category: "Emergency", emoji: "🚒", packs: ["fa"] },
  { key: "police", label: "Police", category: "Emergency", emoji: "👮", packs: ["fa"] },
  { key: "hotline", label: "Hotline", category: "Emergency", emoji: "☎", packs: ["lucide", "fa"] },
  // Custom
  { key: "sparkles", label: "Custom", category: "Custom", emoji: "✨", packs: ["lucide", "fa"] },
  { key: "workflow", label: "Workflow", category: "Custom", emoji: "⚙", packs: ["lucide", "fa"] },
  { key: "form", label: "Open Form", category: "Custom", emoji: "📋", packs: ["lucide", "fa"] },
  { key: "popup", label: "Open Popup", category: "Custom", emoji: "🪟", packs: ["lucide", "fa"] },
];

export function getCtaIcon(key: string): CtaIconDef {
  return (
    CTA_ICONS.find((i) => i.key === key) ?? {
      key,
      label: key,
      category: "Custom",
      emoji: "✨",
    }
  );
}

export function listIconCategories(): string[] {
  return [...new Set(CTA_ICONS.map((i) => i.category))];
}
