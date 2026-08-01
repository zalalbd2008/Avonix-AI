/**
 * Per-website accessibility widget + compliance settings.
 * Stored on `websites.settings.accessibility` (JSON) — no extra table.
 */

import {
  DEFAULT_LAUNCHER_METRICS,
  normalizeLauncherMetrics,
} from "@/lib/widgets/launcher-size";
import {
  DEFAULT_WIDGET_PAGE_TARGET,
  linesToExcludePaths,
  normalizeWidgetPageTarget,
  type WidgetPageTarget,
} from "@/lib/widgets/page-target";
import {
  defaultScreenPlacement,
  normalizeScreenPlacement,
  placementFromCorner,
  type ScreenPlacement,
} from "@/lib/widgets/screen-placement";

export type AccessibilityPosition =
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right";

export type AccessibilityIconStyle = "classic" | "modern" | "minimal";
export type AccessibilityTargetLevel = "A" | "AA" | "AAA";

export type AccessibilityProfiles = {
  visuallyImpaired: boolean;
  seizureSafe: boolean;
  adhdFriendly: boolean;
  cognitiveDisability: boolean;
  blindUsers: boolean;
  motorImpaired: boolean;
};

export type AccessibilityStatement = {
  enabled: boolean;
  companyName: string;
  contactEmail: string;
  lastReviewed: string;
  customHtml: string;
};

export type AccessibilitySettings = {
  enabled: boolean;
  /** Legacy corner — kept in sync with `placement`. */
  position: AccessibilityPosition;
  /** Free screen placement for the accessibility launcher group. */
  placement: ScreenPlacement;
  iconStyle: AccessibilityIconStyle;
  /** Icon glyph size in px. */
  iconSize: number;
  /** Inner padding around the icon in px. */
  buttonPadding: number;
  primaryColor: string;
  label: string;
  language: string;
  hideOnMobile: boolean;
  /** @deprecated prefer pageTarget — kept for older saves */
  excludePaths: string;
  /** Show / hide on WP surfaces and custom URLs */
  pageTarget: WidgetPageTarget;

  /** Feature flags exposed in the visitor widget */
  features: {
    contrast: boolean;
    highContrast: boolean;
    darkContrast: boolean;
    lightContrast: boolean;
    grayscale: boolean;
    invertColors: boolean;
    brightness: boolean;
    saturation: boolean;

    fontSize: boolean;
    readableFont: boolean;
    dyslexiaFont: boolean;
    lineHeight: boolean;
    letterSpacing: boolean;
    textAlign: boolean;

    underlineLinks: boolean;
    highlightLinks: boolean;
    bigCursor: boolean;
    readingGuide: boolean;
    readingMask: boolean;
    stopAnimations: boolean;
    hideImages: boolean;
    tooltips: boolean;

    keyboardNav: boolean;
    focusRing: boolean;
    skipToContent: boolean;
    largeClickArea: boolean;
    voiceNavigation: boolean;
  };

  profiles: AccessibilityProfiles;
  statement: AccessibilityStatement;
  targetLevel: AccessibilityTargetLevel;
  autoScan: boolean;
  announceChanges: boolean;
  persistVisitorPrefs: boolean;
};

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  enabled: false,
  position: "bottom-left",
  placement: defaultScreenPlacement("bottom-left", 16, 16),
  iconStyle: "classic",
  iconSize: DEFAULT_LAUNCHER_METRICS.iconSize,
  buttonPadding: DEFAULT_LAUNCHER_METRICS.buttonPadding,
  primaryColor: "#e15d1a",
  label: "Accessibility",
  language: "auto",
  hideOnMobile: false,
  excludePaths: "",
  pageTarget: { ...DEFAULT_WIDGET_PAGE_TARGET },

  features: {
    contrast: true,
    highContrast: true,
    darkContrast: true,
    lightContrast: true,
    grayscale: true,
    invertColors: true,
    brightness: true,
    saturation: true,

    fontSize: true,
    readableFont: true,
    dyslexiaFont: true,
    lineHeight: true,
    letterSpacing: true,
    textAlign: true,

    underlineLinks: true,
    highlightLinks: true,
    bigCursor: true,
    readingGuide: true,
    readingMask: true,
    stopAnimations: true,
    hideImages: false,
    tooltips: true,

    keyboardNav: true,
    focusRing: true,
    skipToContent: true,
    largeClickArea: true,
    voiceNavigation: false,
  },

  profiles: {
    visuallyImpaired: true,
    seizureSafe: true,
    adhdFriendly: true,
    cognitiveDisability: true,
    blindUsers: true,
    motorImpaired: true,
  },

  statement: {
    enabled: false,
    companyName: "",
    contactEmail: "",
    lastReviewed: "",
    customHtml: "",
  },

  targetLevel: "AA",
  autoScan: false,
  announceChanges: true,
  persistVisitorPrefs: true,
};

export function mergeAccessibilitySettings(
  raw?: Partial<AccessibilitySettings> | null,
): AccessibilitySettings {
  if (!raw) return structuredClone(DEFAULT_ACCESSIBILITY);
  const position =
    (raw.position as AccessibilityPosition | undefined) ??
    DEFAULT_ACCESSIBILITY.position;
  const ox = raw.placement?.offsetX;
  const oy = raw.placement?.offsetY;
  const placement = normalizeScreenPlacement(
    raw.placement ?? placementFromCorner(position, ox, oy),
    DEFAULT_ACCESSIBILITY.placement,
  );
  const metrics = normalizeLauncherMetrics(
    raw.iconSize != null || raw.buttonPadding != null
      ? { iconSize: raw.iconSize, buttonPadding: raw.buttonPadding }
      : (raw as { launcherSize?: string }).launcherSize,
  );
  const legacyExclude = linesToExcludePaths(String(raw.excludePaths ?? ""));
  const pageTarget = normalizeWidgetPageTarget(
    raw.pageTarget ??
      (legacyExclude.length
        ? { mode: "everywhere", excludePaths: legacyExclude }
        : undefined),
  );
  if (!pageTarget.excludePaths?.length && legacyExclude.length) {
    pageTarget.excludePaths = legacyExclude;
  }
  return {
    ...DEFAULT_ACCESSIBILITY,
    ...raw,
    position,
    placement,
    iconSize: metrics.iconSize,
    buttonPadding: metrics.buttonPadding,
    pageTarget,
    excludePaths: (pageTarget.excludePaths ?? []).join("\n"),
    features: {
      ...DEFAULT_ACCESSIBILITY.features,
      ...(raw.features ?? {}),
    },
    profiles: {
      ...DEFAULT_ACCESSIBILITY.profiles,
      ...(raw.profiles ?? {}),
    },
    statement: {
      ...DEFAULT_ACCESSIBILITY.statement,
      ...(raw.statement ?? {}),
    },
  };
}

/** Rough compliance readiness score 0–100 from configured tools (not a live WCAG audit). */
export function accessibilityScore(settings: AccessibilitySettings): number {
  let score = 0;
  if (settings.enabled) score += 20;

  const feats = Object.values(settings.features);
  const on = feats.filter(Boolean).length;
  score += Math.round((on / Math.max(feats.length, 1)) * 35);

  const profiles = Object.values(settings.profiles);
  score += Math.round(
    (profiles.filter(Boolean).length / Math.max(profiles.length, 1)) * 15,
  );

  if (settings.statement.enabled) {
    score += 10;
    if (settings.statement.companyName.trim()) score += 5;
    if (settings.statement.contactEmail.trim()) score += 5;
    if (settings.statement.lastReviewed.trim()) score += 5;
  }

  if (settings.targetLevel === "AA") score += 3;
  if (settings.targetLevel === "AAA") score += 5;
  if (settings.features.skipToContent) score += 2;
  if (settings.features.keyboardNav && settings.features.focusRing) score += 3;

  return Math.min(100, score);
}

export function countEnabledFeatures(settings: AccessibilitySettings): number {
  return Object.values(settings.features).filter(Boolean).length;
}

export function countEnabledProfiles(settings: AccessibilitySettings): number {
  return Object.values(settings.profiles).filter(Boolean).length;
}
