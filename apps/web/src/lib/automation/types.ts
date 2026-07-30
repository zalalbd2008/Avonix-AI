/**
 * Per-website automation rules — stored on `websites.settings.automation`.
 * Rules are executed by `lib/automation/engine` on form submit / chat handoff.
 */

export type AutomationTrigger =
  | "new_lead"
  | "form_submit"
  | "chat_handoff"
  | "chat_missed"
  | "uptime_down"
  | "social_message"
  | "social_comment"
  | "social_mention"
  | "email_opened"
  | "email_clicked";

export type AutomationAction =
  | "thank_you_email"
  | "notify_email"
  | "save_crm"
  | "score_lead"
  | "webhook"
  | "tag_contact"
  | "open_conversation"
  | "post_social"
  | "reply_social"
  | "notify_whatsapp"
  | "schedule_follow_up"
  | "assign_sales"
  | "notify_sms";

export type WorkflowKind = "custom" | "contact" | "quote" | "appointment";

export type SocialProvider =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "x"
  | "whatsapp"
  | "telegram";

export type SocialAccount = {
  provider: SocialProvider;
  /** True when required fields are saved (token + account id). */
  connected: boolean;
  /** Page / channel / business display name. */
  label: string;
  /** Page ID, IG business ID, phone, chat id, etc. */
  accountId: string;
  /** Access token or bot token. */
  accessToken: string;
  connectedAt: string;
};

export type AutomationRule = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  /** Optional webhook for this rule (overrides site default when set). */
  webhookUrl: string;
  /** Optional notify override. */
  notifyEmail: string;
  tag: string;
  /** Networks to post / reply on (must be connected). */
  socialTargets: SocialProvider[];
  /** Short template for social post / reply / WhatsApp / thank-you. */
  socialMessage: string;
  /** Workflow preset label. */
  workflowKind: WorkflowKind;
  /** Let AI intent/urgency/interest reorder & filter actions. */
  aiDecide: boolean;
  /** Hours before open/no-open follow-up fires. */
  followUpDelayHours: number;
  followUpOfferMessage: string;
  followUpReminderMessage: string;
  /** Sales owner label (stored on contact.fields.assignee). */
  assignee: string;
  /** Extra notify when sales routing fires. */
  salesNotifyEmail: string;
  /** Budget ≥ this → high priority assign (0 = ignore). */
  budgetThreshold: number;
  /** AI score ≥ this → high priority assign (0 = ignore). */
  minScore: number;
  /** E.164 or local phone for SMS action (visitor phone used when blank). */
  smsTo: string;
};

export type AutomationSettings = {
  enabled: boolean;
  /** Site-wide default webhook for rules that use webhook action. */
  defaultWebhookUrl: string;
  /** Fallback notify address (SMTP Setup notify used when blank). */
  defaultNotifyEmail: string;
  /** Minutes a queued chat waits before chat_missed fires. */
  missedChatMinutes: number;
  /** Connected social / messaging accounts for this website. */
  socialAccounts: SocialAccount[];
  rules: AutomationRule[];
};

export const SOCIAL_PROVIDERS: {
  id: SocialProvider;
  label: string;
  hint: string;
  idLabel: string;
  idPlaceholder: string;
  tokenLabel: string;
  tone: string;
  ring: string;
  bar: string;
}[] = [
  {
    id: "facebook",
    label: "Facebook",
    hint: "Page posts & comments",
    idLabel: "Page ID",
    idPlaceholder: "1234567890",
    tokenLabel: "Page access token",
    tone: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
    ring: "ring-[#3b82f6]/35",
    bar: "from-[#1877F2]/15",
  },
  {
    id: "instagram",
    label: "Instagram",
    hint: "Business DMs & comments",
    idLabel: "Business account ID",
    idPlaceholder: "17841400…",
    tokenLabel: "Graph API token",
    tone: "bg-[#fdf2f8] text-[#be185d] border-[#fbcfe8]",
    ring: "ring-[#ec4899]/35",
    bar: "from-[#E1306C]/15",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    hint: "Company page updates",
    idLabel: "Organization URN / ID",
    idPlaceholder: "urn:li:organization:…",
    tokenLabel: "Access token",
    tone: "bg-[#eff6ff] text-[#0a66c2] border-[#bfdbfe]",
    ring: "ring-[#0a66c2]/35",
    bar: "from-[#0A66C2]/15",
  },
  {
    id: "x",
    label: "X (Twitter)",
    hint: "Posts & mentions",
    idLabel: "User / account ID",
    idPlaceholder: "44196397",
    tokenLabel: "Bearer / OAuth token",
    tone: "bg-[#f4f4f5] text-[#18181b] border-[#d4d4d8]",
    ring: "ring-[#71717a]/35",
    bar: "from-[#18181b]/10",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    hint: "Business alerts & replies",
    idLabel: "Phone number ID",
    idPlaceholder: "10987654321",
    tokenLabel: "Cloud API token",
    tone: "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]",
    ring: "ring-[#25D366]/40",
    bar: "from-[#25D366]/15",
  },
  {
    id: "telegram",
    label: "Telegram",
    hint: "Phone number connect — platform bot, no token",
    idLabel: "Phone number",
    idPlaceholder: "+8801XXXXXXXXX",
    tokenLabel: "Not required",
    tone: "bg-[#eff6ff] text-[#0284c7] border-[#bae6fd]",
    ring: "ring-[#229ED9]/40",
    bar: "from-[#229ED9]/15",
  },
];

export const AUTOMATION_TRIGGERS: {
  id: AutomationTrigger;
  label: string;
  hint: string;
  tone: string;
  ring: string;
}[] = [
  {
    id: "new_lead",
    label: "New lead",
    hint: "Someone becomes a contact",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    ring: "ring-emerald-400/40",
  },
  {
    id: "form_submit",
    label: "Form filled",
    hint: "A form on this site is submitted",
    tone: "bg-sky-50 text-sky-800 border-sky-200",
    ring: "ring-sky-400/40",
  },
  {
    id: "chat_handoff",
    label: "Chat needs human",
    hint: "Visitor asks for a person",
    tone: "bg-violet-50 text-violet-800 border-violet-200",
    ring: "ring-violet-400/40",
  },
  {
    id: "chat_missed",
    label: "Missed chat",
    hint: "No reply after a wait",
    tone: "bg-amber-50 text-amber-900 border-amber-200",
    ring: "ring-amber-400/40",
  },
  {
    id: "uptime_down",
    label: "Site down",
    hint: "Uptime check fails",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    ring: "ring-rose-400/40",
  },
  {
    id: "social_message",
    label: "Social DM",
    hint: "WhatsApp / IG / FB message in",
    tone: "bg-teal-50 text-teal-800 border-teal-200",
    ring: "ring-teal-400/40",
  },
  {
    id: "social_comment",
    label: "Social comment",
    hint: "Someone comments on a post",
    tone: "bg-pink-50 text-pink-800 border-pink-200",
    ring: "ring-pink-400/40",
  },
  {
    id: "social_mention",
    label: "Social mention",
    hint: "Your brand is tagged / mentioned",
    tone: "bg-indigo-50 text-indigo-800 border-indigo-200",
    ring: "ring-indigo-400/40",
  },
  {
    id: "email_opened",
    label: "Email opened",
    hint: "Visitor opened a tracked email",
    tone: "bg-yellow-50 text-yellow-900 border-yellow-200",
    ring: "ring-yellow-400/40",
  },
  {
    id: "email_clicked",
    label: "Email clicked",
    hint: "Visitor clicked a tracked link",
    tone: "bg-orange-50 text-orange-900 border-orange-200",
    ring: "ring-orange-400/40",
  },
];

export const AUTOMATION_ACTIONS: {
  id: AutomationAction;
  label: string;
  hint: string;
  tone: string;
}[] = [
  {
    id: "thank_you_email",
    label: "Thank-you email",
    hint: "AI-personalized note to visitor",
    tone: "bg-teal-50 text-teal-800 border-teal-200",
  },
  {
    id: "notify_email",
    label: "Alert team",
    hint: "Email your sales / admin",
    tone: "bg-orange-50 text-orange-800 border-orange-200",
  },
  {
    id: "save_crm",
    label: "Save to CRM",
    hint: "Keep contact + form fields fresh",
    tone: "bg-slate-50 text-slate-800 border-slate-200",
  },
  {
    id: "score_lead",
    label: "Lead score",
    hint: "Store AI score on the contact",
    tone: "bg-amber-50 text-amber-900 border-amber-200",
  },
  {
    id: "webhook",
    label: "Call webhook",
    hint: "Zapier / Make / custom URL",
    tone: "bg-cyan-50 text-cyan-800 border-cyan-200",
  },
  {
    id: "tag_contact",
    label: "Add tag",
    hint: "Mark the contact",
    tone: "bg-lime-50 text-lime-800 border-lime-200",
  },
  {
    id: "open_conversation",
    label: "Open inbox",
    hint: "Create / bump a thread",
    tone: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200",
  },
  {
    id: "post_social",
    label: "Post to social",
    hint: "Share on connected pages",
    tone: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    id: "reply_social",
    label: "Reply on social",
    hint: "Answer comment or DM",
    tone: "bg-pink-50 text-pink-800 border-pink-200",
  },
  {
    id: "notify_whatsapp",
    label: "WhatsApp message",
    hint: "Text the visitor (Cloud API)",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  {
    id: "schedule_follow_up",
    label: "Follow-up later",
    hint: "Wait → open? offer : reminder",
    tone: "bg-yellow-50 text-yellow-900 border-yellow-200",
  },
  {
    id: "assign_sales",
    label: "Assign sales",
    hint: "Route hot leads to an owner",
    tone: "bg-red-50 text-red-800 border-red-200",
  },
  {
    id: "notify_sms",
    label: "Send SMS",
    hint: "Twilio text to visitor / number",
    tone: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
];

export const DEFAULT_AUTOMATION: AutomationSettings = {
  enabled: false,
  defaultWebhookUrl: "",
  defaultNotifyEmail: "",
  missedChatMinutes: 15,
  socialAccounts: SOCIAL_PROVIDERS.map((p) => emptySocialAccount(p.id)),
  rules: [],
};

function str(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function isTrigger(v: unknown): v is AutomationTrigger {
  return AUTOMATION_TRIGGERS.some((t) => t.id === v);
}

function isAction(v: unknown): v is AutomationAction {
  return AUTOMATION_ACTIONS.some((a) => a.id === v);
}

function isProvider(v: unknown): v is SocialProvider {
  return SOCIAL_PROVIDERS.some((p) => p.id === v);
}

export function emptySocialAccount(provider: SocialProvider): SocialAccount {
  return {
    provider,
    connected: false,
    label: "",
    accountId: "",
    accessToken: "",
    connectedAt: "",
  };
}

export function mergeSocialAccount(
  raw?: Partial<SocialAccount> | null,
  fallbackProvider: SocialProvider = "facebook",
): SocialAccount {
  const provider = isProvider(raw?.provider) ? raw!.provider! : fallbackProvider;
  const accountId = str(raw?.accountId);
  const accessToken = str(raw?.accessToken);
  const connected =
    Boolean(raw?.connected) && Boolean(accountId) && Boolean(accessToken);
  return {
    provider,
    connected,
    label: str(raw?.label),
    accountId,
    accessToken,
    connectedAt: connected
      ? str(raw?.connectedAt) || new Date().toISOString()
      : "",
  };
}

export function socialProviderMeta(id: SocialProvider) {
  return SOCIAL_PROVIDERS.find((p) => p.id === id) ?? SOCIAL_PROVIDERS[0]!;
}

export function connectedSocialCount(settings: AutomationSettings): number {
  return settings.socialAccounts.filter((a) => a.connected).length;
}

export function isSocialConnected(
  settings: AutomationSettings,
  provider: SocialProvider,
): boolean {
  return settings.socialAccounts.some(
    (a) => a.provider === provider && a.connected,
  );
}

export function newAutomationRule(
  partial?: Partial<AutomationRule>,
): AutomationRule {
  const workflowKind = (["custom", "contact", "quote", "appointment"] as const)
    .includes(partial?.workflowKind as WorkflowKind)
    ? (partial!.workflowKind as WorkflowKind)
    : "custom";

  return {
    id:
      partial?.id ||
      `rule_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`,
    name: partial?.name?.trim() || "New rule",
    enabled: partial?.enabled ?? true,
    trigger: isTrigger(partial?.trigger) ? partial!.trigger! : "form_submit",
    actions:
      Array.isArray(partial?.actions) && partial!.actions!.length
        ? partial!.actions!.filter(isAction)
        : ["thank_you_email", "notify_email", "save_crm", "score_lead"],
    webhookUrl: str(partial?.webhookUrl),
    notifyEmail: str(partial?.notifyEmail).toLowerCase(),
    tag: str(partial?.tag),
    socialTargets: Array.isArray(partial?.socialTargets)
      ? partial!.socialTargets!.filter(isProvider)
      : [],
    socialMessage: str(partial?.socialMessage),
    workflowKind,
    aiDecide: Boolean(partial?.aiDecide),
    followUpDelayHours: Math.max(
      0,
      Math.min(720, Number(partial?.followUpDelayHours) || 48),
    ),
    followUpOfferMessage: str(partial?.followUpOfferMessage),
    followUpReminderMessage: str(partial?.followUpReminderMessage),
    assignee: str(partial?.assignee).slice(0, 160),
    salesNotifyEmail: str(partial?.salesNotifyEmail).toLowerCase(),
    budgetThreshold: Math.max(0, Number(partial?.budgetThreshold) || 0),
    minScore: Math.max(0, Math.min(100, Number(partial?.minScore) || 0)),
    smsTo: str(partial?.smsTo),
  };
}

export const WORKFLOW_PRESETS: {
  id: WorkflowKind;
  label: string;
  hint: string;
  tone: string;
  rule: Partial<AutomationRule>;
}[] = [
  {
    id: "contact",
    label: "Contact workflow",
    hint: "Thank-you + team alert + CRM + follow-up",
    tone: "border-sky-300 bg-sky-50 text-sky-900",
    rule: {
      name: "Contact workflow",
      workflowKind: "contact",
      trigger: "form_submit",
      aiDecide: true,
      actions: [
        "thank_you_email",
        "notify_email",
        "save_crm",
        "score_lead",
        "schedule_follow_up",
      ],
      followUpDelayHours: 48,
      followUpOfferMessage:
        "Hi {{name}}, saw you opened our note — want a quick call this week about {{service}}?",
      followUpReminderMessage:
        "Hi {{name}}, just checking in on your message about {{service}}. Happy to help whenever you’re ready.",
      socialMessage: "",
    },
  },
  {
    id: "quote",
    label: "Quote workflow",
    hint: "Estimate path + hot-lead sales assign",
    tone: "border-amber-300 bg-amber-50 text-amber-950",
    rule: {
      name: "Quote workflow",
      workflowKind: "quote",
      trigger: "form_submit",
      aiDecide: true,
      tag: "quote-request",
      actions: [
        "thank_you_email",
        "notify_email",
        "save_crm",
        "score_lead",
        "tag_contact",
        "assign_sales",
        "schedule_follow_up",
      ],
      followUpDelayHours: 24,
      budgetThreshold: 5000,
      minScore: 70,
      followUpOfferMessage:
        "Hi {{name}}, here’s a next step for your {{service}} estimate — reply with a good time to talk.",
      followUpReminderMessage:
        "Hi {{name}}, we haven’t heard back on your quote request for {{service}}. Still interested?",
      socialMessage:
        "Hi {{name}}, thanks for requesting a {{service}} estimate. Our specialist will follow up soon.",
    },
  },
  {
    id: "appointment",
    label: "Appointment workflow",
    hint: "Booking confirm + reminder follow-up",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-900",
    rule: {
      name: "Appointment workflow",
      workflowKind: "appointment",
      trigger: "form_submit",
      aiDecide: true,
      tag: "appointment",
      actions: [
        "thank_you_email",
        "notify_email",
        "save_crm",
        "tag_contact",
        "open_conversation",
        "schedule_follow_up",
      ],
      followUpDelayHours: 24,
      followUpOfferMessage:
        "Hi {{name}}, looking forward to seeing you — reply if you need to reschedule.",
      followUpReminderMessage:
        "Hi {{name}}, friendly reminder about your upcoming appointment. Reply if you need a new time.",
      socialMessage:
        "Hi {{name}}, thank you for booking with {{website}}. We look forward to seeing you.",
    },
  },
];

export function mergeAutomationSettings(
  raw?: Partial<AutomationSettings> | null,
): AutomationSettings {
  if (!raw) return structuredClone(DEFAULT_AUTOMATION);

  const byProvider = new Map<SocialProvider, SocialAccount>();
  if (Array.isArray(raw.socialAccounts)) {
    for (const row of raw.socialAccounts) {
      const merged = mergeSocialAccount(row as Partial<SocialAccount>);
      byProvider.set(merged.provider, merged);
    }
  }
  const socialAccounts = SOCIAL_PROVIDERS.map(
    (p) => byProvider.get(p.id) ?? emptySocialAccount(p.id),
  );

  const rules = Array.isArray(raw.rules)
    ? raw.rules.map((r) => newAutomationRule(r as Partial<AutomationRule>))
    : [];

  return {
    enabled: Boolean(raw.enabled),
    defaultWebhookUrl: str(raw.defaultWebhookUrl),
    defaultNotifyEmail: str(raw.defaultNotifyEmail).toLowerCase(),
    missedChatMinutes: Math.max(
      5,
      Math.min(240, Number(raw.missedChatMinutes) || 15),
    ),
    socialAccounts,
    rules,
  };
}

export function automationConfigScore(settings: AutomationSettings): number {
  let score = 0;
  if (settings.enabled) score += 25;
  if (settings.rules.length > 0) score += 20;
  if (settings.rules.some((r) => r.enabled)) score += 20;
  if (settings.defaultWebhookUrl || settings.defaultNotifyEmail) score += 10;
  if (settings.rules.some((r) => r.actions.length > 0)) score += 10;
  const social = connectedSocialCount(settings);
  if (social > 0) score += Math.min(15, social * 5);
  return Math.min(100, score);
}

export function automationStatusLabel(settings: AutomationSettings): {
  label: string;
  tone: string;
} {
  if (!settings.enabled) return { label: "Off", tone: "text-muted" };
  const active = settings.rules.filter((r) => r.enabled).length;
  if (active === 0) return { label: "No rules on", tone: "text-warn" };
  return { label: `${active} live`, tone: "text-ok" };
}

export function triggerMeta(id: AutomationTrigger) {
  return AUTOMATION_TRIGGERS.find((t) => t.id === id) ?? AUTOMATION_TRIGGERS[0]!;
}

export function actionMeta(id: AutomationAction) {
  return AUTOMATION_ACTIONS.find((a) => a.id === id) ?? AUTOMATION_ACTIONS[0]!;
}

export function needsSocialTargets(actions: AutomationAction[]): boolean {
  return (
    actions.includes("post_social") ||
    actions.includes("reply_social") ||
    actions.includes("notify_whatsapp")
  );
}
