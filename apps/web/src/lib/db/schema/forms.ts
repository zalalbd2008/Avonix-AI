import { boolean, index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { softDelete, primaryId, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { clients } from "./clients";
import { contacts } from "./contacts";
import { websites } from "./websites";

/** Operators for show/hide rules (Fluent Forms-style conditional logic). */
export type FormConditionOp =
  | "eq"
  | "neq"
  | "empty"
  | "filled"
  | "contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export type FormCondition = {
  fieldKey: string;
  op: FormConditionOp;
  value?: string;
};

export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "number"
  | "date"
  | "url"
  | "hidden"
  | "section"
  | "file"
  | "rating"
  | "signature"
  | "toggle"
  | "range"
  | "recaptcha"
  /** Calendar + time slots (+ optional timezone). */
  | "appointment"
  /** Interactive ROI calculator (investment / months / projected return). */
  | "roi";

/** 12-column span, or legacy / named presets (`full` = 12, `half` = 6, …). */
export type FormFieldWidth =
  | "full"
  | "half"
  | "third"
  | "fourth"
  | "fifth"
  | "sixth"
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12;

export type FormFileConfig = {
  /** Allow selecting more than one file. */
  multiple?: boolean;
  /** HTML accept string — e.g. `image/*,.pdf`. */
  accept?: string;
  /** Max size per file in megabytes. */
  maxSizeMb?: number;
  /** Max number of files when multiple. */
  maxFiles?: number;
  /**
   * Request server-side virus scan when the host supports it.
   * Client still validates type/size locally.
   */
  virusScan?: boolean;
};

/** Booking calendar + slot picker options (type === "appointment"). */
export type FormAppointmentConfig = {
  /** Earliest bookable day offset from today (0 = today). */
  minDaysFromToday?: number;
  /** How many days ahead can be booked. */
  maxDaysAhead?: number;
  /** Available weekdays — 0=Sun … 6=Sat. */
  weekdays?: number[];
  /** Slot start times as `HH:mm` (24h). */
  slots?: string[];
  /** Slot length in minutes (display / future hold). */
  slotDurationMin?: number;
  /** Show timezone control (auto-detect + override). */
  showTimezone?: boolean;
};

/** ROI calculator defaults (type === "roi"). */
export type FormRoiConfig = {
  currency?: string;
  defaultInvestment?: number;
  defaultMonths?: number;
  /** Assumed return multiple of investment (e.g. 2.5 = 250%). */
  returnMultiple?: number;
  labelInvestment?: string;
  labelMonths?: string;
  labelReturn?: string;
};

/** Layout for radio / multiselect / checkbox option groups. */
export type FormChoiceLayout =
  | "vertical"
  | "horizontal"
  | "inline"
  | "wrap"
  | "grid"
  | "masonry";

/** Visual presentation for choice options. */
export type FormChoiceStyle =
  | "default"
  | "button"
  | "tile"
  | "card"
  | "image"
  | "icon"
  | "pricing"
  | "service"
  | "product";

/** Dropdown presentation variants. */
export type FormSelectVariant =
  | "standard"
  | "searchable"
  | "chips"
  | "tags";

/** Rich option for image / icon / card choices. */
export type FormOptionItem = {
  value: string;
  label: string;
  description?: string;
  imageUrl?: string;
  /** Emoji or short glyph. */
  icon?: string;
  /** Display price string (e.g. "$1.2k"). */
  price?: string;
  /** Numeric amount for live pricing estimates. */
  amount?: number;
  /** Points contributed when this option is selected. */
  score?: number;
};

export type FormChoiceConfig = {
  layout?: FormChoiceLayout;
  style?: FormChoiceStyle;
  selectVariant?: FormSelectVariant;
  /** Columns when layout is grid / masonry / image cards. */
  columns?: 2 | 3 | 4;
  gap?: number;
};

/** Per-field label placement (overrides theme when not inherit). */
export type FormLabelPosition =
  | "inherit"
  | "top"
  | "left"
  | "right"
  | "hidden"
  | "floating";

/** Where help text appears relative to the control. */
export type FormDescriptionPosition =
  | "below"
  | "above"
  | "tooltip"
  | "info"
  | "accordion";

/** Placeholder behavior for this field. */
export type FormPlaceholderMode =
  | "inherit"
  | "enabled"
  | "disabled"
  | "animated"
  | "floating";

/** Alignment of the field block inside its grid cell. */
export type FormFieldAlign = "stretch" | "start" | "center" | "end";

/**
 * Label / description / placeholder / position overrides for one field.
 * Theme supplies form-wide defaults; this is the per-field override layer.
 */
export type FormFieldCaption = {
  labelPosition?: FormLabelPosition;
  descriptionPosition?: FormDescriptionPosition;
  placeholderMode?: FormPlaceholderMode;
  align?: FormFieldAlign;
  /** Stick while the form shell scrolls. */
  sticky?: boolean;
};

/** Visual chrome around a field or section body. */
export type FormContainerVariant =
  | "none"
  | "card"
  | "glass"
  | "border"
  | "shadow";

export type FormFieldContainer = {
  variant?: FormContainerVariant;
  hover?: boolean;
  padding?: number;
  radius?: number;
  background?: string;
  borderColor?: string;
};

/** Section-only controls (type === "section"). */
export type FormSectionConfig = {
  collapsible?: boolean;
  /** Initial collapsed state when collapsible. */
  collapsed?: boolean;
  /** Show bottom divider under the heading. */
  divider?: boolean;
  background?: string;
  container?: FormFieldContainer;
};

export type FormRowAlign = "start" | "center" | "end" | "stretch";

/** Named row of fields sharing layout alignment. */
export type FormRowConfig = {
  id: string;
  /**
   * Layout engine for this row.
   * - `grid` (default): strict 12-col tracks
   * - `flex`: percentage flex-basis from spans; wraps when overflowing (unlimited cols)
   */
  mode?: "grid" | "flex";
  /** Flex only — allow wrapping onto new lines (default true). */
  wrap?: boolean;
  equalHeight?: boolean;
  alignY?: FormRowAlign;
  alignX?: "start" | "center" | "end" | "stretch";
  gap?: number;
};

export type FormField = {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  /** Flat option values (backward compatible). */
  options?: string[];
  /** Rich options for image / icon / card choices. */
  optionItems?: FormOptionItem[];
  /** Checkbox / radio / select presentation. */
  choiceConfig?: FormChoiceConfig;
  placeholder?: string;
  /** Help / description text. */
  description?: string;
  /** Label, placeholder, description, and field position. */
  caption?: FormFieldCaption;
  /**
   * Desktop column span on the 12-col grid.
   * Legacy: `"full"` | `"half"`. Also accepts 1–12 and fraction presets.
   */
  width?: FormFieldWidth;
  /** Tablet override (≤960px). Falls back to `width`. */
  widthTablet?: FormFieldWidth;
  /** Mobile override (≤640px). Defaults to full width when unset. */
  widthMobile?: FormFieldWidth;
  /** Prevent width edits in the builder. */
  lockWidth?: boolean;
  /** Shared row id — consecutive fields with the same id form a row. */
  rowId?: string;
  /** Card / glass / border / shadow chrome. */
  container?: FormFieldContainer;
  /** Section heading behavior (type === "section"). */
  sectionConfig?: FormSectionConfig;
  /** File upload options (type === "file"). */
  fileConfig?: FormFileConfig;
  /** Calendar / slots / timezone (type === "appointment"). */
  appointmentConfig?: FormAppointmentConfig;
  /** ROI calculator defaults (type === "roi"). */
  roiConfig?: FormRoiConfig;
  /** Which multi-step page this field belongs to. */
  stepId?: string;
  /** Show this field only when the rule matches (empty = always). */
  condition?: FormCondition;
  /**
   * When set, field is required only if this condition matches
   * (overrides static `required` while visible).
   */
  requiredWhen?: FormCondition;
  /** Builder: prevent drag, delete, and structural edits. */
  locked?: boolean;
  /** Builder: keep near the top of its step when sorting. */
  pinned?: boolean;
};

export type FormStep = {
  id: string;
  title: string;
};

/** @deprecated Flat v0 theme — upgraded via upgradeToTheme(). Prefer FormTheme. */
export type FormAppearance = {
  primaryColor: string;
  buttonTextColor: string;
  labelColor: string;
  inputTextColor: string;
  inputBg: string;
  inputBorder: string;
  formBg: string;
  fontFamily: string;
  fontSize: number;
  labelSize: number;
  fieldGap: number;
  rowGap: number;
  inputRadius: number;
  inputPaddingY: number;
  inputPaddingX: number;
};

/**
 * Visual design system payload. Stored in settings.appearance (jsonb).
 * Shape is FormTheme (v1); legacy flat FormAppearance is upgraded on read.
 */
export type FormConfirmationAction = "message" | "redirect";

/** After-submit rule — first matching conditional wins; default has no condition. */
export type FormConfirmationRule = {
  id: string;
  condition?: FormCondition;
  action: FormConfirmationAction;
  message?: string;
  redirectUrl?: string;
  /** Show the success screen briefly before redirecting. */
  showBeforeRedirect?: boolean;
};

export type FormConfirmation = {
  rules: FormConfirmationRule[];
};

/** Timeline item on the animated success screen. */
export type FormSubmissionNextStep = {
  id: string;
  title: string;
  description?: string;
};

/**
 * Submission experience — success screen chrome beyond plain message/redirect.
 * Stored in settings.submissionUx (jsonb).
 */
export type FormSubmissionUx = {
  /** Use the animated success card (default true). */
  animated?: boolean;
  /** Optional confetti burst on success. */
  confetti?: boolean;
  headline?: string;
  subtext?: string;
  nextStepsTitle?: string;
  nextSteps?: FormSubmissionNextStep[];
  booking?: {
    enabled?: boolean;
    label?: string;
    url?: string;
  };
  proposal?: {
    enabled?: boolean;
    label?: string;
    url?: string;
  };
  /** Delay before redirect when action is redirect (ms). */
  redirectDelayMs?: number;
};

/** Skip to another step when Continue is pressed and the condition matches. */
export type FormSkipRule = {
  id: string;
  condition: FormCondition;
  gotoStepId: string;
};

export type FormScoreConfig = {
  enabled?: boolean;
  showLive?: boolean;
  label?: string;
};

export type FormPricingRule = {
  id: string;
  /** Optional gate — if omitted, always contribute from fieldKey options. */
  condition?: FormCondition;
  fieldKey: string;
  /** Flat add-on when the (optional) condition matches. */
  amount?: number;
  label?: string;
};

/** Promo / coupon for the budget calculator. */
export type FormBudgetDiscount = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  label?: string;
};

export type FormPricingConfig = {
  enabled?: boolean;
  currency?: string;
  baseAmount?: number;
  showLive?: boolean;
  label?: string;
  rules?: FormPricingRule[];
  /** Choice fields whose option amounts count as services. */
  serviceFieldKeys?: string[];
  /** Choice fields whose option amounts count as add-ons. */
  addonFieldKeys?: string[];
  /** Select/text field that overrides display currency. */
  currencyFieldKey?: string;
  /** Allowed currencies when a currency field is used. */
  currencies?: string[];
  /** Text field where respondents enter a discount code. */
  discountFieldKey?: string;
  /** Valid discount codes. */
  discounts?: FormBudgetDiscount[];
  /** Tax percent applied after discount (e.g. 8.5). */
  taxPercent?: number;
  taxLabel?: string;
};

/** Smart logic payload — stored in settings.logic (jsonb). */
export type FormLogicConfig = {
  skipRules?: FormSkipRule[];
  score?: FormScoreConfig;
  pricing?: FormPricingConfig;
};

/** How the respondent moves through fields / pages. */
export type FormFlowMode =
  | "single"
  | "wizard"
  | "conversational"
  | "card"
  | "accordion";

/** Where the form is mounted on the host page. */
export type FormMount = "embedded" | "popup" | "slide_in" | "fullscreen";

export type FormChrome = {
  progress: "none" | "line" | "number" | "circle" | "percentage";
  /** Sidebar only applies to wizard / card modes. */
  progressPlacement: "top" | "sidebar";
  showStepTitles: boolean;
};

/**
 * Structural layout engine — orthogonal to FormTheme visual density.
 * Stored in settings.layout (jsonb).
 */
export type FormLayoutConfig = {
  mode: FormFlowMode;
  mount?: FormMount;
  chrome?: FormChrome;
};

/**
 * Respondent UX polish — stored in settings.ux (jsonb).
 * Theme still owns visual darkMode / a11y tokens; this gates runtime behavior.
 */
export type FormUxConfig = {
  /** Persist answers in localStorage while filling. */
  autoSaveDraft?: boolean;
  /** Show resume banner + Save draft control. */
  allowResume?: boolean;
  /** How long a draft stays valid (days). */
  draftTtlDays?: number;
  /** Keep progress chrome sticky on scroll. */
  stickyProgress?: boolean;
  /** Enter advances multi-step (not inside textarea). */
  enterToContinue?: boolean;
  /** Show a dark-mode toggle when theme dark mode is manual. */
  showDarkToggle?: boolean;
};

/** Client logo in the trust strip. */
export type FormTrustLogo = {
  id: string;
  name: string;
  imageUrl?: string;
  url?: string;
};

export type FormTrustTestimonial = {
  id: string;
  quote: string;
  author: string;
  role?: string;
  rating?: number;
};

export type FormTrustBadge = {
  id: string;
  label: string;
  /** Short glyph / emoji. */
  icon?: string;
};

/**
 * Trust section — logos, social proof, security badges, GDPR.
 * Stored in settings.trust (jsonb).
 */
export type FormTrustConfig = {
  enabled?: boolean;
  placement?: "above" | "below" | "both";
  title?: string;
  logos?: FormTrustLogo[];
  testimonials?: FormTrustTestimonial[];
  rating?: {
    value?: number;
    count?: number;
    label?: string;
  };
  badges?: FormTrustBadge[];
  gdprNotice?: string;
  privacySummary?: string;
  privacyUrl?: string;
};

export type FormLeadPriority = "low" | "normal" | "high" | "urgent";

export type FormCrmStatusOption = {
  id: string;
  label: string;
  color?: string;
};

/**
 * Admin CRM defaults for this form — status workflow, tags, notifications.
 * Stored in settings.admin (jsonb).
 */
export type FormAdminCrmConfig = {
  enabled?: boolean;
  defaultPriority?: FormLeadPriority;
  defaultStatusId?: string;
  statuses?: FormCrmStatusOption[];
  /** Suggested tags shown in the lead panel. */
  tagPresets?: string[];
  /** Default assignee label (email or name) for new leads. */
  defaultAssignee?: string;
  notifications?: {
    /** Extra inboxes beyond settings.notificationEmail. */
    emails?: string[];
    slackWebhookUrl?: string;
    teamsWebhookUrl?: string;
    webhookUrl?: string;
  };
};

export type FormCrmTimelineEvent = {
  id: string;
  at: string;
  type:
    | "created"
    | "status"
    | "priority"
    | "note"
    | "tag"
    | "assign"
    | "notify";
  message: string;
  actor?: string;
};

/**
 * Per-submission CRM state — priority, notes, tags, assign, status, timeline.
 * Stored in form_submissions.crm (jsonb).
 */
export type FormSubmissionCrm = {
  priority?: FormLeadPriority;
  statusId?: string;
  tags?: string[];
  assignee?: string;
  notes?: string;
  timeline?: FormCrmTimelineEvent[];
};

/** UTM / attribution captured at view or submit. */
export type FormUtmParams = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

/**
 * Form analytics flags. Stored in settings.analytics (jsonb).
 */
export type FormAnalyticsConfig = {
  enabled?: boolean;
  trackViews?: boolean;
  trackStarts?: boolean;
  trackFieldDropoff?: boolean;
  trackUtm?: boolean;
  trackCompletionTime?: boolean;
};

/**
 * Attribution + timing stored alongside a submission.
 * Stored in form_submissions.meta (jsonb).
 */
export type FormSubmissionMeta = {
  utm?: FormUtmParams;
  referrer?: string;
  pageUrl?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  sessionId?: string;
  /** AI scoring / spam / category / follow-up from Step 19. */
  ai?: FormSubmissionAi;
  /** Agency unique scores (health, complexity, sales probability, …). */
  scores?: FormUniqueScores;
  /** Client portal access token (HMAC-backed, when portal enabled). */
  portalToken?: string;
};

/**
 * Unique agency scores stored on a submission (meta.scores).
 */
export type FormUniqueScores = {
  leadHealth?: number;
  complexity?: number;
  salesProbability?: number;
  clientReadiness?: number;
  budgetRecommendation?: string;
  estimatedDeliveryDays?: number;
  summary?: string;
  roiPercent?: number;
  roiLabel?: string;
};

/**
 * AI analysis stored on a submission (meta.ai).
 */
export type FormSubmissionAi = {
  score?: number;
  spam?: boolean;
  spamReason?: string;
  duplicate?: boolean;
  duplicateOf?: string;
  category?: string;
  followUp?: string;
  rewrittenMessage?: string;
  model?: string;
};

/**
 * Form AI feature flags. Stored in settings.ai (jsonb).
 */
export type FormAiConfig = {
  enabled?: boolean;
  leadScoring?: boolean;
  spamDetection?: boolean;
  duplicateDetection?: boolean;
  categoryDetection?: boolean;
  suggestedFollowUp?: boolean;
  rewriteMessage?: boolean;
  /** Respondent-facing rewrite / autofill in the embed. */
  autofill?: boolean;
  /** Use Claude when ANTHROPIC_API_KEY is set (default on). */
  useLlm?: boolean;
  /** Optional category vocabulary for classification. */
  categories?: string[];
  /** Apply AI score to CRM priority / tags. */
  applyToCrm?: boolean;
};

/**
 * Enterprise form features. Stored in settings.enterprise (jsonb).
 */
export type FormEnterpriseConfig = {
  enabled?: boolean;
  /** Compute Lead Health / complexity / sales probability / readiness. */
  uniqueScores?: boolean;
  /** Attach a short message summary on submit. */
  conversationSummary?: boolean;
  /** Mint a client portal link after submit. */
  clientPortal?: boolean;
  /** Keep version snapshots on save. */
  versioning?: boolean;
  maxVersions?: number;
  /** Append light audit entries on save. */
  auditLog?: boolean;
  /** White-label embed chrome. */
  whiteLabel?: {
    enabled?: boolean;
    brandName?: string;
    logoUrl?: string;
    hideAvonix?: boolean;
  };
  /** Default locale + available locales for i18n strings. */
  i18n?: {
    enabled?: boolean;
    defaultLocale?: string;
    locales?: string[];
  };
  /** Soft role gate hints (enforced in app UI). */
  roles?: {
    requireAdminToPublish?: boolean;
    editorEmails?: string[];
  };
  /** Version snapshots (fields + key settings). */
  versions?: FormVersionSnapshot[];
  /** Recent audit entries. */
  audit?: FormAuditEntry[];
};

export type FormVersionSnapshot = {
  id: string;
  at: string;
  label?: string;
  fieldCount: number;
  /** Compact JSON snapshot of fields + settings (excluding versions/audit). */
  payload: string;
};

export type FormAuditEntry = {
  at: string;
  action: string;
  actor?: string;
  detail?: string;
};

export type FormAnalyticsEventType =
  | "view"
  | "start"
  | "field"
  | "step"
  | "complete"
  | "abandon";

export type FormCaptchaProvider = "none" | "recaptcha_v2" | "turnstile";

/**
 * Bot / abuse protection for a form.
 * Stored in settings.security (jsonb).
 */
export type FormSecurityConfig = {
  /** Hidden field bots fill in. Default on. */
  honeypot?: boolean;
  captcha?: {
    provider?: FormCaptchaProvider;
    /** Public site key (safe to embed). */
    siteKey?: string;
    /** Secret for server verify — agency's own key. */
    secretKey?: string;
  };
  rateLimit?: {
    enabled?: boolean;
    /** Max submissions per IP+form per hour. */
    maxPerHour?: number;
  };
  ipBlock?: {
    mode?: "block" | "allow";
    ips?: string[];
  };
  countryBlock?: {
    mode?: "block" | "allow";
    /** ISO 3166-1 alpha-2 codes. */
    countries?: string[];
  };
  emailVerification?: {
    enabled?: boolean;
    /** Reject common disposable domains. */
    blockDisposable?: boolean;
  };
  otp?: {
    enabled?: boolean;
    /** Code lifetime in minutes (default 10). */
    ttlMinutes?: number;
  };
};

export type FormSettings = {
  steps: FormStep[];
  /** Flow mode, mount shell, and progress chrome. */
  layout?: FormLayoutConfig;
  /** FormTheme (v1) or legacy FormAppearance — upgradeToTheme() normalises. */
  appearance?: Record<string, unknown>;
  /** Named rows for multi-column alignment (fields reference via rowId). */
  rows?: FormRowConfig[];
  /** Skip rules, scoring, and live pricing. */
  logic?: FormLogicConfig;
  /**
   * Agency/client inbox — new submissions are emailed here.
   * Empty = notifications off.
   */
  notificationEmail?: string;
  /** Success message / redirect after submit, with optional conditions. */
  confirmation?: FormConfirmation;
  /** Animated success screen, confetti, next steps, booking / proposal CTAs. */
  submissionUx?: FormSubmissionUx;
  /** Draft/resume, keyboard, sticky progress, dark toggle. */
  ux?: FormUxConfig;
  /** Logos, testimonials, badges, GDPR / privacy (trust strip). */
  trust?: FormTrustConfig;
  /** Admin CRM: workflow, tags, notification channels. */
  admin?: FormAdminCrmConfig;
  /** Views, starts, drop-off, UTM tracking flags. */
  analytics?: FormAnalyticsConfig;
  /** Honeypot, captcha, rate limit, IP/country, email OTP. */
  security?: FormSecurityConfig;
  /** Outbound integrations: webhooks, Zapier/Make/n8n, Sheets, ESP, CRM. */
  integrations?: FormIntegrationsConfig;
  /** AI scoring, spam, category, rewrite, follow-up. */
  ai?: FormAiConfig;
  /** Templates, versioning, white-label, portal, unique scores. */
  enterprise?: FormEnterpriseConfig;
};

export type FormIntegrationProvider =
  | "webhook"
  | "crm"
  | "zapier"
  | "make"
  | "n8n"
  | "google_sheets"
  | "google_drive"
  | "mailchimp"
  | "brevo"
  | "hubspot"
  | "salesforce";

/** One outbound connection fired after a successful submission. */
export type FormIntegrationConnection = {
  id: string;
  provider: FormIntegrationProvider;
  enabled?: boolean;
  label?: string;
  /** HTTPS endpoint (Zapier catch hook, Make, n8n, Apps Script, generic). */
  webhookUrl?: string;
  /** API key / private app token (Mailchimp, Brevo, HubSpot, Salesforce). */
  apiKey?: string;
  /** List / audience / object id where the provider needs one. */
  listId?: string;
  /** Optional form field key → remote property map. */
  fieldMap?: Record<string, string>;
};

/**
 * Post-submit integrations. Stored in settings.integrations (jsonb).
 */
export type FormIntegrationsConfig = {
  enabled?: boolean;
  connections?: FormIntegrationConnection[];
};

/**
 * A form definition. Multi-step + conditional logic live in jsonb so the
 * builder can grow without a table per feature.
 */
export const forms = pgTable(
  "forms",
  {
    ...primaryId,
    agencyId: agencyId(),
    clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, { onDelete: "set null" }),

    name: text("name").notNull(),
    /**
     * Shortcode id per website (1, 2, 3…). Stable — not reused after soft-delete.
     * WordPress: [avonix_form id="1"]
     */
    formNumber: integer("form_number").notNull().default(1),
    fields: jsonb("fields").$type<FormField[]>().notNull().default([]),
    settings: jsonb("settings").$type<FormSettings>().notNull().default({ steps: [] }),
    submitLabel: text("submit_label").notNull().default("Send"),
    successMessage: text("success_message").notNull().default("Thanks — we'll be in touch."),
    isPublished: boolean("is_published").notNull().default(false),

    ...timestamps,
    ...softDelete,
  },
  (t) => [index("forms_client_idx").on(t.clientId)],
);

export const formSubmissions = pgTable(
  "form_submissions",
  {
    ...primaryId,
    agencyId: agencyId(),
    formId: uuid("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    websiteId: uuid("website_id").references(() => websites.id, { onDelete: "set null" }),

    values: jsonb("values").$type<Record<string, unknown>>().notNull(),
    pageUrl: text("page_url"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    /** Priority, notes, tags, assignee, status, activity timeline. */
    crm: jsonb("crm").$type<FormSubmissionCrm>().notNull().default({}),
    /** UTM, timing, session attribution. */
    meta: jsonb("meta").$type<FormSubmissionMeta>().notNull().default({}),

    ...timestamps,
  },
  (t) => [
    index("form_submissions_form_idx").on(t.formId, t.createdAt),
    index("form_submissions_agency_idx").on(t.agencyId),
  ],
);

/**
 * High-volume form funnel events (view / start / field / step / complete / abandon).
 * Never updated — append-only like tracked_events.
 */
export const formAnalyticsEvents = pgTable(
  "form_analytics_events",
  {
    ...primaryId,
    agencyId: agencyId(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "set null",
    }),

    eventType: text("event_type").$type<FormAnalyticsEventType>().notNull(),
    sessionId: text("session_id"),
    fieldKey: text("field_key"),
    stepId: text("step_id"),
    durationMs: integer("duration_ms"),
    pageUrl: text("page_url"),
    utm: jsonb("utm").$type<FormUtmParams>(),

    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("form_analytics_form_idx").on(t.formId, t.createdAt),
    index("form_analytics_type_idx").on(t.formId, t.eventType),
    index("form_analytics_agency_idx").on(t.agencyId),
  ],
);

export type Form = typeof forms.$inferSelect;
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type FormAnalyticsEvent = typeof formAnalyticsEvents.$inferSelect;
