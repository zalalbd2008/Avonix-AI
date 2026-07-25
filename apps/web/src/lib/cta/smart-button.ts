/** Smart Button action icons — Nexus Menu Items set. */
export type SmartButtonIcon = {
  key: string;
  label: string;
};

export const SMART_BUTTON_ICONS: SmartButtonIcon[] = [
  { key: "none", label: "No Icon" },
  { key: "call", label: "Call" },
  { key: "mail", label: "Email" },
  { key: "message", label: "Message" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "location", label: "Location" },
  { key: "appointment", label: "Appointment" },
  { key: "download", label: "Download" },
  { key: "popup", label: "Popup / Target" },
  { key: "cta", label: "CTA" },
  { key: "event", label: "Notify / Event" },
  { key: "arrow", label: "Arrow" },
  { key: "ai-chat", label: "AI Chat" },
  { key: "live-chat", label: "Live Chat" },
];

export const SMART_HOVER_EFFECTS = [
  { value: "none", label: "None" },
  { value: "glow", label: "Outer Glow" },
  { value: "lift", label: "Lift" },
  { value: "scale", label: "Scale" },
  { value: "shake", label: "Shake" },
  { value: "rotate", label: "Rotate" },
  { value: "darken", label: "Darken" },
] as const;

export function defaultSmartButtonStyle() {
  return {
    bg: "#10b981",
    text: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    radius: 8,
    hoverEffect: "glow" as const,
    fontSize: 14,
    displayMode: "inline" as const,
  };
}
