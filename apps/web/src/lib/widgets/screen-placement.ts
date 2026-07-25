/**
 * Independent floating-widget placement (Languages / Accessibility / Live Chat).
 * Free % position — drag in the live preview; no numeric entry required.
 */

import type { CSSProperties } from "react";

export type ScreenAnchor =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

/**
 * Free placement: group’s top-left as % of the viewport (or preview canvas).
 * Legacy `anchor` + `offsetX/Y` are still accepted when reading old saves.
 */
export type ScreenPlacement = {
  xPercent: number;
  yPercent: number;
  /** @deprecated kept for older saved settings */
  anchor?: ScreenAnchor;
  /** @deprecated kept for older saved settings */
  offsetX?: number;
  /** @deprecated kept for older saved settings */
  offsetY?: number;
};

const REF_W = 360;
const REF_H = 640;

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

export function defaultScreenPlacement(
  anchor: ScreenAnchor = "bottom-right",
  offsetX = 16,
  offsetY = 16,
): ScreenPlacement {
  return legacyToFree(
    { anchor, offsetX, offsetY },
    REF_W,
    REF_H,
    56,
    48,
  );
}

function legacyToFree(
  legacy: { anchor: ScreenAnchor; offsetX: number; offsetY: number },
  canvasW: number,
  canvasH: number,
  groupW: number,
  groupH: number,
): ScreenPlacement {
  const x = legacy.anchor.includes("right")
    ? canvasW - groupW - legacy.offsetX
    : legacy.offsetX;
  const y = legacy.anchor.startsWith("top")
    ? legacy.offsetY
    : canvasH - groupH - legacy.offsetY;
  return {
    xPercent: clampPercent((x / Math.max(1, canvasW - groupW)) * 100),
    yPercent: clampPercent((y / Math.max(1, canvasH - groupH)) * 100),
  };
}

export function normalizeScreenPlacement(
  raw?: Partial<ScreenPlacement> | null,
  fallback: ScreenPlacement = defaultScreenPlacement(),
): ScreenPlacement {
  if (
    raw &&
    typeof raw.xPercent === "number" &&
    Number.isFinite(raw.xPercent) &&
    typeof raw.yPercent === "number" &&
    Number.isFinite(raw.yPercent)
  ) {
    return {
      xPercent: clampPercent(raw.xPercent),
      yPercent: clampPercent(raw.yPercent),
    };
  }

  if (
    raw?.anchor === "top-left" ||
    raw?.anchor === "top-right" ||
    raw?.anchor === "bottom-left" ||
    raw?.anchor === "bottom-right"
  ) {
    return legacyToFree(
      {
        anchor: raw.anchor,
        offsetX:
          typeof raw.offsetX === "number" && Number.isFinite(raw.offsetX)
            ? Math.max(0, raw.offsetX)
            : 16,
        offsetY:
          typeof raw.offsetY === "number" && Number.isFinite(raw.offsetY)
            ? Math.max(0, raw.offsetY)
            : 16,
      },
      REF_W,
      REF_H,
      56,
      48,
    );
  }

  return {
    xPercent: clampPercent(fallback.xPercent),
    yPercent: clampPercent(fallback.yPercent),
  };
}

/** Map legacy corner enums (hyphen or underscore) → free placement. */
export function placementFromCorner(
  position: string | null | undefined,
  offsetX = 16,
  offsetY = 16,
): ScreenPlacement {
  const normalized = String(position ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  const anchor: ScreenAnchor =
    normalized === "top-left" ||
    normalized === "top-right" ||
    normalized === "bottom-left" ||
    normalized === "bottom-right"
      ? (normalized as ScreenAnchor)
      : "bottom-right";
  return defaultScreenPlacement(anchor, offsetX, offsetY);
}

/** Nearest corner — for syncing legacy `position` fields. */
export function cornerFromPlacement(p: ScreenPlacement): ScreenAnchor {
  const n = normalizeScreenPlacement(p);
  const right = n.xPercent >= 50;
  const bottom = n.yPercent >= 50;
  return `${bottom ? "bottom" : "top"}-${right ? "right" : "left"}` as ScreenAnchor;
}

/** CSS for absolute/fixed free placement (% of containing block). */
export function placementToStyle(
  p: ScreenPlacement,
  mode: "absolute" | "fixed" = "absolute",
): CSSProperties {
  const n = normalizeScreenPlacement(p);
  return {
    position: mode,
    left: `${n.xPercent}%`,
    top: `${n.yPercent}%`,
    right: "auto",
    bottom: "auto",
  };
}

/** Canvas-local top-left → free % placement (no corner snap). */
export function placementFromPoint(
  x: number,
  y: number,
  canvasW: number,
  canvasH: number,
  groupW: number,
  groupH: number,
): ScreenPlacement {
  const maxX = Math.max(1, canvasW - groupW);
  const maxY = Math.max(1, canvasH - groupH);
  const clampedX = Math.min(maxX, Math.max(0, x));
  const clampedY = Math.min(maxY, Math.max(0, y));
  return {
    xPercent: clampPercent((clampedX / maxX) * 100),
    yPercent: clampPercent((clampedY / maxY) * 100),
  };
}

/** Top-left of the group inside a canvas of given size. */
export function pointFromPlacement(
  p: ScreenPlacement,
  canvasW: number,
  canvasH: number,
  groupW: number,
  groupH: number,
): { x: number; y: number } {
  const n = normalizeScreenPlacement(p);
  const maxX = Math.max(0, canvasW - groupW);
  const maxY = Math.max(0, canvasH - groupH);
  return {
    x: Math.round((n.xPercent / 100) * maxX),
    y: Math.round((n.yPercent / 100) * maxY),
  };
}

/** CEP theme uses underscores for a coarse corner hint + free %. */
export function cepPositionFromAnchor(
  anchor: ScreenAnchor,
): "top_left" | "top_right" | "bottom_left" | "bottom_right" {
  return anchor.replace("-", "_") as
    | "top_left"
    | "top_right"
    | "bottom_left"
    | "bottom_right";
}

export function anchorFromCepPosition(
  position: string | null | undefined,
): ScreenAnchor {
  return cornerFromPlacement(placementFromCorner(position));
}

export function placementLabel(p: ScreenPlacement): string {
  const n = normalizeScreenPlacement(p);
  return `${Math.round(n.xPercent)}%, ${Math.round(n.yPercent)}%`;
}

/** Quick presets: corners + edge mids. */
export type PlacementPreset =
  | ScreenAnchor
  | "left"
  | "right"
  | "top"
  | "bottom";

const PRESET_MARGIN = 3;

export function placementFromPreset(preset: PlacementPreset): ScreenPlacement {
  switch (preset) {
    case "top-left":
      return { xPercent: PRESET_MARGIN, yPercent: PRESET_MARGIN };
    case "top-right":
      return { xPercent: 100 - PRESET_MARGIN, yPercent: PRESET_MARGIN };
    case "bottom-left":
      return { xPercent: PRESET_MARGIN, yPercent: 100 - PRESET_MARGIN };
    case "bottom-right":
      return { xPercent: 100 - PRESET_MARGIN, yPercent: 100 - PRESET_MARGIN };
    case "left":
      return { xPercent: PRESET_MARGIN, yPercent: 50 };
    case "right":
      return { xPercent: 100 - PRESET_MARGIN, yPercent: 50 };
    case "top":
      return { xPercent: 50, yPercent: PRESET_MARGIN };
    case "bottom":
      return { xPercent: 50, yPercent: 100 - PRESET_MARGIN };
  }
}

/** Which preset (if any) matches the current free placement. */
export function matchingPlacementPreset(
  p: ScreenPlacement,
  tolerance = 8,
): PlacementPreset | null {
  const n = normalizeScreenPlacement(p);
  const presets: PlacementPreset[] = [
    "top-left",
    "top",
    "top-right",
    "left",
    "right",
    "bottom-left",
    "bottom",
    "bottom-right",
  ];
  for (const preset of presets) {
    const target = placementFromPreset(preset);
    if (
      Math.abs(n.xPercent - target.xPercent) <= tolerance &&
      Math.abs(n.yPercent - target.yPercent) <= tolerance
    ) {
      return preset;
    }
  }
  return null;
}
