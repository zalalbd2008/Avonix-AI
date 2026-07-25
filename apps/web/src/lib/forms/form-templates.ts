/**
 * Built-in form templates + browser-local agency template library.
 */
import type { FormField, FormSettings } from "@/lib/db/schema";
import { DEFAULT_SETTINGS } from "./fields";
import { DEFAULT_LAYOUT } from "./layout";

const STORAGE_KEY = "avonix.form.templates.v1";

export type FormTemplateDefinition = {
  id: string;
  name: string;
  hint: string;
  fields: FormField[];
  settings: FormSettings;
  submitLabel?: string;
  successMessage?: string;
};

function step(id: string, title: string) {
  return { id, title };
}

/** Starter templates agencies can apply in one click. */
export const BUILT_IN_FORM_TEMPLATES: FormTemplateDefinition[] = [
  {
    id: "tpl-lead-capture",
    name: "Lead capture",
    hint: "Name, email, phone, message",
    submitLabel: "Send enquiry",
    successMessage: "Thanks — we'll be in touch shortly.",
    settings: {
      ...DEFAULT_SETTINGS,
      steps: [step("step_1", "Contact")],
      layout: { ...DEFAULT_LAYOUT, mode: "single" },
    },
    fields: [
      { key: "name", label: "Name", type: "text", required: true, width: "half", stepId: "step_1" },
      { key: "email", label: "Email", type: "email", required: true, width: "half", stepId: "step_1" },
      { key: "phone", label: "Phone", type: "phone", required: false, width: "half", stepId: "step_1" },
      {
        key: "message",
        label: "How can we help?",
        type: "textarea",
        required: true,
        width: "full",
        stepId: "step_1",
      },
    ],
  },
  {
    id: "tpl-qualify",
    name: "Lead qualification",
    hint: "Service, budget, timeline, decision maker",
    submitLabel: "Get a proposal",
    successMessage: "Got it — our team will review and reply with next steps.",
    settings: {
      ...DEFAULT_SETTINGS,
      steps: [step("step_1", "About you"), step("step_2", "Project")],
      layout: { ...DEFAULT_LAYOUT, mode: "wizard" },
    },
    fields: [
      { key: "name", label: "Name", type: "text", required: true, width: "half", stepId: "step_1" },
      { key: "email", label: "Email", type: "email", required: true, width: "half", stepId: "step_1" },
      { key: "company", label: "Company", type: "text", required: false, width: "half", stepId: "step_1" },
      {
        key: "service_needed",
        label: "Service needed",
        type: "multiselect",
        required: true,
        width: "full",
        stepId: "step_2",
        options: ["Web design", "Development", "SEO", "Ads", "Branding", "Support"],
        choiceConfig: { layout: "grid", style: "service", columns: 3, gap: 8 },
      },
      {
        key: "budget_range",
        label: "Budget range",
        type: "select",
        required: true,
        width: "half",
        stepId: "step_2",
        options: ["Under $1k", "$1k–$3k", "$3k–$8k", "$8k–$20k", "$20k+"],
      },
      {
        key: "timeline",
        label: "Timeline",
        type: "radio",
        required: true,
        width: "full",
        stepId: "step_2",
        options: ["ASAP", "1 month", "1–3 months", "Flexible"],
        choiceConfig: { layout: "wrap", style: "button", columns: 4, gap: 8 },
      },
      {
        key: "decision_maker",
        label: "Are you the decision maker?",
        type: "radio",
        required: false,
        width: "half",
        stepId: "step_2",
        options: ["yes", "no", "shared"],
      },
      {
        key: "message",
        label: "Project notes",
        type: "textarea",
        required: false,
        width: "full",
        stepId: "step_2",
      },
    ],
  },
  {
    id: "tpl-discovery-roi",
    name: "Discovery + ROI",
    hint: "Service cards, visual timeline, ROI calculator",
    submitLabel: "Request estimate",
    successMessage: "Thanks — we'll send a tailored estimate soon.",
    settings: {
      ...DEFAULT_SETTINGS,
      steps: [step("step_1", "Scope"), step("step_2", "ROI")],
      layout: { ...DEFAULT_LAYOUT, mode: "wizard" },
    },
    fields: [
      { key: "name", label: "Name", type: "text", required: true, width: "half", stepId: "step_1" },
      { key: "email", label: "Email", type: "email", required: true, width: "half", stepId: "step_1" },
      {
        key: "service_selector",
        label: "Pick a service",
        type: "radio",
        required: true,
        width: "full",
        stepId: "step_1",
        options: ["Website", "Brand kit", "Growth retainer", "Custom build"],
        choiceConfig: { layout: "grid", style: "pricing", columns: 2, gap: 10 },
        optionItems: [
          {
            value: "Website",
            label: "Website",
            description: "Design + build",
            price: "from $3k",
          },
          {
            value: "Brand kit",
            label: "Brand kit",
            description: "Identity system",
            price: "from $1.5k",
          },
          {
            value: "Growth retainer",
            label: "Growth retainer",
            description: "SEO + ads",
            price: "from $2k/mo",
          },
          {
            value: "Custom build",
            label: "Custom build",
            description: "Product / app",
            price: "scoped",
          },
        ],
      },
      {
        key: "visual_timeline",
        label: "Preferred start",
        type: "radio",
        required: true,
        width: "full",
        stepId: "step_1",
        options: ["This week", "This month", "Next quarter", "Exploring"],
        choiceConfig: { layout: "wrap", style: "tile", columns: 4, gap: 8 },
      },
      {
        key: "roi",
        label: "ROI calculator",
        type: "roi",
        required: false,
        width: "full",
        stepId: "step_2",
        roiConfig: {
          currency: "USD",
          defaultInvestment: 5000,
          defaultMonths: 6,
          returnMultiple: 2.5,
        },
      },
      {
        key: "message",
        label: "Goals",
        type: "textarea",
        required: false,
        width: "full",
        stepId: "step_2",
      },
    ],
  },
];

export type SavedFormTemplate = {
  id: string;
  name: string;
  updatedAt: string;
  fields: FormField[];
  settings: FormSettings;
  submitLabel?: string;
  successMessage?: string;
};

export function listSavedTemplates(): SavedFormTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedFormTemplate[];
    return Array.isArray(parsed) ? parsed.slice(0, 40) : [];
  } catch {
    return [];
  }
}

export function saveTemplateToLibrary(template: Omit<SavedFormTemplate, "id" | "updatedAt"> & { id?: string }) {
  const list = listSavedTemplates();
  const id = template.id || `tpl_${Date.now().toString(36)}`;
  const row: SavedFormTemplate = {
    id,
    name: template.name.slice(0, 80),
    updatedAt: new Date().toISOString(),
    fields: template.fields,
    settings: template.settings,
    submitLabel: template.submitLabel,
    successMessage: template.successMessage,
  };
  const next = [row, ...list.filter((t) => t.id !== id)].slice(0, 40);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return row;
}

export function deleteSavedTemplate(id: string) {
  const next = listSavedTemplates().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
