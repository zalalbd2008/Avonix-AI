/**
 * Context-aware CTA button trigger engine (ADR-009).
 *
 * Groups own placement + page targeting; buttons own action + style + conditions.
 * Rules live in jsonb so the engine can grow without a migration per rule.
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

export type CtaStatus = "draft" | "published" | "archived";

export type CtaPlacement =
  | "footer_mobile"
  | "footer_tablet"
  | "floating"
  | "inline";

export type CtaPriority = "highest" | "high" | "medium" | "low";

export type CtaFrequency =
  | "always"
  | "once_session"
  | "once_day"
  | "once_week"
  | "once_user";

export type CtaActionType =
  | "open_url"
  | "phone"
  | "sms"
  | "email"
  | "whatsapp"
  | "messenger"
  | "telegram"
  | "live_chat"
  | "ai_chat"
  | "open_form"
  | "open_popup"
  | "open_modal"
  | "scroll_to"
  | "scroll_top"
  | "scroll_bottom"
  | "download"
  | "share"
  | "copy_link"
  | "print"
  | "javascript"
  | "deep_link"
  | "maps"
  | "workflow"
  | "pixel_event"
  | "custom";

export type CtaPageTarget = {
  mode: "everywhere" | "include" | "exclude";
  /** Path rules: contains | equals | starts_with | ends_with | regex */
  rules?: Array<{
    op: "contains" | "equals" | "starts_with" | "ends_with" | "regex";
    value: string;
  }>;
  /** Named WP surfaces */
  surfaces?: Array<
    | "homepage"
    | "blog"
    | "single_post"
    | "shop"
    | "product"
    | "cart"
    | "checkout"
    | "account"
    | "404"
  >;
  excludePaths?: string[];
};

export type CtaDisplayConditions = {
  devices?: Array<"desktop" | "tablet" | "mobile">;
  minWidth?: number;
  maxWidth?: number;
  orientation?: "portrait" | "landscape";
  loggedIn?: "any" | "guest" | "user";
  delayMs?: number;
  scrollPercent?: number;
  exitIntent?: boolean;
  schedule?: {
    startAt?: string;
    endAt?: string;
    weekdays?: number[];
  };
  utm?: { source?: string; medium?: string; campaign?: string };
  cookie?: { name: string; present: boolean };
};

export type CtaAction = {
  type: CtaActionType;
  url?: string;
  phone?: string;
  email?: string;
  message?: string;
  formId?: string;
  popupId?: string;
  selector?: string;
  js?: string;
  newTab?: boolean;
  pixelEvent?: string;
};

/** Nexus Smart Button hover effects. */
export type CtaHoverEffect =
  | "none"
  | "glow"
  | "lift"
  | "scale"
  | "shake"
  | "rotate"
  | "darken";

/**
 * Button visual style — Design Studio tokens (ButtonDesign) or legacy flat fields.
 * jsonb; prefer mergeButtonDesign() when reading.
 */
export type CtaStyle = {
  // Studio nested tokens (optional when fully migrated)
  presetId?: string;
  layout?: Record<string, unknown>;
  typography?: Record<string, unknown>;
  icon?: Record<string, unknown>;
  colors?: Record<string, unknown>;
  border?: string | Record<string, unknown>;
  shadow?: boolean | Record<string, unknown>;
  hover?: Record<string, unknown>;
  animation?:
    | "none"
    | "pulse"
    | "bounce"
    | "fade"
    | "scale"
    | "glow"
    | "ripple"
    | "float"
    | Record<string, unknown>;
  visibility?: Record<string, unknown>;
  badge?: Record<string, unknown>;
  notification?: Record<string, unknown>;
  tooltip?: Record<string, unknown>;
  a11y?: Record<string, unknown>;
  liveChat?: Record<string, unknown>;
  customCss?: string;
  // Legacy Smart Button / FAB fields
  variant?:
    | "icon"
    | "text"
    | "icon_text"
    | "pill"
    | "circle"
    | "fab"
    | "dock";
  size?: "sm" | "md" | "lg";
  bg?: string;
  text?: string;
  color?: string;
  radius?: number | string;
  paddingVertical?: number | string;
  paddingHorizontal?: number | string;
  hoverEffect?: CtaHoverEffect | string;
  fontSize?: number;
  displayMode?: "inline" | "block";
  glass?: boolean;
  customClass?: string;
};

export type CtaButtonPayload = {
  label: string;
  subtitle?: string;
  ariaLabel?: string;
  tooltip?: string;
  badge?: string;
  /** Smart Button icon key: none | call | mail | message | … */
  iconKey: string;
  iconPack?: string;
  presetId?: string;
  /** Popup / manual-click event id (Nexus `eventName`) */
  eventName?: string;
  action: CtaAction;
  style?: CtaStyle;
  conditions?: CtaDisplayConditions;
  analyticsId?: string;
  trackingId?: string;
  sortOrder?: number;
};

export type CtaGroupSettings = {
  placement: {
    mobile: CtaPlacement;
    tablet: CtaPlacement;
    desktop: CtaPlacement;
  };
  pageTarget: CtaPageTarget;
  priority: CtaPriority;
  frequency: CtaFrequency;
  maxVisible?: number;
  collapseToFab?: boolean;
  safeArea?: boolean;
  hideOnKeyboard?: boolean;
  styleTheme?:
    | "dock"
    | "pill"
    | "glass"
    | "material"
    | "liquid"
    | "custom";
  /**
   * When this group matches the current page, stop evaluating lower-priority
   * groups (exclusive footer set for that page).
   */
  exclusive?: boolean;
};

export const ctaButtonGroups = pgTable(
  "cta_button_groups",
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
    status: text("status").$type<CtaStatus>().notNull().default("draft"),
    priorityRank: integer("priority_rank").notNull().default(100),
    settings: jsonb("settings")
      .$type<CtaGroupSettings>()
      .notNull()
      .default({
        placement: {
          mobile: "footer_mobile",
          tablet: "footer_tablet",
          desktop: "floating",
        },
        pageTarget: { mode: "everywhere" },
        priority: "medium",
        frequency: "always",
        maxVisible: 4,
        collapseToFab: true,
        safeArea: true,
      }),
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
    index("cta_button_groups_agency_idx").on(t.agencyId),
    index("cta_button_groups_website_idx").on(t.websiteId, t.status),
  ],
);

export const ctaButtons = pgTable(
  "cta_buttons",
  {
    ...primaryId,
    agencyId: agencyId(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => ctaButtonGroups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status").$type<CtaStatus>().notNull().default("published"),
    sortOrder: integer("sort_order").notNull().default(0),
    isEnabled: boolean("is_enabled").notNull().default(true),
    payload: jsonb("payload").$type<CtaButtonPayload>().notNull(),
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
    index("cta_buttons_agency_idx").on(t.agencyId),
    index("cta_buttons_group_idx").on(t.groupId, t.sortOrder),
  ],
);

export type CtaButtonGroup = typeof ctaButtonGroups.$inferSelect;
export type CtaButton = typeof ctaButtons.$inferSelect;

/** Same destination model as Form / Popup template libraries. */
export type CtaTemplateScope =
  | "website"
  | "organization"
  | "personal"
  | "team"
  | "global";

export type CtaTemplateStatus = "draft" | "published" | "archived";

export type CtaTemplateVisibility =
  | "private"
  | "organization"
  | "team"
  | "public";

export type CtaTemplateCategory =
  | "call"
  | "chat"
  | "form"
  | "link"
  | "social"
  | "offer"
  | "other";

/**
 * Reusable CTA button designs — cloud + website-local scopes.
 * Payload is a button snapshot (action ids like formId/popupId cleared).
 */
export const ctaButtonTemplates = pgTable(
  "cta_button_templates",
  {
    ...primaryId,
    agencyId: agencyId(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").$type<CtaTemplateCategory>(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    payload: jsonb("payload").$type<CtaButtonPayload>().notNull(),

    scope: text("scope")
      .$type<CtaTemplateScope>()
      .notNull()
      .default("organization"),
    status: text("status")
      .$type<CtaTemplateStatus>()
      .notNull()
      .default("published"),
    visibility: text("visibility")
      .$type<CtaTemplateVisibility>()
      .notNull()
      .default("organization"),

    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "set null",
    }),
    teamId: text("team_id"),
    sourceButtonId: uuid("source_button_id"),

    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index("cta_button_templates_agency_idx").on(t.agencyId),
    index("cta_button_templates_scope_idx").on(t.agencyId, t.scope, t.status),
    index("cta_button_templates_website_idx").on(t.websiteId),
  ],
);

export type CtaButtonTemplate = typeof ctaButtonTemplates.$inferSelect;
export type NewCtaButtonTemplate = typeof ctaButtonTemplates.$inferInsert;
