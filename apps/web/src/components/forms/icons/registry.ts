/**
 * Form builder icon system — SVG paths, categories, registry.
 * Browser-safe; no Node deps. Uses currentColor for light/dark.
 */

export type IconCategory =
  | "layout"
  | "basic"
  | "selection"
  | "advanced"
  | "business"
  | "media"
  | "logic"
  | "communication"
  | "analytics"
  | "security"
  | "appearance"
  | "settings"
  | "actions";

export type IconName =
  | "row"
  | "column"
  | "section"
  | "container"
  | "grid"
  | "divider"
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "url"
  | "password"
  | "hidden"
  | "checkbox"
  | "radio"
  | "select"
  | "multiselect"
  | "toggle"
  | "chips"
  | "date"
  | "time"
  | "file"
  | "signature"
  | "rating"
  | "range"
  | "color"
  | "appointment"
  | "roi"
  | "company"
  | "website"
  | "address"
  | "country"
  | "currency"
  | "image"
  | "video"
  | "icon"
  | "logic"
  | "workflow"
  | "ai"
  | "webhook"
  | "integration"
  | "sms"
  | "whatsapp"
  | "chat"
  | "reports"
  | "analytics"
  | "funnel"
  | "shield"
  | "lock"
  | "unlock"
  | "recaptcha"
  | "privacy"
  | "palette"
  | "brush"
  | "typography"
  | "border"
  | "shadow"
  | "animation"
  | "settings"
  | "visibility"
  | "roles"
  | "notifications"
  | "add"
  | "remove"
  | "edit"
  | "duplicate"
  | "copy"
  | "paste"
  | "import"
  | "export"
  | "save"
  | "publish"
  | "preview"
  | "undo"
  | "redo"
  | "grip"
  | "pin"
  | "unpin"
  | "expand"
  | "collapse"
  | "pack"
  | "budget"
  | "enterprise"
  | "discovery"
  | "qualification"
  | "choice";

export type IconDefinition = {
  name: IconName;
  label: string;
  category: IconCategory;
  /** Keywords for search (Step 10). */
  keywords?: string[];
};

export const ICON_CATEGORIES: {
  id: IconCategory;
  label: string;
}[] = [
  { id: "layout", label: "Layout" },
  { id: "basic", label: "Basic fields" },
  { id: "selection", label: "Selection" },
  { id: "advanced", label: "Advanced" },
  { id: "business", label: "Business" },
  { id: "media", label: "Media" },
  { id: "logic", label: "Logic & automation" },
  { id: "communication", label: "Communication" },
  { id: "analytics", label: "Analytics" },
  { id: "security", label: "Security" },
  { id: "appearance", label: "Appearance" },
  { id: "settings", label: "Settings" },
  { id: "actions", label: "Actions" },
];

export const ICON_REGISTRY: IconDefinition[] = [
  { name: "row", label: "Row", category: "layout", keywords: ["horizontal"] },
  { name: "column", label: "Column", category: "layout" },
  { name: "section", label: "Section", category: "layout", keywords: ["heading"] },
  { name: "container", label: "Container", category: "layout", keywords: ["card", "box"] },
  { name: "grid", label: "Grid", category: "layout", keywords: ["12"] },
  { name: "divider", label: "Divider", category: "layout" },
  { name: "text", label: "Text", category: "basic" },
  { name: "textarea", label: "Textarea", category: "basic", keywords: ["long"] },
  { name: "email", label: "Email", category: "basic" },
  { name: "phone", label: "Phone", category: "basic", keywords: ["tel"] },
  { name: "number", label: "Number", category: "basic" },
  { name: "url", label: "URL", category: "basic", keywords: ["link"] },
  { name: "password", label: "Password", category: "basic" },
  { name: "hidden", label: "Hidden", category: "basic" },
  { name: "checkbox", label: "Checkbox", category: "selection" },
  { name: "radio", label: "Radio", category: "selection" },
  { name: "select", label: "Dropdown", category: "selection", keywords: ["select"] },
  { name: "multiselect", label: "Multi select", category: "selection" },
  { name: "toggle", label: "Toggle", category: "selection", keywords: ["switch"] },
  { name: "chips", label: "Chips", category: "selection", keywords: ["tags"] },
  { name: "date", label: "Date", category: "advanced", keywords: ["calendar"] },
  { name: "time", label: "Time", category: "advanced" },
  { name: "file", label: "File upload", category: "advanced", keywords: ["upload"] },
  { name: "signature", label: "Signature", category: "advanced" },
  { name: "rating", label: "Rating", category: "advanced", keywords: ["stars"] },
  { name: "range", label: "Slider", category: "advanced", keywords: ["range"] },
  { name: "color", label: "Color", category: "advanced" },
  { name: "appointment", label: "Appointment", category: "advanced", keywords: ["booking"] },
  { name: "roi", label: "ROI", category: "advanced", keywords: ["calculator"] },
  { name: "company", label: "Company", category: "business" },
  { name: "website", label: "Website", category: "business" },
  { name: "address", label: "Address", category: "business" },
  { name: "country", label: "Country", category: "business" },
  { name: "currency", label: "Currency", category: "business" },
  { name: "image", label: "Image", category: "media" },
  { name: "video", label: "Video", category: "media" },
  { name: "icon", label: "Icon", category: "media" },
  { name: "logic", label: "Conditional logic", category: "logic" },
  { name: "workflow", label: "Workflow", category: "logic" },
  { name: "ai", label: "AI", category: "logic" },
  { name: "webhook", label: "Webhook", category: "logic" },
  { name: "integration", label: "Integration", category: "logic" },
  { name: "sms", label: "SMS", category: "communication" },
  { name: "whatsapp", label: "WhatsApp", category: "communication" },
  { name: "chat", label: "Live chat", category: "communication" },
  { name: "reports", label: "Reports", category: "analytics" },
  { name: "analytics", label: "Analytics", category: "analytics" },
  { name: "funnel", label: "Funnel", category: "analytics" },
  { name: "shield", label: "Shield", category: "security" },
  { name: "lock", label: "Lock", category: "security" },
  { name: "unlock", label: "Unlock", category: "security" },
  { name: "recaptcha", label: "reCAPTCHA", category: "security" },
  { name: "privacy", label: "Privacy", category: "security" },
  { name: "palette", label: "Palette", category: "appearance" },
  { name: "brush", label: "Brush", category: "appearance" },
  { name: "typography", label: "Typography", category: "appearance" },
  { name: "border", label: "Border", category: "appearance" },
  { name: "shadow", label: "Shadow", category: "appearance" },
  { name: "animation", label: "Animation", category: "appearance" },
  { name: "settings", label: "Settings", category: "settings" },
  { name: "visibility", label: "Visibility", category: "settings" },
  { name: "roles", label: "Roles", category: "settings" },
  { name: "notifications", label: "Notifications", category: "settings" },
  { name: "add", label: "Add", category: "actions" },
  { name: "remove", label: "Remove", category: "actions", keywords: ["delete"] },
  { name: "edit", label: "Edit", category: "actions" },
  { name: "duplicate", label: "Duplicate", category: "actions" },
  { name: "copy", label: "Copy", category: "actions" },
  { name: "paste", label: "Paste", category: "actions" },
  { name: "import", label: "Import", category: "actions" },
  { name: "export", label: "Export", category: "actions" },
  { name: "save", label: "Save", category: "actions" },
  { name: "publish", label: "Publish", category: "actions" },
  { name: "preview", label: "Preview", category: "actions" },
  { name: "undo", label: "Undo", category: "actions" },
  { name: "redo", label: "Redo", category: "actions" },
  { name: "grip", label: "Drag handle", category: "actions" },
  { name: "pin", label: "Pin", category: "actions" },
  { name: "unpin", label: "Unpin", category: "actions" },
  { name: "expand", label: "Expand", category: "actions" },
  { name: "collapse", label: "Collapse", category: "actions" },
  { name: "pack", label: "Field pack", category: "actions" },
  { name: "budget", label: "Budget", category: "business" },
  { name: "enterprise", label: "Enterprise", category: "business" },
  { name: "discovery", label: "Discovery", category: "business" },
  { name: "qualification", label: "Qualification", category: "business" },
  { name: "choice", label: "Choice", category: "selection" },
];

const BY_NAME = new Map(ICON_REGISTRY.map((i) => [i.name, i]));

export function isIconName(value: string | null | undefined): value is IconName {
  return Boolean(value && BY_NAME.has(value as IconName));
}

export function getIconDef(name: IconName): IconDefinition | undefined {
  return BY_NAME.get(name);
}

export function iconsInCategory(category: IconCategory): IconDefinition[] {
  return ICON_REGISTRY.filter((i) => i.category === category);
}

export function searchIcons(query: string, limit = 40): IconDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return ICON_REGISTRY.slice(0, limit);
  return ICON_REGISTRY.filter((i) => {
    if (i.name.includes(q) || i.label.toLowerCase().includes(q)) return true;
    return (i.keywords ?? []).some((k) => k.includes(q));
  }).slice(0, limit);
}

/** Map form field types → icon names. */
export function iconForFieldType(type: string): IconName {
  const map: Record<string, IconName> = {
    text: "text",
    email: "email",
    phone: "phone",
    number: "number",
    date: "date",
    url: "url",
    textarea: "textarea",
    select: "select",
    multiselect: "multiselect",
    radio: "radio",
    checkbox: "checkbox",
    toggle: "toggle",
    range: "range",
    rating: "rating",
    file: "file",
    appointment: "appointment",
    roi: "roi",
    signature: "signature",
    recaptcha: "recaptcha",
    hidden: "hidden",
    section: "section",
  };
  return map[type] ?? "text";
}

/** Map field pack group → icon. */
export function iconForPackGroup(group: string): IconName {
  const map: Record<string, IconName> = {
    basic: "text",
    qualification: "qualification",
    discovery: "discovery",
    choice: "choice",
    appointment: "appointment",
    budget: "budget",
    enterprise: "enterprise",
  };
  return map[group] ?? "pack";
}
