/**
 * Floating FAB group — Live Chat + Accessibility + Languages.
 * When enabled, linked members share one X and stack top→bottom with a fixed gap.
 * Unlinked members keep their own placement.
 */

import {
  defaultScreenPlacement,
  normalizeScreenPlacement,
  type ScreenPlacement,
} from "@/lib/widgets/screen-placement";
import { SHARED_LAUNCHER_OUTER_PX } from "@/lib/widgets/launcher-size";

export type FabId = "accessibility" | "languages" | "chat";

export type FloatingFabGroupSettings = {
  /** Stack linked FABs together (default true). */
  enabled: boolean;
  /** Pixel gap between tiles (default 1). */
  gapPx: number;
  /** Top → bottom order. */
  order: FabId[];
  /** Top-left of the first (top) linked FAB. */
  placement: ScreenPlacement;
  members: Record<FabId, { linked: boolean }>;
};

export const FAB_IDS: FabId[] = ["accessibility", "languages", "chat"];

export const DEFAULT_FAB_GROUP: FloatingFabGroupSettings = {
  enabled: true,
  gapPx: 1,
  order: ["accessibility", "languages", "chat"],
  placement: defaultScreenPlacement("bottom-left", 0, 120),
  members: {
    accessibility: { linked: true },
    languages: { linked: true },
    chat: { linked: true },
  },
};

function clampGap(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : 1;
  return Math.max(0, Math.min(24, v));
}

function normalizeOrder(raw: unknown): FabId[] {
  const seen = new Set<FabId>();
  const out: FabId[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (
        (item === "accessibility" || item === "languages" || item === "chat") &&
        !seen.has(item)
      ) {
        seen.add(item);
        out.push(item);
      }
    }
  }
  for (const id of DEFAULT_FAB_GROUP.order) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

export function mergeFloatingFabGroup(
  raw?: Partial<FloatingFabGroupSettings> | null,
): FloatingFabGroupSettings {
  const base = DEFAULT_FAB_GROUP;
  const membersIn = raw?.members ?? {};
  return {
    enabled: raw?.enabled !== false,
    gapPx: clampGap(raw?.gapPx ?? base.gapPx),
    order: normalizeOrder(raw?.order),
    placement: normalizeScreenPlacement(raw?.placement, base.placement),
    members: {
      accessibility: {
        linked: membersIn.accessibility?.linked !== false,
      },
      languages: {
        linked: membersIn.languages?.linked !== false,
      },
      chat: {
        linked: membersIn.chat?.linked !== false,
      },
    },
  };
}

/** Linked ids in stack order (only those marked linked while group is on). */
export function linkedFabIds(group: FloatingFabGroupSettings): FabId[] {
  const g = mergeFloatingFabGroup(group);
  if (!g.enabled) return [];
  return g.order.filter((id) => g.members[id]?.linked !== false);
}

export function isFabLinked(
  group: FloatingFabGroupSettings | null | undefined,
  id: FabId,
): boolean {
  const g = mergeFloatingFabGroup(group);
  return g.enabled && g.members[id]?.linked !== false;
}

/**
 * Pixel top-left for each linked FAB given viewport + outer sizes.
 * Unlinked / missing sizes are omitted.
 */
export function resolveFabStackPixels(
  group: FloatingFabGroupSettings,
  sizes: Partial<Record<FabId, number>>,
  vw: number,
  vh: number,
  edgeInset = 0,
): Partial<Record<FabId, { x: number; y: number }>> {
  const g = mergeFloatingFabGroup(group);
  const linked = linkedFabIds(g).filter(
    (id) => typeof sizes[id] === "number" && (sizes[id] as number) > 0,
  );
  if (!linked.length) return {};

  const firstSize = sizes[linked[0]] ?? SHARED_LAUNCHER_OUTER_PX;
  let x = Math.round((g.placement.xPercent / 100) * vw);
  let y = Math.round((g.placement.yPercent / 100) * vh);
  const maxX = Math.max(edgeInset, vw - firstSize - edgeInset);
  const stackH =
    linked.reduce((sum, id) => sum + (sizes[id] ?? 0), 0) +
    g.gapPx * Math.max(0, linked.length - 1);
  const maxY = Math.max(edgeInset, vh - stackH - edgeInset);
  x = Math.min(maxX, Math.max(edgeInset, x));
  y = Math.min(maxY, Math.max(edgeInset, y));

  const out: Partial<Record<FabId, { x: number; y: number }>> = {};
  let cursor = y;
  for (const id of linked) {
    const size = sizes[id] ?? SHARED_LAUNCHER_OUTER_PX;
    const slotX = Math.min(
      Math.max(edgeInset, vw - size - edgeInset),
      Math.max(edgeInset, x),
    );
    out[id] = { x: slotX, y: cursor };
    cursor += size + g.gapPx;
  }
  return out;
}

/** % placement for one linked slot (for writing back into per-widget fields). */
export function fabSlotPlacement(
  group: FloatingFabGroupSettings,
  id: FabId,
  sizes: Partial<Record<FabId, number>>,
  vw = 360,
  vh = 640,
): ScreenPlacement | null {
  const pixels = resolveFabStackPixels(group, sizes, vw, vh, 0);
  const slot = pixels[id];
  if (!slot) return null;
  return {
    xPercent: Math.round((slot.x / Math.max(1, vw)) * 1000) / 10,
    yPercent: Math.round((slot.y / Math.max(1, vh)) * 1000) / 10,
  };
}

/** Public connector payload (no secrets). */
export function toConnectorFabGroup(raw?: Partial<FloatingFabGroupSettings> | null) {
  const g = mergeFloatingFabGroup(raw);
  return {
    enabled: g.enabled,
    gap_px: g.gapPx,
    order: g.order,
    placement: g.placement,
    members: {
      accessibility: { linked: g.members.accessibility.linked },
      languages: { linked: g.members.languages.linked },
      chat: { linked: g.members.chat.linked },
    },
  };
}

export type ConnectorFabGroup = ReturnType<typeof toConnectorFabGroup>;
