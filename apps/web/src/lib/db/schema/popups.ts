/**
 * Enterprise Popup Engine (ADR-010).
 *
 * Types + trigger/audience/frequency live in jsonb so rules grow without
 * a migration per condition. WP connector evaluates published rows client-side.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { primaryId, softDelete, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { clients } from "./clients";
import { websites } from "./websites";
import { user } from "./auth";

export type PopupStatus = "draft" | "published" | "scheduled" | "archived";

/** Purpose taxonomy (General → Category). */
export type PopupCategory =
  | "lead"
  | "offer"
  | "welcome"
  | "coupon"
  | "survey"
  | "newsletter"
  | "appointment"
  | "exit"
  | "announcement"
  | "custom";

/** Trigger / template intent (library filter). */
export type PopupType =
  | "welcome"
  | "exit_intent"
  | "scroll"
  | "time_delay"
  | "inactivity"
  | "lead_capture"
  | "appointment"
  | "coupon"
  | "newsletter"
  | "chat"
  | "survey"
  | "multi_step"
  | "custom";

export type PopupPriority =
  | "emergency"
  | "critical"
  | "campaign"
  | "lead_generation"
  | "newsletter"
  | "announcement"
  | "welcome";

export type PopupFrequencyMode =
  | "always"
  | "once"
  | "every_session"
  | "once_daily"
  | "once_weekly"
  | "once_monthly"
  | "never_repeat";

/** Visual chrome / placement (General → Popup Type in UX). */
export type PopupLayout =
  | "center_modal"
  | "floating_box"
  | "slide_left"
  | "slide_right"
  | "bottom_bar"
  | "top_bar"
  | "drawer"
  | "fullscreen"
  | "full_overlay"
  | "floating_bubble"
  | "sticky_card"
  | "floating_card"
  | "slide_in";

export type PopupSize = "sm" | "md" | "lg" | "fullscreen";

export type PopupButtonAction =
  | "open_form"
  | "close_popup"
  | "open_url"
  | "scroll"
  | "call"
  | "whatsapp"
  | "messenger"
  | "live_chat"
  | "download"
  | "copy_coupon"
  | "next_step"
  | "previous_step"
  | "submit_form"
  | "book_appointment"
  | "trigger_automation"
  | "run_webhook"
  | "open_popup"
  | "custom_url"
  | "claim_offer"
  | "subscribe"
  | "close";

export type PopupButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "gradient"
  | "floating"
  | "icon"
  | "split"
  | "loading";

export type PopupButton = {
  id: string;
  label: string;
  variant?: PopupButtonVariant;
  action: PopupButtonAction;
  url?: string;
  phone?: string;
  formId?: string;
  popupId?: string;
  webhookUrl?: string;
};

/** Page / path targeting — same spirit as CTA pageTarget. */
export type PopupPageTarget = {
  mode: "everywhere" | "include" | "exclude";
  surfaces?: Array<
    | "homepage"
    | "blog"
    | "single_post"
    | "shop"
    | "product"
    | "cart"
    | "checkout"
    | "account"
    | "landing"
    | "sales"
    | "category"
    | "404"
    | "search"
    | "author"
    | "archive"
  >;
  rules?: Array<{
    op: "contains" | "equals" | "starts_with" | "ends_with" | "regex";
    value: string;
  }>;
  /** Always suppress on these path fragments */
  excludePaths?: string[];
};

/** §2 Trigger conditions (when to fire) */
export type PopupTriggers = {
  onLoad?: boolean;
  exitIntent?: { desktop?: boolean; mobileBack?: boolean; closeTab?: boolean };
  scrollPercent?: number[];
  delayMs?: number[];
  inactivityMs?: number[];
  inactivityKinds?: Array<"movement" | "click" | "scroll">;
  clickSelectors?: string[];
  elementVisibility?: string[];
};

/** §2 Audience / context filters */
export type PopupAudience = {
  pageTarget: PopupPageTarget;
  visitorTypes?: Array<
    | "new"
    | "returning"
    | "logged_in"
    | "guest"
    | "customer"
    | "subscriber"
    | "administrator"
  >;
  devices?: Array<"desktop" | "tablet" | "mobile">;
  browsers?: Array<"chrome" | "firefox" | "safari" | "edge" | "other">;
  os?: Array<"windows" | "mac" | "android" | "iphone" | "linux" | "other">;
  screen?: Array<"desktop" | "large" | "mobile">;
  countries?: string[];
  states?: string[];
  cities?: string[];
  languages?: string[];
  timeOfDay?: Array<"morning" | "afternoon" | "night" | "business_hours">;
  weekdays?: number[];
  dateRange?: { startAt?: string; endAt?: string };
  holidays?: string[];
  referrers?: Array<
    | "google"
    | "facebook"
    | "instagram"
    | "linkedin"
    | "direct"
    | "email"
    | "other"
  >;
  utm?: { source?: string; medium?: string; campaign?: string };
  trafficSources?: Array<"organic" | "paid" | "referral" | "social" | "email">;
  visitCount?: { min?: number; max?: number; exact?: number };
  sessionDurationMs?: { min?: number };
  cart?: Array<"has_product" | "empty" | "abandoned">;
  purchase?: Array<"purchased" | "not_purchased">;
  form?: Array<"started" | "completed" | "abandoned">;
};

/** §3 Frequency */
export type PopupFrequency = {
  mode: PopupFrequencyMode;
  maxPerDay?: number;
  maxPerSession?: number;
};

/** §5 Conflicts */
export type PopupConflicts = {
  suppressIfChatOpen?: boolean;
  suppressIfFormOpen?: boolean;
  waitIfVideoPlaying?: boolean;
  delayIfTypingMs?: number;
  ifOtherActive?: "queue" | "replace" | "skip";
};

/** How body content is arranged inside the card (not chrome: modal/drawer). */
export type PopupContentGrid = {
  /** stack · media_split · banner_split · header_band · multi_column */
  mode?:
    | "stack"
    | "media_split"
    | "banner_split"
    | "header_band"
    | "multi_column";
  align?: "left" | "center" | "right";
  mediaSide?: "left" | "right";
  /** Media column width % for media_split. Default 48. */
  mediaWidthPercent?: number;
  /** Body column count for multi_column mode (2 or 3). */
  columnCount?: 2 | 3;
  stackOnMobile?: boolean;
  gap?: number;
};

export type PopupTheme = {
  backgroundColor?: string;
  textColor?: string;
  mediaBackgroundColor?: string;
  /**
   * Solid background for the title/header strip (headline + description).
   * Independent from the form body (`backgroundColor`).
   */
  headerBackgroundColor?: string;
  /** header_band: gradient start · banner_split: top color */
  splitTopColor?: string;
  /** header_band: gradient end · banner_split: bottom color */
  splitBottomColor?: string;
  buttonBackground?: string;
  buttonTextColor?: string;
  buttonBorderColor?: string;
  buttonRadius?: number;
  /** Primary CTA height in px (padding derived). Default 44. */
  buttonHeight?: number;
  /** Primary CTA label font size in px. Default 14. */
  buttonFontSize?: number;
  secondaryLinkColor?: string;
  /** Close button fill (header_band defaults to red). */
  closeBackground?: string;
  closeColor?: string;
  closeHoverBackground?: string;
  closeHoverColor?: string;
  /** Close button diameter in px (default 30). */
  closeSize?: number;
  /** Glyph inside the close control. */
  closeIcon?: "x" | "x_bold" | "plus" | "circle_x";
  /** Entrance / idle animation on the close icon. */
  closeAnimation?: "none" | "spin" | "pulse" | "bounce" | "fade";
  /** Animation when hovering the close button. */
  closeHoverAnimation?: "none" | "spin" | "scale" | "rotate" | "pulse";
};

/** §7–8 Design + content */
export type PopupDesign = {
  layout: PopupLayout;
  size: PopupSize;
  animation?:
    | "fade"
    | "scale"
    | "zoom"
    | "slide"
    | "bounce"
    | "spring"
    | "rotate"
    | "flip"
    | "elastic"
    | "morph";
  closeAnimation?: "fade" | "slide" | "shrink" | "rotate" | "scale";
  animationDurationMs?: number;
  animationDelayMs?: number;
  overlay?:
    | "blur"
    | "dark"
    | "light"
    | "gradient"
    | "glass"
    | "image"
    | "video"
    | "noise"
    | "none";
  overlayOpacity?: number;
  width?: number;
  maxWidth?: number;
  padding?: number;
  radius?: number;
  shadow?: boolean;
  glass?: boolean;
  backdropBlur?: boolean;
  customCss?: string;
  /** Google Fonts family name (CDN). Empty / system = site default. */
  googleFont?: string;
  /** Optional heading Google Font; falls back to googleFont / site. */
  headingFont?: string;
  /** Inner composition grid (stack / media split / banner split). */
  grid?: PopupContentGrid;
  /** Section colors & button chrome. */
  theme?: PopupTheme;
  /** Optional min height for square / banner layouts. */
  minHeight?: number;
};

export type PopupCtaAction = PopupButtonAction;

export type PopupTextStyle = {
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  align?: "left" | "center" | "right";
  /** Google Fonts family name (CDN link — not self-hosted). */
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
};

export type PopupContent = {
  headline?: string;
  description?: string;
  richDescription?: string;
  headlineStyle?: PopupTextStyle;
  descriptionStyle?: PopupTextStyle;
  imageUrl?: string;
  videoUrl?: string;
  youtubeUrl?: string;
  vimeoUrl?: string;
  lottieUrl?: string;
  iconKey?: string;
  logoUrl?: string;
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  primaryCta?: { label: string; action: PopupCtaAction; url?: string; phone?: string };
  secondaryCta?: { label: string; action: PopupCtaAction; url?: string };
  /** Primary embedded form from Form Builder */
  formId?: string;
  /** Extra forms (steps / conditional) */
  formIds?: string[];
  formStyleMode?: "inherit" | "override";
  /**
   * When a form is attached: hide Form Builder nav buttons (Send / Save draft)
   * and use the popup primary CTA instead (typically action = submit_form).
   */
  replaceFormButtons?: boolean;
  /**
   * Third-party / external form URL (Typeform, Google Forms, Jotform, CF7 page…).
   * Used when `formId` is empty — WP renders an iframe. Avonix Form Builder
   * links should be resolved to `formId` instead (native HTML embed).
   */
  formEmbedUrl?: string;
  couponCode?: string;
  couponExpiry?: string;
  discountLabel?: string;
  countdownEndsAt?: string;
  steps?: Array<{ title: string; body?: string; fields?: string[]; formId?: string }>;
  surveyKind?: "nps" | "emoji" | "feedback";
  appointmentVertical?: string;
  calendarEmbedUrl?: string;
  socialProof?: { reviews?: number; stars?: number; logos?: string[] };
  scarcityText?: string;
  liveVisitors?: boolean;
};

export type PopupComponent = {
  id: string;
  kind: string;
  props?: Record<string, unknown>;
  /**
   * Nested blocks. Used by `columns` (holds `column` children) and `column`
   * (holds content blocks). Enables column-in-column layouts.
   */
  children?: PopupComponent[];
  /** Optional 1–12 span inside a parent columns row. */
  colSpan?: number;
  hiddenOn?: Array<"desktop" | "tablet" | "mobile">;
};

export type PopupSchedule = {
  startAt?: string;
  endAt?: string;
  timezone?: string;
  businessHoursOnly?: boolean;
  weekendsOnly?: boolean;
  holidays?: string[];
};

export type PopupBehavior = {
  onSubmit?: Array<
    | "close"
    | "success_message"
    | "thank_you_popup"
    | "redirect"
    | "automation"
    | "open_popup"
  >;
  successMessage?: string;
  redirectUrl?: string;
  thankYouPopupId?: string;
  openPopupId?: string;
};

/** §10 Close rules */
export type PopupCloseRules = {
  showCloseButton?: boolean;
  esc?: boolean;
  clickOutside?: boolean;
  autoCloseMs?: number;
  neverClose?: boolean;
  delayedCloseMs?: number;
  countdownBeforeCloseMs?: number;
  swipeDown?: boolean;
  backButton?: boolean;
};

export type PopupPayload = {
  slug?: string;
  category?: PopupCategory;
  type: PopupType;
  priority: PopupPriority;
  priorityRank: number;
  triggers: PopupTriggers;
  audience: PopupAudience;
  frequency: PopupFrequency;
  conflicts: PopupConflicts;
  design: PopupDesign;
  content: PopupContent;
  buttons?: PopupButton[];
  components?: PopupComponent[];
  schedule?: PopupSchedule;
  behavior?: PopupBehavior;
  close: PopupCloseRules;
  analyticsId?: string;
  abTestKey?: string;
  publishedAt?: string;
  languages?: string[];
  devices?: Array<"desktop" | "tablet" | "mobile">;
  automation?: {
    webhookUrl?: string;
    slackWebhook?: string;
    tags?: string[];
    assignUser?: string;
    notifyEmail?: string;
    onSubmitZapier?: boolean;
  };
};

export const popups = pgTable(
  "popups",
  {
    ...primaryId,
    agencyId: agencyId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").$type<PopupType>().notNull().default("welcome"),
    status: text("status").$type<PopupStatus>().notNull().default("draft"),
    priorityRank: integer("priority_rank").notNull().default(100),
    isEnabled: boolean("is_enabled").notNull().default(true),
    payload: jsonb("payload").$type<PopupPayload>().notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("popups_agency_idx").on(t.agencyId),
    index("popups_website_idx").on(t.websiteId, t.status),
    index("popups_website_type_idx").on(t.websiteId, t.type),
  ],
);

export type Popup = typeof popups.$inferSelect;
export type NewPopup = typeof popups.$inferInsert;

/** Same destination model as Form Template Library (ADR-007). */
export type PopupTemplateScope =
  | "website"
  | "organization"
  | "personal"
  | "team"
  | "global";

export type PopupTemplateStatus =
  | "draft"
  | "published"
  | "archived";

export type PopupTemplateVisibility =
  | "private"
  | "organization"
  | "team"
  | "public";

/**
 * Reusable popup experiences — cloud + local (website) scopes.
 * Payload is a snapshot; formId cleared for portability across sites.
 */
export const popupTemplates = pgTable(
  "popup_templates",
  {
    ...primaryId,
    agencyId: agencyId(),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").$type<PopupType>().notNull().default("custom"),
    category: text("category").$type<PopupCategory>(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    payload: jsonb("payload").$type<PopupPayload>().notNull(),

    scope: text("scope")
      .$type<PopupTemplateScope>()
      .notNull()
      .default("organization"),
    status: text("status")
      .$type<PopupTemplateStatus>()
      .notNull()
      .default("published"),
    visibility: text("visibility")
      .$type<PopupTemplateVisibility>()
      .notNull()
      .default("organization"),

    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "set null",
    }),
    teamId: text("team_id"),
    sourcePopupId: uuid("source_popup_id"),

    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index("popup_templates_agency_idx").on(t.agencyId),
    index("popup_templates_agency_type_idx").on(t.agencyId, t.type),
    index("popup_templates_scope_idx").on(t.agencyId, t.scope, t.status),
    index("popup_templates_website_idx").on(t.websiteId),
  ],
);

export type PopupTemplate = typeof popupTemplates.$inferSelect;
export type NewPopupTemplate = typeof popupTemplates.$inferInsert;
