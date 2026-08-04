/**
 * Enterprise Conversational Experience Platform (ADR-011) — P0 foundation.
 *
 * Widget config is cloud-owned jsonb; typed message blocks are the render protocol.
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
import type { CepIndustryExperience } from "@/lib/cep/industry-presets/types";

export type CepWidgetStatus = "draft" | "published" | "archived";
export type CepWidgetSurface = "bubble" | "wizard" | "sidebar" | "modal" | "fullscreen";

/** Typed conversation blocks (ADR-011 §5). Expand without migrations. */
export type CepChatBlock =
  | { type: "plain_text"; text: string }
  | { type: "markdown"; text: string }
  | {
      type: "buttons";
      buttons: Array<{
        id: string;
        label: string;
        action: "send_text" | "open_url" | "transfer_agent" | "start_form";
        value?: string;
      }>;
    }
  /** Form Builder HTML embed (ADR-007) — never a second form system. */
  | {
      type: "lead_form";
      formId: string;
      title?: string;
      /** Pre-rendered embed snippet from Form Builder. */
      html?: string;
    }
  | { type: "system"; text: string }
  | { type: "typing" }
  | {
      type: "sources";
      items: Array<{ url: string; title?: string }>;
    }
  | {
      type: "product_carousel";
      products: Array<{
        id: number;
        title: string;
        url: string;
        image?: string;
        price?: string;
        onSale?: boolean;
        inStock?: boolean;
        addUrl?: string;
        addText?: string;
      }>;
    };

export type CepBubbleShape = "circle" | "rounded_square" | "image" | "gif" | "lottie";

export type CepWidgetTheme = {
  primaryColor?: string;
  /** Gradient end for launcher / accents. Defaults to a lighter mix of primary. */
  primaryColorEnd?: string;
  backgroundColor?: string;
  textColor?: string;
  headerColor?: string;
  linkColor?: string;
  radius?: number;
  fontFamily?: string;
  bubbleShape?: CepBubbleShape;
  bubbleImageUrl?: string;
  position?: "bottom_right" | "bottom_left" | "top_right" | "top_left";
  /** Free placement — % from left/top of the viewport (preferred). */
  leftPercent?: number;
  topPercent?: number;
  offsetX?: number;
  offsetY?: number;
  desktopWidth?: string;
  desktopHeight?: string;
  mobileWidth?: string;
  mobileHeight?: string;
  zIndex?: number;
  launcherLabel?: string;
  /** Circular launcher glyph: typing dots or compose pencil. */
  launcherIcon?: "dots" | "compose";
  /** Icon glyph size in px. */
  launcherIconSize?: number;
  /** Inner padding around the icon in px. */
  launcherPadding?: number;
  /** @deprecated use launcherIconSize + launcherPadding */
  launcherSize?: "sm" | "md" | "lg" | "xl" | { iconSize?: number; buttonPadding?: number };
  onlineIndicator?: boolean;
  pulse?: boolean;
  /** Display name in the chat header. */
  agentName?: string;
  /** Status line under the name. */
  statusText?: string;
  /** Show contact lead gate before AI chat. Default false (Nexus parity). */
  preChatEnabled?: boolean;
  /** Skip home panel and open AI (or lead gate) immediately. */
  openOnLaunch?: boolean;
  /**
   * Required Terms / Privacy agreement screen when the visitor opens chat.
   * Default true — must tap “I Agree” before chat continues.
   */
  agreementRequired?: boolean;
  /** Brand / site name on the agreement card. */
  agreementBrandName?: string;
  /** Optional logo above the brand name. */
  agreementLogoUrl?: string;
  /** Agreement logo display height in px (width follows natural aspect). Range 0–1000. Default 56. */
  agreementLogoSize?: number;
  /** First line under the brand (e.g. “Hi! I am your … Virtual Agent.”). */
  agreementIntro?: string;
  /** Body copy; “Terms of Use” / “Privacy Policy” become links when URLs are set. */
  agreementBody?: string;
  /**
   * Rich HTML for the full agreement copy (title + intro + body).
   * Edited via classic editor — links, colors, bold/italic.
   */
  agreementHtml?: string;
  termsUrl?: string;
  agreeLabel?: string;
  disagreeLabel?: string;
  /** Home panel body copy (before Start Conversation). */
  homeContent?: string;
  startTitle?: string;
  startButtonLabel?: string;
  startHeroImageUrl?: string;
  privacyUrl?: string;
  placeholder?: string;
  /** Online-status blink color on FAB / badge. */
  onlineDotColor?: string;
  /** Soft bot bubble fill. */
  botBubbleColor?: string;
  /** Footer disclaimer under the composer. */
  disclaimer?: string;
  /** Small reply-time line under action cards / above composer. */
  replyEtaText?: string;
  /** Optional click-to-call number shown on booking / contact intents (tel: link). */
  contactPhone?: string;
  /** Optional external booking page (Calendly, etc.). */
  bookingUrl?: string;
};

/** Page visibility — same shape as CTA/Popup pageTarget. */
export type CepPageTarget = {
  mode: "everywhere" | "include" | "exclude";
  rules?: Array<{
    op: "contains" | "equals" | "starts_with" | "ends_with" | "regex";
    value: string;
  }>;
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

export type CepWidgetTriggers = {
  delayMs?: number;
  scrollPercent?: number[];
  exitIntent?: boolean;
  firstVisitorOnly?: boolean;
  returningOnly?: boolean;
  devices?: Array<"desktop" | "tablet" | "mobile">;
  workingHoursOnly?: boolean;
};

export type CepAiProvider =
  | "openrouter"
  | "anthropic"
  | "openai"
  | "google"
  | "mistral"
  | "groq"
  | "azure_openai"
  | "custom_openai";

export type CepAiConfig = {
  /** Default: openrouter (ADR-011). */
  provider?: CepAiProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  fallbackProvider?: CepAiProvider;
  fallbackModel?: string;
  systemPromptOverride?: string;
};

export type CepWidgetModules = {
  leadForm?: boolean;
  appointment?: boolean;
  productCarousel?: boolean;
  transferAgent?: boolean;
  sounds?: boolean;
  /** Progressive token reveal / SSE when available. */
  streaming?: boolean;
};

export type CepWidgetPayload = {
  surface?: CepWidgetSurface;
  title?: string;
  greeting?: string;
  placeholder?: string;
  theme?: CepWidgetTheme;
  triggers?: CepWidgetTriggers;
  /** Where the floating bubble may appear (embed shortcode always renders). */
  pageTarget?: CepPageTarget;
  ai?: CepAiConfig;
  modules?: CepWidgetModules;
  botAvatarUrl?: string;
  agentAvatarUrl?: string;
  /** Form Builder form id for in-chat lead capture. */
  leadFormId?: string | null;
  /** Optional greeting quick-replies shown as buttons. */
  quickReplies?: Array<{
    id: string;
    label: string;
    icon?: string;
    action: "send_text" | "open_url" | "transfer_agent" | "start_form";
    value?: string;
  }>;
  /** Deterministic FAQ chips (answered client-side when `answer` is set). */
  faq?: {
    enabled?: boolean;
    /** Raw Q:/A: paste — indexed on Train Now and parsed into items. */
    paste?: string;
    items?: Array<{
      id: string;
      label: string;
      icon?: string;
      answer?: string;
      followups?: Array<{ label: string; answer?: string }>;
    }>;
  };
  /**
   * Enterprise Industry Preset Library id.
   * AI customizes this preset — it must never invent a widget design from scratch.
   */
  industryPresetId?: string | null;
  /** Editable industry experience layer (flows, CTAs, AI prompt, rules, etc.). */
  experience?: CepIndustryExperience | null;
};

export const cepWidgets = pgTable(
  "cep_widgets",
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
    slug: text("slug").notNull(),
    status: text("status").$type<CepWidgetStatus>().notNull().default("draft"),
    surface: text("surface").$type<CepWidgetSurface>().notNull().default("bubble"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    priorityRank: integer("priority_rank").notNull().default(100),
    payload: jsonb("payload").$type<CepWidgetPayload>().notNull().default({}),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("cep_widgets_agency_idx").on(t.agencyId),
    index("cep_widgets_website_idx").on(t.websiteId, t.status),
    index("cep_widgets_website_enabled_idx").on(t.websiteId, t.isEnabled),
  ],
);

export type CepWidget = typeof cepWidgets.$inferSelect;

export function defaultCepWidgetPayload(
  surface: CepWidgetSurface = "bubble",
): CepWidgetPayload {
  return {
    surface,
    title: "Customer Support",
    greeting: "Hi! Ask me anything about our site and I'll help right away.",
    placeholder: "Write a message...",
    theme: {
      primaryColor: "#2563eb",
      primaryColorEnd: "#3b82f6",
      backgroundColor: "#ffffff",
      textColor: "#0f172a",
      radius: 16,
      bubbleShape: "circle",
      position: "bottom_right",
      leftPercent: 88,
      topPercent: 82,
      offsetX: 24,
      offsetY: 24,
      desktopWidth: "320px",
      desktopHeight: "min(510px, calc(100vh - 130px))",
      mobileWidth: "min(320px, calc(100vw - 24px))",
      mobileHeight: "min(510px, calc(100svh - 164px))",
      zIndex: 2147483000,
      launcherLabel: "Live chat",
      launcherIcon: "compose",
      // Keep in sync with DEFAULT_LAUNCHER_METRICS (Accessibility / Languages).
      launcherIconSize: 22,
      launcherPadding: 11,
      onlineIndicator: true,
      pulse: false,
      onlineDotColor: "#00ff6a",
      agentName: "Customer Support",
      statusText: "Online",
      homeContent:
        "Hi! Ask me anything about our site and I'll help right away.",
      openOnLaunch: true,
      preChatEnabled: false,
      agreementRequired: true,
      agreementBrandName: "Customer Support",
      agreementLogoSize: 56,
      agreementIntro: "Hi! I am your virtual agent.",
      agreementBody:
        "I'm happy to help find what you need. To continue, you will need to agree to our Terms Of Use and Privacy Policy.",
      agreeLabel: "I Agree",
      disagreeLabel: "I Don't Agree",
      startTitle: "Leave your contact",
      startButtonLabel: "Start Conversation",
    },
    triggers: {
      delayMs: 0,
    },
    pageTarget: { mode: "everywhere", rules: [], surfaces: [], excludePaths: [] },
    ai: {
      provider: "openrouter",
      model: "anthropic/claude-sonnet-4",
      temperature: 0.3,
      maxTokens: 800,
      fallbackProvider: "anthropic",
      fallbackModel: "claude-sonnet-5",
    },
    modules: {
      leadForm: true,
      appointment: false,
      productCarousel: false,
      transferAgent: true,
      sounds: true,
      streaming: true,
    },
    leadFormId: null,
    quickReplies: [
      {
        id: "human",
        label: "Talk to a human",
        action: "transfer_agent",
      },
    ],
  };
}

export const CEP_AI_PROVIDER_OPTIONS: {
  value: CepAiProvider;
  label: string;
  hint: string;
}[] = [
  { value: "openrouter", label: "OpenRouter", hint: "Default · multi-model gateway" },
  { value: "anthropic", label: "Anthropic", hint: "Claude direct" },
  { value: "openai", label: "OpenAI", hint: "GPT models" },
  { value: "google", label: "Google Gemini", hint: "Gemini API" },
  { value: "mistral", label: "Mistral", hint: "Mistral Cloud" },
  { value: "groq", label: "Groq", hint: "Fast inference" },
  { value: "azure_openai", label: "Azure OpenAI", hint: "Enterprise Azure" },
  { value: "custom_openai", label: "Custom OpenAI-compatible", hint: "Ollama / LM Studio / local" },
];

export function textToBlocks(text: string): CepChatBlock[] {
  const trimmed = text.trim();
  if (!trimmed) return [{ type: "plain_text", text: "" }];
  return [{ type: "plain_text", text: trimmed }];
}

export function blocksToPlainText(blocks: CepChatBlock[] | null | undefined): string {
  if (!blocks?.length) return "";
  return blocks
    .map((b) => {
      if (b.type === "plain_text" || b.type === "markdown" || b.type === "system") {
        return b.text;
      }
      if (b.type === "buttons") {
        return b.buttons.map((x) => x.label).join(" · ");
      }
      if (b.type === "lead_form") {
        return b.title ? `[Form: ${b.title}]` : "[Lead form]";
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}
