/**
 * Per-website WordPress update preferences + queued remote actions.
 * Stored on `websites.settings.updates` (JSON).
 *
 * Inventory arrives from the connector when reported.
 * Alerts use the website Email (SMTP) settings — no separate address here.
 */

export type UpdatesSettings = {
  enabled: boolean;
  watchCore: boolean;
  watchPlugins: boolean;
  watchThemes: boolean;
  watchConnector: boolean;
  /** Notify via website Email when updates are detected. */
  notifyOnAvailable: boolean;
  /** Prefer minor/security only when auto-apply is supported later. */
  securityOnly: boolean;
  /** Plugin slugs to ignore (one per line). */
  excludePlugins: string;
  /** Theme slugs to ignore (one per line). */
  excludeThemes: string;
  /** Queued remote actions for the connector to run. */
  pendingActions: UpdatePendingAction[];
  /** Last software list reported by the connector (optional). */
  inventory: UpdateInventoryItem[];
};

export type UpdateTargetType = "core" | "plugin" | "theme" | "connector";

export type UpdateActionKind =
  | "update"
  | "activate"
  | "deactivate"
  | "delete";

export type UpdatePendingAction = {
  id: string;
  kind: UpdateActionKind;
  targetType: UpdateTargetType;
  slug: string;
  label: string;
  createdAt: string;
};

export type UpdateInventoryItem = {
  id: string;
  targetType: UpdateTargetType;
  slug: string;
  name: string;
  version: string;
  latestVersion?: string;
  active: boolean;
  updateAvailable: boolean;
};

export const DEFAULT_UPDATES: UpdatesSettings = {
  enabled: true,
  watchCore: true,
  watchPlugins: true,
  watchThemes: true,
  watchConnector: true,
  notifyOnAvailable: true,
  securityOnly: false,
  excludePlugins: "",
  excludeThemes: "",
  pendingActions: [],
  inventory: [],
};

const ACTION_KINDS = new Set<UpdateActionKind>([
  "update",
  "activate",
  "deactivate",
  "delete",
]);

const TARGET_TYPES = new Set<UpdateTargetType>([
  "core",
  "plugin",
  "theme",
  "connector",
]);

function normalizePendingActions(raw: unknown): UpdatePendingAction[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is UpdatePendingAction => {
      if (!a || typeof a !== "object") return false;
      const row = a as UpdatePendingAction;
      return (
        typeof row.id === "string" &&
        ACTION_KINDS.has(row.kind) &&
        TARGET_TYPES.has(row.targetType) &&
        typeof row.slug === "string" &&
        typeof row.label === "string" &&
        typeof row.createdAt === "string"
      );
    })
    .slice(0, 50);
}

function normalizeInventory(raw: unknown): UpdateInventoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is UpdateInventoryItem => {
      if (!a || typeof a !== "object") return false;
      const row = a as UpdateInventoryItem;
      return (
        typeof row.id === "string" &&
        TARGET_TYPES.has(row.targetType) &&
        typeof row.slug === "string" &&
        typeof row.name === "string" &&
        typeof row.version === "string"
      );
    })
    .map((row) => ({
      ...row,
      active: Boolean(row.active),
      updateAvailable: Boolean(row.updateAvailable),
      latestVersion:
        typeof row.latestVersion === "string" ? row.latestVersion : undefined,
    }))
    .slice(0, 200);
}

export function mergeUpdatesSettings(
  raw?: Partial<UpdatesSettings> | null,
): UpdatesSettings {
  if (!raw) return structuredClone(DEFAULT_UPDATES);
  return {
    enabled: raw.enabled !== false,
    watchCore: raw.watchCore !== false,
    watchPlugins: raw.watchPlugins !== false,
    watchThemes: raw.watchThemes !== false,
    watchConnector: raw.watchConnector !== false,
    notifyOnAvailable: raw.notifyOnAvailable !== false,
    securityOnly: Boolean(raw.securityOnly),
    excludePlugins:
      typeof raw.excludePlugins === "string" ? raw.excludePlugins.trim() : "",
    excludeThemes:
      typeof raw.excludeThemes === "string" ? raw.excludeThemes.trim() : "",
    pendingActions: normalizePendingActions(raw.pendingActions),
    inventory: normalizeInventory(raw.inventory),
  };
}

export function updatesConfigScore(settings: UpdatesSettings): number {
  let score = 0;
  if (settings.enabled) score += 35;
  const watches = [
    settings.watchCore,
    settings.watchPlugins,
    settings.watchThemes,
    settings.watchConnector,
  ].filter(Boolean).length;
  score += watches * 10;
  if (settings.notifyOnAvailable) score += 25;
  return Math.min(100, score);
}

export type ConnectorUpdateState =
  | "not_reported"
  | "up_to_date"
  | "update_available"
  | "ahead";

export function connectorUpdateState(
  version: string | null | undefined,
  latest: string,
  compare: (a: string, b: string) => number,
): { id: ConnectorUpdateState; label: string; tone: string } {
  if (!version) {
    return {
      id: "not_reported",
      label: "Not reported",
      tone: "bg-[#f1f4f8] text-muted",
    };
  }
  const diff = compare(version, latest);
  if (diff < 0) {
    return {
      id: "update_available",
      label: "Update available",
      tone: "bg-[rgba(217,119,6,.12)] text-warn",
    };
  }
  if (diff > 0) {
    return {
      id: "ahead",
      label: "Ahead of us",
      tone: "bg-[#f1f4f8] text-muted",
    };
  }
  return {
    id: "up_to_date",
    label: "Up to date",
    tone: "bg-[rgba(13,148,136,.1)] text-ok",
  };
}

export function updateActionLabel(kind: UpdateActionKind): string {
  switch (kind) {
    case "update":
      return "Manual update";
    case "activate":
      return "Activate";
    case "deactivate":
      return "Deactivate";
    case "delete":
      return "Delete";
  }
}

/** Allowed menu actions for a target type / active state. */
export function availableItemActions(
  targetType: UpdateTargetType,
  active: boolean,
): UpdateActionKind[] {
  // Core can only be updated — no activate/deactivate/delete in WP.
  if (targetType === "core") return ["update"];
  // Plugins, themes, and the connector plugin: update + on/off + delete.
  return ["update", active ? "deactivate" : "activate", "delete"];
}

export function makePendingAction(input: {
  kind: UpdateActionKind;
  targetType: UpdateTargetType;
  slug: string;
  label: string;
}): UpdatePendingAction {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    targetType: input.targetType,
    slug: input.slug,
    label: input.label,
    createdAt: new Date().toISOString(),
  };
}
