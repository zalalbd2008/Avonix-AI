import type {
  FormAppointmentConfig,
  FormChoiceConfig,
  FormField,
  FormFieldType,
  FormFieldWidth,
  FormFileConfig,
  FormOptionItem,
  FormRoiConfig,
} from "@/lib/db/schema";
import {
  sampleCardChoiceItems,
  sampleIconChoiceItems,
  sampleImageChoiceItems,
  syncFieldOptions,
} from "./choice-config";
import { DEFAULT_APPOINTMENT_CONFIG } from "./appointment-config";
import { DEFAULT_ROI } from "./enterprise-config";

/**
 * Agency lead-form field packs — insert as a group or pick singles from the palette.
 */

export type FieldTemplate = {
  /** Preferred key; uniquified on insert if taken. */
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  width?: FormFieldWidth;
  placeholder?: string;
  options?: string[];
  optionItems?: FormOptionItem[];
  choiceConfig?: FormChoiceConfig;
  fileConfig?: FormFileConfig;
  appointmentConfig?: FormAppointmentConfig;
  roiConfig?: FormRoiConfig;
};

export type FieldPack = {
  id: string;
  label: string;
  hint: string;
  group: "basic" | "qualification" | "discovery" | "choice" | "appointment" | "budget" | "enterprise";
  fields: FieldTemplate[];
};

const SERVICES = [
  "Web Design",
  "Web Development",
  "Branding",
  "SEO",
  "Paid Ads",
  "Content",
  "Maintenance",
  "Other",
];

const INDUSTRIES = [
  "SaaS",
  "E-commerce",
  "Agency",
  "Healthcare",
  "Finance",
  "Education",
  "Real Estate",
  "Other",
];

const BUSINESS_SIZES = ["Solo", "2–10", "11–50", "51–200", "200+"];

const REVENUE = [
  "Under $10k/mo",
  "$10k–$50k/mo",
  "$50k–$200k/mo",
  "$200k+/mo",
  "Prefer not to say",
];

const EMPLOYEES = ["1", "2–10", "11–50", "51–200", "200+"];

const PLATFORMS = [
  "WordPress",
  "Shopify",
  "Webflow",
  "Custom / code",
  "Wix / Squarespace",
  "None yet",
  "Other",
];

const BUDGETS = [
  "Under $1k",
  "$1k–$5k",
  "$5k–$15k",
  "$15k–$50k",
  "$50k+",
  "Not sure yet",
];

const TIMELINES = [
  "ASAP",
  "2–4 weeks",
  "1–3 months",
  "3+ months",
  "Just exploring",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const REFERRALS = [
  "Google",
  "Referral",
  "LinkedIn",
  "Social media",
  "Existing client",
  "Other",
];

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "India",
  "Bangladesh",
  "UAE",
  "Other",
];

const CONTACT_METHODS = ["Email", "Phone", "WhatsApp", "Video call"];

/** Basic contact / identity fields. */
export const BASIC_PACK: FieldPack = {
  id: "basic_contact",
  label: "Basic contact",
  hint: "Name, company, email, phone, WhatsApp, location…",
  group: "basic",
  fields: [
    {
      key: "name",
      label: "Full name",
      type: "text",
      required: true,
      width: "half",
      placeholder: "Jane Doe",
    },
    {
      key: "company",
      label: "Company",
      type: "text",
      width: "half",
      placeholder: "Acme Inc.",
    },
    {
      key: "email",
      label: "Email",
      type: "email",
      required: true,
      width: "half",
      placeholder: "jane@acme.com",
    },
    {
      key: "phone",
      label: "Phone",
      type: "phone",
      width: "half",
      placeholder: "+1 555 000 0000",
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      type: "phone",
      width: "half",
      placeholder: "+1 555 000 0000",
    },
    {
      key: "website",
      label: "Website URL",
      type: "url",
      width: "half",
      placeholder: "https://",
    },
    {
      key: "country",
      label: "Country",
      type: "select",
      width: "half",
      options: COUNTRIES,
    },
    {
      key: "city",
      label: "City",
      type: "text",
      width: "half",
      placeholder: "City",
    },
    {
      key: "address",
      label: "Address",
      type: "textarea",
      width: "full",
      placeholder: "Street, suite, ZIP",
    },
    {
      key: "preferred_contact",
      label: "Preferred contact method",
      type: "radio",
      width: "full",
      options: CONTACT_METHODS,
    },
  ],
};

/** Lead qualification fields for agency sales. */
export const QUALIFICATION_PACK: FieldPack = {
  id: "lead_qualification",
  label: "Lead qualification",
  hint: "Services, budget, timeline, decision maker…",
  group: "qualification",
  fields: [
    {
      key: "services_needed",
      label: "Service needed",
      type: "multiselect",
      required: true,
      width: "full",
      options: SERVICES,
    },
    {
      key: "industry",
      label: "Industry",
      type: "select",
      width: "half",
      options: INDUSTRIES,
    },
    {
      key: "business_size",
      label: "Business size",
      type: "select",
      width: "half",
      options: BUSINESS_SIZES,
    },
    {
      key: "monthly_revenue",
      label: "Monthly revenue (optional)",
      type: "select",
      width: "half",
      options: REVENUE,
    },
    {
      key: "employees",
      label: "Number of employees",
      type: "select",
      width: "half",
      options: EMPLOYEES,
    },
    {
      key: "has_website",
      label: "Existing website?",
      type: "radio",
      width: "half",
      options: ["Yes", "No", "In progress"],
    },
    {
      key: "current_platform",
      label: "Current platform",
      type: "select",
      width: "half",
      options: PLATFORMS,
    },
    {
      key: "budget_range",
      label: "Budget range",
      type: "select",
      required: true,
      width: "half",
      options: BUDGETS,
    },
    {
      key: "timeline",
      label: "Timeline",
      type: "select",
      width: "half",
      options: TIMELINES,
    },
    {
      key: "project_priority",
      label: "Project priority",
      type: "radio",
      width: "half",
      options: PRIORITIES,
    },
    {
      key: "is_decision_maker",
      label: "Are you the decision maker?",
      type: "radio",
      width: "half",
      options: ["Yes", "No", "Part of a committee"],
    },
    {
      key: "referral_source",
      label: "Referral source",
      type: "select",
      width: "full",
      options: REFERRALS,
    },
  ],
};

const PROJECT_TYPES = [
  "New website",
  "Redesign",
  "Web app",
  "E-commerce",
  "Brand identity",
  "Marketing site",
  "Other",
];

const FEATURES = [
  "CMS / blog",
  "E-commerce",
  "Membership",
  "Booking",
  "Forms & CRM",
  "Multilingual",
  "Custom integrations",
  "Analytics",
];

/** Project discovery + brand asset uploads. */
export const DISCOVERY_PACK: FieldPack = {
  id: "project_discovery",
  label: "Project discovery",
  hint: "Goals, challenges, features, brand assets…",
  group: "discovery",
  fields: [
    {
      key: "project_type",
      label: "Project type",
      type: "select",
      required: true,
      width: "half",
      options: PROJECT_TYPES,
    },
    {
      key: "project_goals",
      label: "Project goals",
      type: "textarea",
      required: true,
      width: "full",
      placeholder: "What does success look like?",
    },
    {
      key: "current_challenges",
      label: "Current challenges",
      type: "textarea",
      width: "full",
      placeholder: "What’s blocking you today?",
    },
    {
      key: "competitors",
      label: "Competitors",
      type: "textarea",
      width: "full",
      placeholder: "Sites or brands you compete with",
    },
    {
      key: "required_features",
      label: "Required features",
      type: "multiselect",
      width: "full",
      options: FEATURES,
    },
    {
      key: "brand_assets",
      label: "Brand assets",
      type: "file",
      width: "full",
      fileConfig: {
        multiple: true,
        accept: "image/*,.pdf,.ai,.eps,.svg",
        maxSizeMb: 15,
        maxFiles: 10,
        virusScan: true,
      },
    },
    {
      key: "documents",
      label: "Documents (brief, brand guide)",
      type: "file",
      width: "full",
      fileConfig: {
        multiple: true,
        accept: ".pdf,.doc,.docx,.ppt,.pptx,.zip",
        maxSizeMb: 20,
        maxFiles: 8,
        virusScan: true,
      },
    },
    {
      key: "reference_websites",
      label: "Reference websites",
      type: "textarea",
      width: "full",
      placeholder: "https://example.com — what you like about it",
    },
    {
      key: "project_notes",
      label: "Notes",
      type: "textarea",
      width: "full",
      placeholder: "Anything else we should know?",
    },
  ],
};

export const CHOICE_PACK: FieldPack = {
  id: "choice_controls",
  label: "Image / icon / card",
  hint: "Styled choice fields for services & packages",
  group: "choice",
  fields: [
    {
      key: "visual_preference",
      label: "What do you need?",
      type: "radio",
      required: true,
      width: "full",
      choiceConfig: {
        layout: "grid",
        style: "image",
        columns: 3,
        gap: 10,
      },
      ...syncFieldOptions(sampleImageChoiceItems()),
    },
    {
      key: "preferred_contact_style",
      label: "Preferred contact",
      type: "radio",
      width: "full",
      choiceConfig: {
        layout: "wrap",
        style: "icon",
        columns: 2,
        gap: 8,
      },
      ...syncFieldOptions(sampleIconChoiceItems()),
    },
    {
      key: "package",
      label: "Package",
      type: "radio",
      required: true,
      width: "full",
      choiceConfig: {
        layout: "grid",
        style: "pricing",
        columns: 3,
        gap: 10,
      },
      ...syncFieldOptions(sampleCardChoiceItems()),
    },
  ],
};

export const APPOINTMENT_PACK: FieldPack = {
  id: "appointment",
  label: "Appointment booking",
  hint: "Calendar, slots, timezone, meeting type",
  group: "appointment",
  fields: [
    {
      key: "booking_section",
      label: "Book a meeting",
      type: "section",
      width: "full",
    },
    {
      key: "appointment",
      label: "Preferred date & time",
      type: "appointment",
      required: true,
      width: "full",
      appointmentConfig: { ...DEFAULT_APPOINTMENT_CONFIG },
    },
    {
      key: "meeting_type",
      label: "Meeting type",
      type: "radio",
      required: true,
      width: "full",
      choiceConfig: { layout: "wrap", style: "button", gap: 8 },
      options: [
        "Discovery call",
        "Project kickoff",
        "Strategy session",
        "Support",
        "Other",
      ],
    },
    {
      key: "meet_preference",
      label: "Meeting preference",
      type: "radio",
      required: true,
      width: "full",
      choiceConfig: { layout: "wrap", style: "tile", gap: 8 },
      options: ["Google Meet", "Zoom", "Phone call", "In person"],
    },
  ],
};

export const BUDGET_PACK: FieldPack = {
  id: "budget",
  label: "Budget calculator",
  hint: "Services, add-ons, currency, discount",
  group: "budget",
  fields: [
    {
      key: "budget_section",
      label: "Project budget",
      type: "section",
      width: "full",
    },
    {
      key: "services",
      label: "Services",
      type: "multiselect",
      required: true,
      width: "full",
      choiceConfig: {
        layout: "grid",
        style: "pricing",
        columns: 2,
        gap: 10,
      },
      ...syncFieldOptions([
        {
          value: "web_design",
          label: "Web design",
          description: "UI / UX & design system",
          amount: 2500,
          price: "$2,500",
        },
        {
          value: "web_dev",
          label: "Web development",
          description: "Front-end + CMS",
          amount: 4500,
          price: "$4,500",
        },
        {
          value: "branding",
          label: "Branding",
          description: "Identity & guidelines",
          amount: 1800,
          price: "$1,800",
        },
        {
          value: "seo",
          label: "SEO setup",
          description: "Technical + on-page",
          amount: 1200,
          price: "$1,200",
        },
      ]),
    },
    {
      key: "addons",
      label: "Add-ons",
      type: "multiselect",
      width: "full",
      choiceConfig: {
        layout: "wrap",
        style: "tile",
        gap: 8,
      },
      ...syncFieldOptions([
        {
          value: "copywriting",
          label: "Copywriting",
          amount: 600,
          price: "+$600",
        },
        {
          value: "analytics",
          label: "Analytics setup",
          amount: 350,
          price: "+$350",
        },
        {
          value: "care",
          label: "Care plan (3 mo)",
          amount: 900,
          price: "+$900",
        },
        {
          value: "rush",
          label: "Rush delivery",
          amount: 750,
          price: "+$750",
        },
      ]),
    },
    {
      key: "currency",
      label: "Currency",
      type: "select",
      width: "half",
      options: ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "BDT"],
    },
    {
      key: "discount_code",
      label: "Discount code",
      type: "text",
      width: "half",
      placeholder: "e.g. SAVE10",
    },
  ],
};

export const ENTERPRISE_PACK: FieldPack = {
  id: "enterprise_unique",
  label: "Enterprise unique",
  hint: "Service cards, visual timeline, ROI calculator",
  group: "enterprise",
  fields: [
    {
      key: "service_selector",
      label: "Interactive service selector",
      type: "radio",
      required: true,
      width: "full",
      choiceConfig: {
        layout: "grid",
        style: "pricing",
        columns: 2,
        gap: 10,
      },
      ...syncFieldOptions(sampleCardChoiceItems()),
    },
    {
      key: "visual_timeline",
      label: "Visual timeline",
      type: "radio",
      required: true,
      width: "full",
      options: ["This week", "This month", "Next quarter", "Exploring"],
      choiceConfig: {
        layout: "wrap",
        style: "tile",
        columns: 4,
        gap: 8,
      },
    },
    {
      key: "roi",
      label: "ROI calculator",
      type: "roi",
      width: "full",
      roiConfig: { ...DEFAULT_ROI },
    },
  ],
};

export const FIELD_PACKS: FieldPack[] = [
  BASIC_PACK,
  QUALIFICATION_PACK,
  DISCOVERY_PACK,
  CHOICE_PACK,
  APPOINTMENT_PACK,
  BUDGET_PACK,
  ENTERPRISE_PACK,
];

/** Flat list of every pack field for single-insert palette. */
export function packFieldCatalog(): {
  packId: string;
  packLabel: string;
  group: FieldPack["group"];
  template: FieldTemplate;
}[] {
  return FIELD_PACKS.flatMap((pack) =>
    pack.fields.map((template) => ({
      packId: pack.id,
      packLabel: pack.label,
      group: pack.group,
      template,
    })),
  );
}

function uniqueKey(preferred: string, existing: FormField[]): string {
  const taken = new Set(existing.map((f) => f.key));
  if (!taken.has(preferred)) return preferred;
  let n = 2;
  while (taken.has(`${preferred}_${n}`)) n += 1;
  return `${preferred}_${n}`;
}

/** Materialize a template onto the active step with a unique key. */
export function materializeTemplate(
  template: FieldTemplate,
  existing: FormField[],
  stepId: string,
): FormField {
  return {
    key: uniqueKey(template.key, existing),
    label: template.label,
    type: template.type,
    required: Boolean(template.required),
    width: template.width ?? "full",
    placeholder: template.placeholder,
    options: template.options ? [...template.options] : undefined,
    ...(template.optionItems
      ? { optionItems: template.optionItems.map((o) => ({ ...o })) }
      : {}),
    ...(template.choiceConfig
      ? { choiceConfig: { ...template.choiceConfig } }
      : {}),
    ...(template.fileConfig
      ? { fileConfig: { ...template.fileConfig } }
      : {}),
    ...(template.appointmentConfig
      ? { appointmentConfig: { ...template.appointmentConfig } }
      : {}),
    ...(template.roiConfig ? { roiConfig: { ...template.roiConfig } } : {}),
    stepId,
  };
}

/** Insert an entire pack; skips keys that already exist with the same preferred key. */
export function materializePack(
  pack: FieldPack,
  existing: FormField[],
  stepId: string,
  opts?: { skipExistingKeys?: boolean },
): FormField[] {
  const skip = opts?.skipExistingKeys !== false;
  const existingKeys = new Set(existing.map((f) => f.key));
  const created: FormField[] = [];
  let pool = [...existing];

  for (const template of pack.fields) {
    if (skip && existingKeys.has(template.key)) continue;
    const field = materializeTemplate(template, pool, stepId);
    created.push(field);
    pool = [...pool, field];
  }
  return created;
}
