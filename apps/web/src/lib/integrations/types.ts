/**
 * Per-website optional integrations — stored on `websites.settings.integrations`.
 * Level 1 (core) modules are built into Avonix; this file tracks Level 2 connections.
 */

import type { SocialProvider } from "@/lib/automation/types";

export type IntegrationLevel = 1 | 2 | 3;

export type OptionalIntegrationId =
  | "telegram"
  | "discord"
  | "microsoft_teams"
  | "google_drive"
  | "dropbox"
  | "onedrive";

export type IntegrationConnection = {
  id: OptionalIntegrationId;
  connected: boolean;
  label: string;
  /** API key, bot token, or webhook secret. */
  apiKey: string;
  /** Incoming webhook URL (Discord, Teams). */
  webhookUrl: string;
  connectedAt: string;
  /** Extra key/value fields for advanced integrations. */
  meta?: Record<string, string>;
};

export type IntegrationsSettings = {
  connections: IntegrationConnection[];
};

export type CoreModuleStatus = {
  id: string;
  label: string;
  active: boolean;
  href?: string;
  hint: string;
};

export type OptionalIntegrationCard = {
  id: OptionalIntegrationId;
  label: string;
  hint: string;
  connected: boolean;
  labelText: string;
  viaAutomation?: SocialProvider;
};

export type EnterpriseIntegration = {
  id: string;
  label: string;
  hint: string;
  available: boolean;
};

export type IntegrationsSnapshot = {
  website: {
    id: string;
    name: string;
    url: string;
    status: string;
    connectorVersion: string | null;
  };
  stats: {
    coreActive: number;
    coreTotal: number;
    optionalConnected: number;
    optionalTotal: number;
  };
  coreModules: CoreModuleStatus[];
  optional: OptionalIntegrationCard[];
  enterprise: EnterpriseIntegration[];
};

export const OPTIONAL_INTEGRATIONS: {
  id: OptionalIntegrationId;
  label: string;
  hint: string;
  usesWebhook: boolean;
  usesApiKey: boolean;
  usesOAuth?: boolean;
  /** Phone-number connect (platform Telegram bot). */
  usesPhone?: boolean;
  webhookLabel?: string;
  apiKeyLabel?: string;
  automationProvider?: SocialProvider;
}[] = [
  {
    id: "telegram",
    label: "Telegram",
    hint: "Connect with your phone number — no bot token",
    usesWebhook: false,
    usesApiKey: false,
    usesPhone: true,
    automationProvider: "telegram",
  },
  {
    id: "discord",
    label: "Discord",
    hint: "Webhook for server notifications",
    usesWebhook: true,
    usesApiKey: false,
    webhookLabel: "Webhook URL",
  },
  {
    id: "microsoft_teams",
    label: "Microsoft Teams",
    hint: "Connector webhook for a channel",
    usesWebhook: true,
    usesApiKey: false,
    webhookLabel: "Incoming webhook URL",
  },
  {
    id: "google_drive",
    label: "Google Drive Backup",
    hint: "OAuth via Backups page — archives upload to your Drive",
    usesWebhook: false,
    usesApiKey: false,
    usesOAuth: true,
  },
  {
    id: "dropbox",
    label: "Dropbox",
    hint: "OAuth via Backups page — one click, no tokens",
    usesWebhook: false,
    usesApiKey: false,
    usesOAuth: true,
  },
  {
    id: "onedrive",
    label: "OneDrive",
    hint: "Microsoft sign-in via Backups page — one click",
    usesWebhook: false,
    usesApiKey: false,
    usesOAuth: true,
  },
];

export const ENTERPRISE_INTEGRATIONS: EnterpriseIntegration[] = [
  {
    id: "whatsapp_business",
    label: "WhatsApp Business",
    hint: "Cloud API alerts & two-way chat",
    available: true,
  },
  {
    id: "google_search_console",
    label: "Google Search Console",
    hint: "Search performance import",
    available: false,
  },
  {
    id: "pagespeed",
    label: "PageSpeed",
    hint: "Lab + field performance scores",
    available: false,
  },
  {
    id: "openrouter",
    label: "OpenAI / OpenRouter",
    hint: "Bring your own model key",
    available: true,
  },
  {
    id: "multi_site",
    label: "Multi-site Central Dashboard",
    hint: "Agency-wide roll-up",
    available: true,
  },
  {
    id: "remote_monitoring",
    label: "Remote Monitoring",
    hint: "Dedicated probe fleet",
    available: false,
  },
  {
    id: "malware_intel",
    label: "Malware Intelligence",
    hint: "Threat feed for file scans",
    available: false,
  },
  {
    id: "ai_analysis",
    label: "AI Analysis",
    hint: "Deep site content review",
    available: true,
  },
];

export function emptyConnection(
  id: OptionalIntegrationId,
): IntegrationConnection {
  return {
    id,
    connected: false,
    label: "",
    apiKey: "",
    webhookUrl: "",
    connectedAt: "",
    meta: {},
  };
}

export function mergeIntegrationsSettings(
  partial?: Partial<IntegrationsSettings> | null,
): IntegrationsSettings {
  const byId = new Map<OptionalIntegrationId, IntegrationConnection>();
  for (const meta of OPTIONAL_INTEGRATIONS) {
    byId.set(meta.id, emptyConnection(meta.id));
  }
  for (const row of partial?.connections ?? []) {
    if (byId.has(row.id)) {
      byId.set(row.id, {
        ...emptyConnection(row.id),
        ...row,
      });
    }
  }
  return { connections: [...byId.values()] };
}

export function connectionFor(
  settings: IntegrationsSettings,
  id: OptionalIntegrationId,
): IntegrationConnection {
  return (
    settings.connections.find((c) => c.id === id) ?? emptyConnection(id)
  );
}

export function integrationsConfigScore(settings: IntegrationsSettings): number {
  const connected = settings.connections.filter((c) => c.connected).length;
  if (connected === 0) return 10;
  return Math.min(100, 20 + connected * 10);
}

export function optionalMeta(id: OptionalIntegrationId) {
  return OPTIONAL_INTEGRATIONS.find((p) => p.id === id)!;
}

export function canConnectConnection(
  meta: (typeof OPTIONAL_INTEGRATIONS)[number],
  conn: IntegrationConnection,
): boolean {
  if (meta.usesOAuth) return conn.connected;
  if (meta.usesPhone) {
    return Boolean((conn.meta?.phone ?? "").trim());
  }
  if (meta.usesWebhook && !conn.webhookUrl.trim()) return false;
  if (meta.usesApiKey && !conn.apiKey.trim()) return false;
  if (!meta.usesWebhook && !meta.usesApiKey && !meta.usesOAuth && !meta.usesPhone) {
    return false;
  }
  return true;
}

export function isTelegramPhoneConnected(conn: IntegrationConnection): boolean {
  return Boolean(conn.connected && (conn.meta?.chatId ?? "").trim());
}
