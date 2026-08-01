/**
 * Continuous floating-launcher metrics (Accessibility / Languages / Live Chat).
 * Button outer size = iconSize + 2 × buttonPadding (+ border for avatar tiles).
 * Ranges: 0–100, step 1.
 */

export type LauncherMetrics = {
  /** Glyph / image content size in px. */
  iconSize: number;
  /** Inner padding around the icon in px. */
  buttonPadding: number;
};

export const ICON_SIZE_MIN = 0;
export const ICON_SIZE_MAX = 100;
export const PADDING_MIN = 0;
export const PADDING_MAX = 100;

export const DEFAULT_LAUNCHER_METRICS: LauncherMetrics = {
  iconSize: 22,
  buttonPadding: 11,
};

/** Outer diameter shared by Live Chat / Accessibility / Languages (22 + 2×11). */
export const SHARED_LAUNCHER_OUTER_PX =
  DEFAULT_LAUNCHER_METRICS.iconSize +
  DEFAULT_LAUNCHER_METRICS.buttonPadding * 2;

/** Legacy preset → metrics (older saves). */
const LEGACY_PRESET: Record<string, LauncherMetrics> = {
  sm: { iconSize: 16, buttonPadding: 10 },
  md: { iconSize: 22, buttonPadding: 11 },
  lg: { iconSize: 28, buttonPadding: 14 },
  xl: { iconSize: 34, buttonPadding: 17 },
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeIconSize(raw?: number | null): number {
  return clamp(
    typeof raw === "number" ? raw : DEFAULT_LAUNCHER_METRICS.iconSize,
    ICON_SIZE_MIN,
    ICON_SIZE_MAX,
  );
}

export function normalizeButtonPadding(raw?: number | null): number {
  return clamp(
    typeof raw === "number" ? raw : DEFAULT_LAUNCHER_METRICS.buttonPadding,
    PADDING_MIN,
    PADDING_MAX,
  );
}

/**
 * Accepts new `{ iconSize, buttonPadding }`, or legacy `"sm"|"md"|"lg"|"xl"`.
 */
export function normalizeLauncherMetrics(
  raw?: Partial<LauncherMetrics> | string | null,
): LauncherMetrics {
  if (typeof raw === "string") {
    return { ...(LEGACY_PRESET[raw] ?? DEFAULT_LAUNCHER_METRICS) };
  }
  if (raw && typeof raw === "object") {
    return {
      iconSize: normalizeIconSize(raw.iconSize),
      buttonPadding: normalizeButtonPadding(raw.buttonPadding),
    };
  }
  return { ...DEFAULT_LAUNCHER_METRICS };
}

export function launcherOuterPx(m: LauncherMetrics): number {
  const n = normalizeLauncherMetrics(m);
  return n.iconSize + n.buttonPadding * 2;
}

/** Outer corner radius scales with tile size (~10px at 44). */
export function launcherCornerRadiusPx(m: LauncherMetrics): number {
  const outer = launcherOuterPx(m);
  if (outer <= 0) return 0;
  return Math.max(0, Math.round(outer * (10 / 44)));
}
