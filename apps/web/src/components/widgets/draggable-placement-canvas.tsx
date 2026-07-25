"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  matchingPlacementPreset,
  normalizeScreenPlacement,
  placementFromPoint,
  placementFromPreset,
  placementLabel,
  pointFromPlacement,
  type PlacementPreset,
  type ScreenPlacement,
} from "@/lib/widgets/screen-placement";

const DRAG_THRESHOLD_PX = 4;

const CORNER_PRESETS: { id: PlacementPreset; label: string }[] = [
  { id: "top-left", label: "Top left" },
  { id: "top-right", label: "Top right" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-right", label: "Bottom right" },
];

const EDGE_PRESETS: { id: PlacementPreset; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
];

/**
 * Live preview: drag the widget group anywhere with the cursor.
 * Also exposes corner + edge position presets.
 */
export function DraggablePlacementCanvas({
  placement,
  onChange,
  label,
  disabled,
  children,
  className = "",
}: {
  placement: ScreenPlacement;
  onChange: (next: ScreenPlacement) => void;
  label: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 300, h: 420 });
  const [groupSize, setGroupSize] = useState({ w: 72, h: 48 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const p = normalizeScreenPlacement(placement);
  const point = pointFromPlacement(p, size.w, size.h, groupSize.w, groupSize.h);
  const activePreset = matchingPlacementPreset(p);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = groupRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setGroupSize({ w: Math.max(24, r.width), h: Math.max(24, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragOrigin.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: point.x,
        originY: point.y,
        moved: false,
      };
    },
    [disabled, point.x, point.y],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const origin = dragOrigin.current;
      if (!origin || origin.pointerId !== e.pointerId) return;
      const dx = e.clientX - origin.startX;
      const dy = e.clientY - origin.startY;
      if (!origin.moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        origin.moved = true;
        setDragging(true);
      }
      e.preventDefault();
      onChange(
        placementFromPoint(
          origin.originX + dx,
          origin.originY + dy,
          size.w,
          size.h,
          groupSize.w,
          groupSize.h,
        ),
      );
    },
    [groupSize.h, groupSize.w, onChange, size.h, size.w],
  );

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const origin = dragOrigin.current;
    if (!origin || origin.pointerId !== e.pointerId) return;
    const wasDragging = origin.moved;
    dragOrigin.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    if (wasDragging) {
      e.preventDefault();
    }
  }, []);

  function PresetButton({
    id,
    label: btnLabel,
  }: {
    id: PlacementPreset;
    label: string;
  }) {
    const active = activePreset === id;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(placementFromPreset(id))}
        className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold disabled:opacity-50 ${
          active
            ? "border-brand bg-brand/5 text-ink"
            : "border-line text-muted hover:border-[#c3ccd9] hover:text-ink"
        }`}
      >
        {btnLabel}
      </button>
    );
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-muted">{label}</p>
        <p className="text-[11px] text-faint">
          {disabled ? "Enable to move" : "Drag or use presets · "}
          {!disabled ? (
            <span className="font-mono">{placementLabel(p)}</span>
          ) : null}
        </p>
      </div>
      <div
        ref={canvasRef}
        className="relative mx-auto h-[480px] w-full max-w-[320px] touch-none overflow-hidden rounded-2xl border border-[#dbe3ee] bg-[#f8fafc] shadow-sm"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          aria-hidden
        >
          <div className="absolute inset-x-6 top-6 h-2.5 rounded bg-[#e2e8f0]" />
          <div className="absolute inset-x-6 top-12 h-2 w-1/2 rounded bg-[#e8edf5]" />
          <div className="absolute inset-x-6 top-20 bottom-10 rounded-xl border border-dashed border-[#d5dde8] bg-white/80" />
          <p className="absolute inset-x-0 bottom-3 text-center text-[10px] font-medium text-[#94a3b8]">
            Live view — drag the group anywhere
          </p>
        </div>

        <div
          ref={groupRef}
          role="group"
          aria-label={`${label} — drag to reposition`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`absolute z-10 max-w-[92%] select-none ${
            disabled
              ? "cursor-not-allowed opacity-50"
              : dragging
                ? "cursor-grabbing"
                : "cursor-grab"
          }`}
          style={{ left: point.x, top: point.y }}
        >
          <div
            className={`rounded-xl transition ${
              dragging
                ? "scale-[1.02] ring-2 ring-brand/60 shadow-lg"
                : "hover:ring-2 hover:ring-brand/30"
            }`}
          >
            <div className="mb-1 flex items-center justify-center gap-1 rounded-md bg-[#13233c]/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/90">
              <span aria-hidden>⠿</span> Drag
            </div>
            {children}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Position
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {CORNER_PRESETS.map((preset) => (
              <PresetButton
                key={preset.id}
                id={preset.id}
                label={preset.label}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Edges
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {EDGE_PRESETS.map((preset) => (
              <PresetButton
                key={preset.id}
                id={preset.id}
                label={preset.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
