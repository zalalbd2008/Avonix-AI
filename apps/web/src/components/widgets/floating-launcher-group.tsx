"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  DEFAULT_LAUNCHER_METRICS,
  ICON_SIZE_MAX,
  ICON_SIZE_MIN,
  PADDING_MAX,
  PADDING_MIN,
  launcherCornerRadiusPx,
  launcherOuterPx,
  normalizeButtonPadding,
  normalizeIconSize,
  normalizeLauncherMetrics,
  type LauncherMetrics,
} from "@/lib/widgets/launcher-size";
import {
  normalizeScreenPlacement,
  type ScreenPlacement,
} from "@/lib/widgets/screen-placement";

export type { LauncherMetrics } from "@/lib/widgets/launcher-size";
export {
  DEFAULT_LAUNCHER_METRICS,
  ICON_SIZE_MAX,
  ICON_SIZE_MIN,
  PADDING_MAX,
  PADDING_MIN,
  normalizeButtonPadding,
  normalizeIconSize,
  normalizeLauncherMetrics,
} from "@/lib/widgets/launcher-size";

/** Screenshot orange — rgb(225, 93, 26). */
export const LAUNCHER_ORANGE = "#e15d1a";
/** Live-chat status ring. */
export const LAUNCHER_ONLINE = "#7CFC28";

/** Left half of the screen → start-align icon + panel; right half → end-align. */
export function placementHorizontalAlign(
  placement: ScreenPlacement,
): "start" | "end" {
  return normalizeScreenPlacement(placement).xPercent < 50 ? "start" : "end";
}

/**
 * Shared floating chrome: tooltip/panel box + launcher icon.
 * Used by Languages, Accessibility, and Live Chat previews so the icon
 * always moves with the box and mirrors left/right alignment.
 */
export function FloatingLauncherGroup({
  placement,
  open,
  panel,
  launcher,
}: {
  placement: ScreenPlacement;
  open: boolean;
  panel: ReactNode;
  launcher: ReactNode;
}) {
  const align = placementHorizontalAlign(placement);

  return (
    <div
      className={`flex flex-col gap-1.5 ${
        align === "start" ? "items-start" : "items-end"
      }`}
    >
      {open ? (
        <div className="w-[210px] overflow-hidden rounded-xl border border-[#e8edf5] bg-white shadow-lg">
          {panel}
        </div>
      ) : null}
      {launcher}
    </div>
  );
}

export function FloatingPanelHeader({
  title,
  onClose,
}: {
  title: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#eef2f7] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
        {title}
      </p>
      {onClose ? (
        <button
          type="button"
          data-no-drag
          className="text-[11px] text-faint hover:text-ink"
          onClick={onClose}
        >
          Close
        </button>
      ) : null}
    </div>
  );
}

/**
 * Edge-dock tile radius:
 * Left → flat on left, rounded on right.
 * Right → flat on right, rounded on left.
 */
export function launcherTileRadius(
  align: "start" | "end",
  cornerPx: number,
): string {
  const r = `${cornerPx}px`;
  return align === "start" ? `0 ${r} ${r} 0` : `${r} 0 0 ${r}`;
}

function ValueBar({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-ink">
        {label}
      </span>
      <div className="flex items-center gap-2.5">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-w-0 flex-1 accent-[var(--brand,#e15d1a)]"
          aria-label={label}
        />
        <div className="relative shrink-0">
          <input
            type="number"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") return;
              onChange(Number(raw));
            }}
            onBlur={(e) => {
              const n = Number(e.target.value);
              onChange(Number.isFinite(n) ? n : min);
            }}
            className="w-[4.25rem] rounded-lg border border-[#e8edf5] bg-white py-1.5 pl-2 pr-7 text-right font-mono text-[12px] text-ink outline-none focus:border-brand"
            aria-label={`${label} value`}
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-faint">
            px
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Continuous icon size + button padding bars (no fixed presets).
 */
export function LauncherSizeControl({
  value,
  onChange,
}: {
  value: Partial<LauncherMetrics> | string | null | undefined;
  onChange: (next: LauncherMetrics) => void;
}) {
  const m = normalizeLauncherMetrics(value);
  const outer = launcherOuterPx(m);

  return (
    <div className="space-y-3">
      <ValueBar
        label="Icon size"
        value={m.iconSize}
        min={ICON_SIZE_MIN}
        max={ICON_SIZE_MAX}
        onChange={(iconSize) =>
          onChange(normalizeLauncherMetrics({ ...m, iconSize }))
        }
      />
      <ValueBar
        label="Button padding"
        value={m.buttonPadding}
        min={PADDING_MIN}
        max={PADDING_MAX}
        onChange={(buttonPadding) =>
          onChange(normalizeLauncherMetrics({ ...m, buttonPadding }))
        }
      />
      <p className="text-[11px] text-faint">
        Button outer size{" "}
        <span className="font-mono text-muted">{outer}×{outer}px</span>
      </p>
    </div>
  );
}

/**
 * Square launcher tiles (Accessibility / Languages / Chat).
 * One side has no radius — the side flush to the screen edge.
 * Left/right placement flips radius, label side, and status-dot side.
 */
export function FloatingLauncherButton({
  label,
  color = LAUNCHER_ORANGE,
  colorEnd,
  children,
  onClick,
  align = "end",
  showLabel = true,
  avatarUrl,
  online = true,
  metrics,
  shape = "tile",
}: {
  label: string;
  color?: string;
  /** Gradient end for circular chat launcher. */
  colorEnd?: string;
  children?: ReactNode;
  onClick?: () => void;
  align?: "start" | "end";
  showLabel?: boolean;
  avatarUrl?: string | null;
  online?: boolean;
  metrics?: Partial<LauncherMetrics> | string | null;
  /** `circle` = Live Chat FAB; `tile` = edge-dock for Languages / Accessibility. */
  shape?: "circle" | "tile";
}) {
  const labelOnStart = align === "end";
  const isAvatar = Boolean(avatarUrl);
  const m = normalizeLauncherMetrics(metrics ?? DEFAULT_LAUNCHER_METRICS);
  const px = Math.max(1, launcherOuterPx(m));
  const corner = launcherCornerRadiusPx(m);
  const radius = shape === "circle" ? "50%" : launcherTileRadius(align, corner);
  const flushLeft = align === "start";
  const borderW = Math.max(2, Math.round(px * (3 / 44)));
  const dot = Math.max(7, Math.round(px * (9 / 44)));
  const end = colorEnd || color;

  const tileStyle: CSSProperties = isAvatar
    ? {
        width: px,
        height: px,
        borderRadius: radius,
        padding: 0,
        borderTop: `${borderW}px solid ${LAUNCHER_ONLINE}`,
        borderBottom: `${borderW}px solid ${LAUNCHER_ONLINE}`,
        borderLeft: flushLeft ? "none" : `${borderW}px solid ${LAUNCHER_ONLINE}`,
        borderRight: flushLeft
          ? `${borderW}px solid ${LAUNCHER_ONLINE}`
          : "none",
        backgroundColor: "#111",
        boxSizing: "border-box",
        boxShadow: flushLeft
          ? "2px 2px 10px rgba(15,23,42,0.16)"
          : "-2px 2px 10px rgba(15,23,42,0.16)",
      }
    : {
        width: px,
        height: px,
        borderRadius: radius,
        border: "none",
        padding: m.buttonPadding,
        background:
          shape === "circle"
            ? `linear-gradient(145deg, ${end} 0%, ${color} 100%)`
            : color,
        backgroundColor: color,
        boxSizing: "border-box",
        boxShadow:
          shape === "circle"
            ? `0 10px 28px color-mix(in srgb, ${color} 38%, transparent), 0 2px 6px rgba(15,23,42,.12)`
            : flushLeft
              ? "2px 2px 10px rgba(15,23,42,0.16)"
              : "-2px 2px 10px rgba(15,23,42,0.16)",
      };

  return (
    <div
      className={`group/launcher flex items-center gap-2 ${
        labelOnStart ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <button
        type="button"
        data-no-drag
        aria-label={label}
        title={label}
        onClick={onClick}
        className="relative grid shrink-0 place-items-center overflow-hidden text-white transition hover:brightness-105 [&_img]:size-[1em] [&_svg]:size-[1em]"
        style={{ ...tileStyle, fontSize: m.iconSize }}
      >
        {isAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl!} alt="" className="size-full object-cover" />
        ) : (
          children
        )}
        {online && (isAvatar || shape === "circle") ? (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: shape === "circle" ? 4 : borderW,
              ...(shape === "circle"
                ? { right: 4 }
                : flushLeft
                  ? { right: borderW }
                  : { left: borderW }),
              width: dot,
              height: dot,
              borderRadius: 999,
              backgroundColor: LAUNCHER_ONLINE,
              border: "1.5px solid #fff",
            }}
          />
        ) : null}
      </button>
      {showLabel ? (
        <span className="pointer-events-none max-w-0 overflow-hidden whitespace-nowrap rounded-md bg-[#e9e9e9] text-[12px] font-medium text-[#2a2f38] opacity-0 shadow-sm transition-all duration-150 group-hover/launcher:max-w-[160px] group-hover/launcher:px-2.5 group-hover/launcher:py-1.5 group-hover/launcher:opacity-100">
          {label}
        </span>
      ) : null}
    </div>
  );
}

/** Universal-access figure (screenshot Accessibility icon). */
export function UniversalAccessGlyph({
  className = "size-5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="4" r="2" />
      <path d="M5 9.25c0-.69.56-1.25 1.25-1.25h11.5c.69 0 1.25.56 1.25 1.25v.2c0 .55-.36 1.04-.89 1.2L15 10.9v2.35l2.85 6.55a1.1 1.1 0 0 1-2.02.88L13.2 14.4h-2.4L8.17 20.68a1.1 1.1 0 1 1-2.02-.88L9 13.25V10.9l-2.11-.25A1.25 1.25 0 0 1 5 9.45v-.2z" />
    </svg>
  );
}

/** A + 文 translate mark (screenshot Languages icon). */
export function TranslateGlyph({
  className = "size-5",
}: {
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/widgets/icon-lang-hi.png"
      alt=""
      className={className}
      draggable={false}
    />
  );
}
