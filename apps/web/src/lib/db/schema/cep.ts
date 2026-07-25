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
  | { type: "typing" };

export type CepBubbleShape = "circle" | "rounded_square" | "image" | "gif" | "lottie";

export type CepWidgetTheme = {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  headerColor?: string;
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
  /** Icon glyph size in px. */
  launcherIconSize?: number;
  /** Inner padding around the icon in px. */
  launcherPadding?: number;
  /** @deprecated use launcherIconSize + launcherPadding */
  launcherSize?: "sm" | "md" | "lg" | "xl" | { iconSize?: number; buttonPadding?: number };
  onlineIndicator?: boolean;
  pulse?: boolean;
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
    action: "send_text" | "open_url" | "transfer_agent" | "start_form";
    value?: string;
  }>;
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
    title: "Chat with us",
    greeting: "Hi! How can we help?",
    placeholder: "Type a message…",
    theme: {
      primaryColor: "#ff6600",
      backgroundColor: "#ffffff",
      textColor: "#13233c",
      headerColor: "#ff6600",
      radius: 16,
      bubbleShape: "circle",
      position: "bottom_right",
      leftPercent: 88,
      topPercent: 82,
      offsetX: 20,
      offsetY: 20,
      desktopWidth: "min(380px, calc(100vw - 32px))",
      desktopHeight: "min(560px, calc(100vh - 120px))",
      mobileWidth: "calc(100vw - 24px)",
      mobileHeight: "min(70vh, calc(100dvh - 96px))",
      zIndex: 2147483000,
      launcherLabel: "Chat",
      launcherIconSize: 22,
      launcherPadding: 11,
      onlineIndicator: true,
      pulse: true,
    },
    triggers: {
      delayMs: 0,
    },
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
