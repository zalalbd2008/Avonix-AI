/**
 * CRM module catalog — website-scoped hub cards.
 */

export type CrmModuleId =
  | "tasks"
  | "assign"
  | "notes"
  | "files"
  | "inbox"
  | "score"
  | "journey"
  | "proposals"
  | "quotes"
  | "invoices"
  | "esign"
  | "calendar"
  | "booking"
  | "knowledge"
  | "portal"
  | "tickets"
  | "predict"
  | "forecast"
  | "health"
  | "templates"
  | "copilot";

export type CrmModule = {
  id: CrmModuleId;
  step: number;
  label: string;
  hint: string;
  slug: string;
  href: string;
  tone: string;
  bar: string;
};

export function crmBase(clientId: string, websiteId: string) {
  return `/clients/${clientId}/websites/${websiteId}/crm`;
}

export function crmModules(clientId: string, websiteId: string): CrmModule[] {
  const base = crmBase(clientId, websiteId);
  const conversations = `/clients/${clientId}/websites/${websiteId}/conversations`;

  const rows: Omit<CrmModule, "href">[] = [
    { id: "tasks", step: 5, label: "Tasks", hint: "Call · Proposal · Follow-up", slug: "tasks", tone: "border-sky-200 bg-sky-50 text-sky-900", bar: "from-sky-400/20" },
    { id: "assign", step: 6, label: "Assign", hint: "Texas → David · Auto routes", slug: "assign", tone: "border-violet-200 bg-violet-50 text-violet-900", bar: "from-violet-400/20" },
    { id: "notes", step: 7, label: "Notes", hint: "Internal only", slug: "notes", tone: "border-amber-200 bg-amber-50 text-amber-950", bar: "from-amber-400/20" },
    { id: "files", step: 8, label: "Files", hint: "Proposal · Contract · PDF", slug: "files", tone: "border-cyan-200 bg-cyan-50 text-cyan-900", bar: "from-cyan-400/20" },
    { id: "inbox", step: 9, label: "Messages", hint: "Chat · Email threads", slug: "inbox", tone: "border-teal-200 bg-teal-50 text-teal-900", bar: "from-teal-400/20" },
    { id: "score", step: 10, label: "Lead Score", hint: "Smart points", slug: "score", tone: "border-lime-200 bg-lime-50 text-lime-900", bar: "from-lime-400/20" },
    { id: "journey", step: 11, label: "Journey", hint: "Visit → Pay map", slug: "journey", tone: "border-rose-200 bg-rose-50 text-rose-900", bar: "from-rose-400/20" },
    { id: "proposals", step: 12, label: "Proposals", hint: "Build · Send · Approve", slug: "proposals", tone: "border-indigo-200 bg-indigo-50 text-indigo-900", bar: "from-indigo-400/20" },
    { id: "quotes", step: 13, label: "Quotes", hint: "Customer quotes", slug: "quotes", tone: "border-orange-200 bg-orange-50 text-orange-900", bar: "from-orange-400/20" },
    { id: "invoices", step: 14, label: "Bills", hint: "Tax · Payments", slug: "bills", tone: "border-emerald-200 bg-emerald-50 text-emerald-900", bar: "from-emerald-400/20" },
    { id: "esign", step: 15, label: "E-Sign", hint: "Sign contracts", slug: "esign", tone: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900", bar: "from-fuchsia-400/20" },
    { id: "calendar", step: 16, label: "Calendar", hint: "Meetings · Visits", slug: "calendar", tone: "border-sky-200 bg-sky-50 text-sky-950", bar: "from-sky-500/15" },
    { id: "booking", step: 17, label: "Booking", hint: "Date · Time · Staff", slug: "booking", tone: "border-teal-200 bg-teal-50 text-teal-950", bar: "from-teal-500/15" },
    { id: "knowledge", step: 18, label: "Knowledge", hint: "FAQ · SOP", slug: "knowledge", tone: "border-blue-200 bg-blue-50 text-blue-900", bar: "from-blue-400/20" },
    { id: "portal", step: 19, label: "Portal", hint: "Customer login", slug: "portal", tone: "border-slate-200 bg-slate-50 text-slate-800", bar: "from-slate-400/20" },
    { id: "tickets", step: 20, label: "Tickets", hint: "Support flow", slug: "tickets", tone: "border-red-200 bg-red-50 text-red-900", bar: "from-red-400/20" },
    { id: "predict", step: 21, label: "Predict", hint: "Buy chance %", slug: "predict", tone: "border-violet-200 bg-violet-50 text-violet-950", bar: "from-violet-500/15" },
    { id: "forecast", step: 22, label: "Forecast", hint: "Expected revenue", slug: "forecast", tone: "border-emerald-200 bg-emerald-50 text-emerald-950", bar: "from-emerald-500/15" },
    { id: "health", step: 23, label: "Health", hint: "At risk · Churn", slug: "health", tone: "border-pink-200 bg-pink-50 text-pink-900", bar: "from-pink-400/20" },
    { id: "templates", step: 24, label: "Templates", hint: "Industry packs", slug: "templates", tone: "border-amber-200 bg-amber-50 text-amber-900", bar: "from-amber-500/15" },
    { id: "copilot", step: 25, label: "Copilot", hint: "Say it → rule", slug: "copilot", tone: "border-brand/30 bg-[#fff7f0] text-[#9a3412]", bar: "from-[#ff6600]/15" },
  ];

  return rows.map((m) => ({
    ...m,
    href: m.id === "inbox" ? conversations : `${base}/${m.slug}`,
  }));
}

export const CRM_SLUG_TO_ID: Record<string, CrmModuleId> = {
  tasks: "tasks",
  assign: "assign",
  notes: "notes",
  files: "files",
  inbox: "inbox",
  score: "score",
  journey: "journey",
  proposals: "proposals",
  quotes: "quotes",
  bills: "invoices",
  invoices: "invoices",
  esign: "esign",
  calendar: "calendar",
  booking: "booking",
  knowledge: "knowledge",
  portal: "portal",
  tickets: "tickets",
  predict: "predict",
  forecast: "forecast",
  health: "health",
  templates: "templates",
  copilot: "copilot",
};
