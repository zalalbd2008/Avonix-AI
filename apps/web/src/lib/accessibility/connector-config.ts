/**
 * Public Accessibility widget config for the WordPress connector (no secrets).
 */

import { eq } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import {
  mergeAccessibilitySettings,
  type AccessibilitySettings,
} from "@/lib/accessibility/types";

export type ConnectorAccessibilityConfig = {
  enabled: boolean;
  position: AccessibilitySettings["position"];
  placement: AccessibilitySettings["placement"];
  icon_style: AccessibilitySettings["iconStyle"];
  icon_size: number;
  button_padding: number;
  primary_color: string;
  label: string;
  hide_on_mobile: boolean;
  exclude_paths: string[];
  page_target: AccessibilitySettings["pageTarget"];
  features: AccessibilitySettings["features"];
  profiles: AccessibilitySettings["profiles"];
  statement: AccessibilitySettings["statement"];
  announce_changes: boolean;
  persist_visitor_prefs: boolean;
};

function lines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 80);
}

export async function getConnectorAccessibilityConfig(
  agencyId: string,
  websiteId: string,
): Promise<ConnectorAccessibilityConfig | null> {
  const row = await withAgency(agencyId, async (tx) => {
    const [found] = await tx
      .select({ settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    return found ?? null;
  });
  if (!row) return null;

  const s = mergeAccessibilitySettings(row.settings?.accessibility);

  return {
    enabled: s.enabled,
    position: s.position,
    placement: s.placement,
    icon_style: s.iconStyle,
    icon_size: s.iconSize,
    button_padding: s.buttonPadding,
    primary_color: s.primaryColor,
    label: s.label || "Accessibility",
    hide_on_mobile: s.hideOnMobile,
    exclude_paths: s.pageTarget.excludePaths ?? lines(s.excludePaths),
    page_target: s.pageTarget,
    features: s.features,
    profiles: s.profiles,
    statement: s.statement,
    announce_changes: s.announceChanges,
    persist_visitor_prefs: s.persistVisitorPrefs,
  };
}
