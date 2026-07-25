"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Fragment, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ChoiceIconPreview, FormIcon, iconForFieldType } from "@/components/forms/icons";
import {
  LayoutSuggestionsBar,
  RowSuggestionChip,
} from "@/components/forms/layout-suggestions-bar";
import type {
  FormField,
  FormFieldContainer,
  FormFieldType,
  FormRowConfig,
  FormStep,
} from "@/lib/db/schema";
import {
  alignmentGuideSpans,
  CANVAS_BREAKPOINTS,
  forcesFullWidth,
  hasBreakpointOverride,
  snapSpanFromPointer,
  spanForBreakpoint,
  spanLabel,
  widthPatchForBreakpoint,
  type ColSpan,
  type FieldWidthBreakpoint,
} from "@/lib/forms/field-width";
import {
  collectLayoutSuggestions,
  type LayoutSuggestion,
} from "@/lib/forms/layout-suggestions";
import {
  isPaletteDrag,
  readPaletteDragData,
  type PaletteDragPayload,
  type PaletteDropAnchor,
} from "@/lib/forms/palette-drag";
import {
  canJoinRow,
  fieldColReactStyle,
  groupFieldsIntoSectionBlocks,
  resolveRow,
  rowReactStyle,
  type RowDropPlacement,
  type StructureUnit,
} from "@/lib/forms/structure";

type TypeMeta = Record<FormFieldType, { label: string; hint: string }>;

/** Live drop cue while dragging over a field. */
type DropIndicator = {
  overKey: string;
  edge: RowDropPlacement;
  valid: boolean;
};

type DropHint =
  | {
      kind: "reorder" | "side" | "split" | "section";
      valid: boolean;
      reason?: "locked" | "empty" | "incompatible";
    }
  | { kind: "step"; stepTitle: string; valid: boolean }
  | null;

/** Prefer page drop zones when the pointer is over them. */
const stepAwareCollision: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  const stepHits = pointerHits.filter((c) =>
    String(c.id).startsWith("step-drop:"),
  );
  if (stepHits.length) return stepHits;
  return closestCenter(args);
};

export function BuilderCanvas({
  steps,
  activeStepId,
  stepFields,
  rows = [],
  selectedKeys,
  collapsedSections,
  typeMeta,
  canAddStep,
  onSelectStep,
  onAddStep,
  onSelectField,
  onDuplicate,
  onDelete,
  onToggleLock,
  onTogglePin,
  onToggleCollapse,
  onRowAwareDrop,
  onResizeWidth,
  onPaletteDrop,
  onMoveToStep,
  onApplyLayoutSuggestion,
  onPatchRow,
  stepFieldCounts = {},
}: {
  steps: FormStep[];
  activeStepId: string;
  stepFields: FormField[];
  /** Named row configs from settings.rows — equal-height / gap chrome. */
  rows?: FormRowConfig[];
  selectedKeys: string[];
  collapsedSections: Record<string, boolean>;
  typeMeta: TypeMeta;
  canAddStep: boolean;
  /** Field counts per step — badges on page drop zones. */
  stepFieldCounts?: Record<string, number>;
  onSelectStep: (id: string) => void;
  onAddStep: () => void;
  onSelectField: (key: string, e: React.MouseEvent) => void;
  onDuplicate: (key: string) => void;
  onDelete: (keys: string[]) => void;
  onToggleLock: (key: string) => void;
  onTogglePin: (key: string) => void;
  onToggleCollapse: (key: string) => void;
  /** Side-by-side merge / split / stack. */
  onRowAwareDrop: (args: {
    activeKey: string;
    overKey: string;
    placement: RowDropPlacement;
  }) => void;
  /** Commit snapped column width for the active canvas breakpoint. */
  onResizeWidth: (key: string, patch: Partial<FormField>) => void;
  /** Insert a field/pack dragged from the left palette. */
  onPaletteDrop: (
    payload: PaletteDragPayload,
    anchor: PaletteDropAnchor,
  ) => void;
  onMoveToStep: (keys: string[], stepId: string) => void;
  /** Apply an auto-layout suggestion (Step 11). */
  onApplyLayoutSuggestion: (
    suggestion: LayoutSuggestion,
    opts?: { mode?: "fit" | "split"; bp: FieldWidthBreakpoint },
  ) => void;
  /** Patch a named row config (Grid/Flex toggle, etc.). */
  onPatchRow: (rowId: string, patch: Partial<FormRowConfig>) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStepId, setOverStepId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(
    null,
  );
  const [dropHint, setDropHint] = useState<DropHint>(null);
  const [resizePreview, setResizePreview] = useState<{
    key: string;
    span: ColSpan;
  } | null>(null);
  const [paletteDrop, setPaletteDrop] = useState<PaletteDropAnchor>(null);
  const [paletteCanvasHot, setPaletteCanvasHot] = useState(false);
  const [canvasBp, setCanvasBp] =
    useState<FieldWidthBreakpoint>("desktop");
  const [dismissedSuggestions, setDismissedSuggestions] = useState<
    Set<string>
  >(() => new Set());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const ids = stepFields.map((f) => f.key);
  const activeField = stepFields.find((f) => f.key === activeId) ?? null;
  const sectionBlocks = groupFieldsIntoSectionBlocks(stepFields);
  const frameMax =
    CANVAS_BREAKPOINTS.find((b) => b.id === canvasBp)?.frameMax ?? "100%";
  const layoutSuggestions = useMemo(
    () => collectLayoutSuggestions(stepFields, rows, canvasBp),
    [stepFields, rows, canvasBp],
  );

  function suggestionForRow(rowId: string): LayoutSuggestion | undefined {
    return layoutSuggestions.find(
      (s) =>
        s.rowId === rowId &&
        !dismissedSuggestions.has(s.id) &&
        (s.kind === "wrap_overflow" ||
          s.kind === "equal_widths" ||
          s.kind === "fill_row" ||
          s.kind === "equal_height"),
    );
  }

  function clearDropUi() {
    setActiveId(null);
    setOverStepId(null);
    setDropIndicator(null);
    setDropHint(null);
  }

  function spanOf(f: FormField): ColSpan {
    if (resizePreview?.key === f.key) return resizePreview.span;
    return spanForBreakpoint(f, canvasBp);
  }

  function canResizeField(f: FormField): boolean {
    return (
      !f.locked &&
      !f.lockWidth &&
      !forcesFullWidth(f.type) &&
      f.type !== "hidden"
    );
  }

  function neighborSpansFor(key: string): ColSpan[] {
    return stepFields
      .filter((f) => f.key !== key && !forcesFullWidth(f.type))
      .map((f) => spanForBreakpoint(f, canvasBp));
  }

  function commitResize(f: FormField, span: ColSpan) {
    setResizePreview(null);
    if (span === spanForBreakpoint(f, canvasBp)) return;
    onResizeWidth(f.key, widthPatchForBreakpoint(canvasBp, span));
  }

  function cardProps(f: FormField) {
    const isTarget = dropIndicator?.overKey === f.key;
    const paletteTarget = paletteDrop?.overKey === f.key;
    return {
      field: f,
      selected: selectedKeys.includes(f.key),
      multi: selectedKeys.length > 1 && selectedKeys.includes(f.key),
      collapsed: Boolean(collapsedSections[f.key]),
      typeMeta,
      dropEdge: isTarget
        ? dropIndicator!.edge
        : paletteTarget
          ? paletteDrop!.edge
          : null,
      dropValid: isTarget ? dropIndicator.valid : true,
      isDropTarget: isTarget || paletteTarget,
      canvasBp,
      onSelect: onSelectField,
      onDuplicate: () => onDuplicate(f.key),
      onDelete: () => onDelete([f.key]),
      onToggleLock: () => onToggleLock(f.key),
      onTogglePin: () => onTogglePin(f.key),
      onToggleCollapse: () => onToggleCollapse(f.key),
    };
  }

  function clearPaletteDropUi() {
    setPaletteDrop(null);
    setPaletteCanvasHot(false);
  }

  function handlePaletteDragOverField(
    key: string,
    e: React.DragEvent<HTMLElement>,
  ) {
    if (!isPaletteDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setPaletteCanvasHot(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const edge: "before" | "after" =
      e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setPaletteDrop({ overKey: key, edge });
  }

  function handlePaletteDropOnField(
    key: string,
    e: React.DragEvent<HTMLElement>,
  ) {
    if (!isPaletteDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const payload = readPaletteDragData(e);
    const rect = e.currentTarget.getBoundingClientRect();
    const edge: "before" | "after" =
      e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    clearPaletteDropUi();
    if (payload) onPaletteDrop(payload, { overKey: key, edge });
  }

  function handlePaletteDragOverCanvas(e: React.DragEvent<HTMLElement>) {
    if (!isPaletteDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setPaletteCanvasHot(true);
  }

  function handlePaletteDropOnCanvas(e: React.DragEvent<HTMLElement>) {
    if (!isPaletteDrag(e)) return;
    e.preventDefault();
    const payload = readPaletteDragData(e);
    const anchor = paletteDrop;
    clearPaletteDropUi();
    if (payload) onPaletteDrop(payload, anchor);
  }

  function renderStructureUnits(units: StructureUnit[]) {
    return units.map((unit) => {
      if (unit.kind === "row") {
        const row = resolveRow(unit.rowId, rows);
        const equal = Boolean(row?.equalHeight);
        const rowMode = row?.mode === "flex" ? "flex" : "grid";
        const rowSuggestion = suggestionForRow(unit.rowId);
        const rowHot =
          dropIndicator != null &&
          unit.fields.some((f) => f.key === dropIndicator.overKey) &&
          (dropIndicator.edge === "left" || dropIndicator.edge === "right") &&
          dropIndicator.valid;
        const layoutStyle = rowReactStyle(row);
        return (
          <div
            key={`row:${unit.rowId}`}
            data-avx-grid={rowMode === "grid" ? "" : undefined}
            data-avx-flex={rowMode === "flex" ? "" : undefined}
            className={`col-span-full rounded-xl border border-dashed p-2 transition duration-150 ${
              rowHot
                ? "border-brand bg-[rgba(255,102,0,.1)] shadow-[0_0_0_1px_rgba(255,102,0,.25)] ring-2 ring-brand/30"
                : rowSuggestion?.severity === "warn"
                  ? "border-[rgba(255,102,0,.55)] bg-[rgba(255,102,0,.06)]"
                  : "border-[rgba(255,102,0,.35)] bg-[rgba(255,102,0,.04)]"
            }`}
            style={layoutStyle}
          >
            <div
              className={`${rowMode === "flex" ? "w-full basis-full" : "col-span-full"} mb-0.5 flex flex-wrap items-center gap-2 px-0.5`}
            >
              <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-brand uppercase">
                Row
              </span>
              <div className="flex rounded-md border border-[#dbe1ea] bg-white p-0.5">
                {(["grid", "flex"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    title={
                      m === "flex"
                        ? "Flex · wrap freely, unlimited columns"
                        : "Grid · strict 12-col tracks"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (m === "grid") {
                        onPatchRow(unit.rowId, {
                          mode: undefined,
                          wrap: undefined,
                        });
                      } else {
                        onPatchRow(unit.rowId, { mode: "flex", wrap: true });
                      }
                    }}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                      rowMode === m
                        ? "bg-brand text-white"
                        : "text-faint hover:text-brand"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <span className="truncate text-[11px] text-faint">
                {unit.fields.length} fields
                {equal ? " · equal H" : ""}
                {rowMode === "flex" && row?.wrap !== false ? " · wrap" : ""}
                {rowHot ? " · drop to add column" : ""}
              </span>
              {rowSuggestion ? (
                <span className="ml-auto">
                  <RowSuggestionChip
                    suggestion={rowSuggestion}
                    onApply={(s, mode) => {
                      onApplyLayoutSuggestion(s, { mode, bp: canvasBp });
                      setDismissedSuggestions((prev) =>
                        new Set(prev).add(s.id),
                      );
                    }}
                  />
                </span>
              ) : null}
            </div>
            {unit.fields.map((f) => (
              <ResizableFieldCol
                key={f.key}
                field={f}
                span={spanOf(f)}
                layoutMode={rowMode}
                canResize={canResizeField(f)}
                onPreview={(span) => setResizePreview({ key: f.key, span })}
                onCommit={(span) => commitResize(f, span)}
                onCancel={() => setResizePreview(null)}
                onPaletteDragOver={(e) =>
                  handlePaletteDragOverField(f.key, e)
                }
                onPaletteDrop={(e) => handlePaletteDropOnField(f.key, e)}
              >
                <SortableFieldCard
                  {...cardProps(f)}
                  inRow
                  stretch={equal}
                  displaySpan={spanOf(f)}
                />
              </ResizableFieldCol>
            ))}
          </div>
        );
      }

      const f = unit.field;
      return (
        <ResizableFieldCol
          key={f.key}
          field={f}
          span={spanOf(f)}
          canResize={canResizeField(f)}
          onPreview={(span) => setResizePreview({ key: f.key, span })}
          onCommit={(span) => commitResize(f, span)}
          onCancel={() => setResizePreview(null)}
          onPaletteDragOver={(e) => handlePaletteDragOverField(f.key, e)}
          onPaletteDrop={(e) => handlePaletteDropOnField(f.key, e)}
        >
          <SortableFieldCard {...cardProps(f)} displaySpan={spanOf(f)} />
        </ResizableFieldCol>
      );
    });
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    setDropHint({ kind: "reorder", valid: true });
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) {
      setOverStepId(null);
      setDropIndicator(null);
      setDropHint({ kind: "reorder", valid: false, reason: "empty" });
      return;
    }

    const overId = String(over.id);

    if (overId.startsWith("step-drop:")) {
      const stepId = overId.slice("step-drop:".length);
      setOverStepId(stepId);
      setDropIndicator(null);
      const step = steps.find((s) => s.id === stepId);
      const valid = stepId !== activeStepId;
      setDropHint({
        kind: "step",
        stepTitle: step?.title ?? "page",
        valid,
      });
      return;
    }

    setOverStepId(null);

    if (overId === String(active.id)) {
      setDropIndicator(null);
      setDropHint({ kind: "reorder", valid: true });
      return;
    }

    const overField = stepFields.find((f) => f.key === overId);
    const dragged = stepFields.find((f) => f.key === String(active.id));
    if (!overField || !dragged) {
      setDropIndicator(null);
      setDropHint({ kind: "reorder", valid: false, reason: "empty" });
      return;
    }

    const locked = Boolean(dragged.locked || overField.locked);
    let placement = resolvePlacement(active, over.rect);
    // Sections only stack vertically (move whole block).
    if (dragged.type === "section" && (placement === "left" || placement === "right")) {
      placement = placement === "left" ? "before" : "after";
    }
    const side = placement === "left" || placement === "right";
    const canSide = canJoinRow(dragged) && canJoinRow(overField);

    let valid = !locked;
    let kind: "reorder" | "side" | "split" | "section" = "reorder";
    let reason: "locked" | "incompatible" | undefined;
    let edge: RowDropPlacement = placement;

    if (locked) {
      reason = "locked";
    } else if (dragged.type === "section") {
      kind = "section";
    } else if (side) {
      kind = "side";
      if (!canSide) {
        valid = false;
        reason = "incompatible";
      }
    } else if (
      dragged.rowId &&
      (!overField.rowId || overField.rowId !== dragged.rowId)
    ) {
      kind = "split";
    }

    setDropIndicator({ overKey: overId, edge, valid });
    setDropHint({ kind, valid, reason });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const indicator = dropIndicator;
    clearDropUi();
    if (!over) return;
    const overId = String(over.id);

    if (overId.startsWith("step-drop:")) {
      const targetStep = overId.slice("step-drop:".length);
      if (targetStep === activeStepId) return;
      const moving =
        selectedKeys.includes(String(active.id)) && selectedKeys.length > 1
          ? selectedKeys
          : [String(active.id)];
      onMoveToStep(moving, targetStep);
      return;
    }

    if (active.id === over.id) return;
    const dragged = stepFields.find((f) => f.key === String(active.id));
    const overField = stepFields.find((f) => f.key === overId);
    if (!dragged || !overField || dragged.locked || overField.locked) return;

    const placement =
      indicator?.overKey === overId && indicator.valid
        ? indicator.edge
        : indicator?.overKey === overId
          ? indicator.edge
          : "after";

    // Invalid side → fall back to vertical stack
    let finalPlacement = placement;
    if (
      (finalPlacement === "left" || finalPlacement === "right") &&
      (!canJoinRow(dragged) || !canJoinRow(overField) || indicator?.valid === false)
    ) {
      finalPlacement = finalPlacement === "left" ? "before" : "after";
    }

    onRowAwareDrop({
      activeKey: String(active.id),
      overKey: overId,
      placement: finalPlacement,
    });
  }

  const overlayInvalid = dropHint != null && !dropHint.valid;

  return (
    <DndContext
      id="form-builder-canvas"
      sensors={sensors}
      collisionDetection={stepAwareCollision}
      autoScroll={{
        threshold: { x: 0.12, y: 0.18 },
        acceleration: 12,
        interval: 8,
      }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={clearDropUi}
    >
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div
          className={`border-b border-[#edf0f5] px-3 py-2.5 transition ${
            activeId ? "bg-[#fff8f3]/60" : ""
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
              {activeId ? "Drop on a page" : "Steps"}
            </p>
            {!activeId ? (
              <div className="flex flex-wrap gap-1.5">
                {steps.map((s) => (
                  <StepDropTab
                    key={s.id}
                    step={s}
                    active={activeStepId === s.id}
                    highlight={false}
                    fieldCount={stepFieldCounts[s.id] ?? 0}
                    expanded={false}
                    onSelect={() => onSelectStep(s.id)}
                  />
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={onAddStep}
              disabled={!canAddStep}
              className="ml-auto rounded-lg border border-[#dbe1ea] px-2.5 py-1 text-[12px] font-semibold hover:border-brand hover:text-brand disabled:opacity-40"
            >
              + Step
            </button>
          </div>

          {activeId && steps.length > 0 ? (
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((s) => (
                <StepDropTab
                  key={s.id}
                  step={s}
                  active={activeStepId === s.id}
                  highlight={overStepId === s.id}
                  invalid={
                    overStepId === s.id &&
                    s.id === activeStepId &&
                    Boolean(activeId)
                  }
                  fieldCount={stepFieldCounts[s.id] ?? 0}
                  expanded
                  movingCount={
                    selectedKeys.includes(String(activeId)) &&
                    selectedKeys.length > 1
                      ? selectedKeys.length
                      : activeField?.type === "section"
                        ? undefined
                        : 1
                  }
                  isSectionMove={activeField?.type === "section"}
                  onSelect={() => onSelectStep(s.id)}
                />
              ))}
            </div>
          ) : null}
        </div>

        {activeId && dropHint ? (
          <DropStatusBar hint={dropHint} />
        ) : null}

        {resizePreview ? (
          <div
            className="flex items-center gap-2 border-b border-[rgba(255,102,0,.2)] bg-[#fff8f3] px-3 py-1.5 text-[11.5px] font-semibold text-brand"
            role="status"
          >
            <FormIcon name="column" size="xs" />
            Resizing {canvasBp} · {spanLabel(resizePreview.span)}
            <span className="ml-auto hidden font-medium text-faint sm:inline">
              Snaps to 12-col · edits {canvasBp} width
            </span>
          </div>
        ) : null}

        {paletteCanvasHot && !resizePreview && !activeId ? (
          <div
            className="flex items-center gap-2 border-b border-[rgba(255,102,0,.2)] bg-[#fff8f3] px-3 py-1.5 text-[11.5px] font-semibold text-brand"
            role="status"
          >
            <FormIcon name="add" size="xs" />
            {paletteDrop
              ? `Drop to insert ${paletteDrop.edge} this field`
              : "Drop to add field on this step"}
            <span className="ml-auto hidden font-medium text-faint sm:inline">
              Drag from left palette
            </span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0f5] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
            Canvas
          </p>
          <div className="flex flex-wrap gap-1">
            {CANVAS_BREAKPOINTS.map((bp) => (
              <button
                key={bp.id}
                type="button"
                title={bp.hint}
                onClick={() => setCanvasBp(bp.id)}
                className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition ${
                  canvasBp === bp.id
                    ? "border-brand bg-[rgba(255,102,0,.12)] text-brand"
                    : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
                }`}
              >
                {bp.label}
              </button>
            ))}
          </div>
          {selectedKeys.length > 1 ? (
            <span className="rounded-full border border-brand/30 bg-[rgba(255,102,0,.1)] px-2 py-0.5 text-[11px] font-semibold text-brand">
              {selectedKeys.length} selected
            </span>
          ) : null}
          <span className="ml-auto text-[11px] text-faint">
            {CANVAS_BREAKPOINTS.find((b) => b.id === canvasBp)?.hint} · frame{" "}
            {frameMax}
          </span>
        </div>

        <LayoutSuggestionsBar
          suggestions={layoutSuggestions}
          dismissed={dismissedSuggestions}
          onApply={(s, mode) => {
            onApplyLayoutSuggestion(s, { mode, bp: canvasBp });
            setDismissedSuggestions((prev) => new Set(prev).add(s.id));
          }}
          onDismiss={(id) =>
            setDismissedSuggestions((prev) => new Set(prev).add(id))
          }
        />

        <div
          className={`max-h-[min(62vh,640px)] overflow-y-auto p-3 transition ${
            paletteCanvasHot && !paletteDrop
              ? "bg-[rgba(255,102,0,.04)] ring-2 ring-inset ring-brand/25"
              : canvasBp !== "desktop"
                ? "bg-[#f4f6f9]"
                : ""
          }`}
          onDragOver={handlePaletteDragOverCanvas}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              clearPaletteDropUi();
            }
          }}
          onDrop={handlePaletteDropOnCanvas}
        >
          <div
            className={`mx-auto transition-[max-width] duration-200 ${
              canvasBp !== "desktop"
                ? "rounded-xl border border-[#dbe1ea] bg-white p-2.5 shadow-sm"
                : ""
            }`}
            style={{ maxWidth: frameMax, width: "100%" }}
          >
          {stepFields.length === 0 ? (
            <p
              className={`rounded-xl border border-dashed px-4 py-12 text-center text-[13px] transition ${
                paletteCanvasHot
                  ? "border-brand bg-[#fff8f3] text-brand"
                  : "border-[#dbe1ea] text-muted"
              }`}
            >
              {paletteCanvasHot
                ? "Drop here to add a field"
                : "No fields on this step. Drag a field from the left palette, or click to add."}
            </p>
          ) : (
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="relative">
                <GridOverlay />
                {resizePreview ? (
                  <AlignmentGuides
                    activeSpan={resizePreview.span}
                    guides={alignmentGuideSpans(
                      neighborSpansFor(resizePreview.key),
                      resizePreview.span,
                    )}
                  />
                ) : null}
                <div
                  data-avx-grid
                  className="relative z-[1] grid gap-2.5"
                  style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
                >
                  {sectionBlocks.map((block, bi) => {
                    if (block.kind === "loose") {
                      return (
                        <Fragment key={`loose:${bi}`}>
                          {renderStructureUnits(block.units)}
                        </Fragment>
                      );
                    }

                    const sec = block.section;
                    const collapsed = Boolean(collapsedSections[sec.key]);
                    const bodyCount = block.units.reduce(
                      (n, u) => n + (u.kind === "row" ? u.fields.length : 1),
                      0,
                    );
                    const secHot =
                      dropIndicator?.overKey === sec.key &&
                      dropHint?.kind === "section" &&
                      dropHint.valid;
                    const wrapStyle = containerReactStyle(
                      sec.sectionConfig?.container ?? sec.container,
                    );

                    return (
                      <div
                        key={`section:${sec.key}`}
                        className={`col-span-full rounded-xl border border-dashed p-2 transition ${
                          secHot
                            ? "border-brand bg-[rgba(255,102,0,.08)] ring-2 ring-brand/30"
                            : "border-[#94a3b8]/55 bg-[#f8fafc]"
                        } ${containerChromeClass(
                          sec.sectionConfig?.container ?? sec.container,
                        )}`}
                        style={wrapStyle}
                      >
                        <div className="mb-1.5 flex flex-wrap items-center gap-2 px-0.5">
                          <span className="inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted uppercase">
                            <FormIcon name="section" size="xs" />
                            Section
                          </span>
                          <span className="truncate text-[11px] text-faint">
                            {sec.label || sec.key} · {bodyCount} field
                            {bodyCount === 1 ? "" : "s"}
                            {collapsed ? " · collapsed" : ""}
                            {secHot ? " · move block here" : ""}
                          </span>
                        </div>
                        <div className="min-w-0" style={colSpanStyle(12)}>
                          <ResizableFieldCol
                            field={sec}
                            span={12}
                            canResize={false}
                            onPreview={() => {}}
                            onCommit={() => {}}
                            onCancel={() => {}}
                            onPaletteDragOver={(e) =>
                              handlePaletteDragOverField(sec.key, e)
                            }
                            onPaletteDrop={(e) =>
                              handlePaletteDropOnField(sec.key, e)
                            }
                          >
                            <SortableFieldCard
                              {...cardProps(sec)}
                              displaySpan={12}
                            />
                          </ResizableFieldCol>
                        </div>
                        {collapsed ? (
                          <p className="mt-2 px-1 text-[11.5px] text-faint">
                            Section body collapsed — expand to edit nested rows.
                          </p>
                        ) : block.units.length ? (
                          <div
                            data-avx-grid
                            className="relative mt-2 grid gap-2.5"
                            style={{
                              gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
                            }}
                          >
                            {renderStructureUnits(block.units)}
                          </div>
                        ) : (
                          <p className="mt-2 rounded-lg border border-dashed border-[#dbe1ea] px-3 py-4 text-center text-[11.5px] text-faint">
                            Drop fields here to nest under this section
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </SortableContext>
          )}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeField ? (
          <div
            className={`scale-[1.02] rounded-xl border bg-white px-3.5 py-3 shadow-[0_16px_40px_rgba(11,30,58,.18)] ${
              overlayInvalid
                ? "border-bad ring-2 ring-[rgba(220,38,38,.25)]"
                : "border-brand ring-2 ring-[rgba(255,102,0,.28)]"
            }`}
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold">
              <FormIcon
                name={iconForFieldType(activeField.type)}
                size="sm"
                className={overlayInvalid ? "text-bad" : "text-brand"}
              />
              {activeField.label || activeField.key}
              {selectedKeys.length > 1 && selectedKeys.includes(activeField.key)
                ? ` (+${selectedKeys.length - 1})`
                : ""}
            </span>
            <span
              className={`mt-1 block text-[11px] ${
                overlayInvalid ? "font-semibold text-bad" : "text-faint"
              }`}
            >
              {overlayInvalid
                ? dropHint?.kind === "step"
                  ? "Already on this page"
                  : "Can't drop here"
                : activeField.type === "section"
                  ? "Moving section + nested fields"
                  : spanLabel(spanForBreakpoint(activeField, canvasBp))}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function colSpanStyle(span: ColSpan): CSSProperties {
  return {
    gridColumn: `span ${span} / span ${span}`,
    minWidth: 0,
  };
}

function containerChromeClass(c?: FormFieldContainer | null): string {
  if (!c) return "";
  const parts: string[] = [];
  if (c.variant === "card") {
    parts.push("border-[#e6e9f0] bg-white shadow-sm");
  } else if (c.variant === "glass") {
    parts.push("border-white/60 bg-white/70 backdrop-blur-sm");
  } else if (c.variant === "border") {
    parts.push("border-2 border-[#c3ccd9] bg-transparent");
  } else if (c.variant === "shadow") {
    parts.push("border-transparent bg-white shadow-md");
  }
  if (c.hover) parts.push("transition hover:shadow-lg");
  return parts.join(" ");
}

function containerReactStyle(
  c?: FormFieldContainer | null,
): CSSProperties | undefined {
  if (!c) return undefined;
  const style: CSSProperties = {};
  if (typeof c.padding === "number") style.padding = c.padding;
  if (typeof c.radius === "number") style.borderRadius = c.radius;
  if (c.background) style.background = c.background;
  if (c.borderColor) style.borderColor = c.borderColor;
  return Object.keys(style).length ? style : undefined;
}

/** Map pointer (via active rect center) to before/after/left/right. */
function resolvePlacement(
  active: DragOverEvent["active"],
  overRect: { top: number; left: number; width: number; height: number },
): RowDropPlacement {
  const translated = active.rect.current.translated;
  const cx =
    (translated?.left ?? overRect.left) +
    (translated?.width ?? overRect.width) / 2;
  const cy =
    (translated?.top ?? overRect.top) +
    (translated?.height ?? overRect.height) / 2;
  const relX = (cx - overRect.left) / Math.max(overRect.width, 1);
  const relY = (cy - overRect.top) / Math.max(overRect.height, 1);

  if (relX < 0.28) return "left";
  if (relX > 0.72) return "right";
  return relY < 0.5 ? "before" : "after";
}

/** Faint 12-column guide behind the canvas. */
function GridOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 grid gap-2.5 opacity-[0.28]"
      style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
    >
      {Array.from({ length: 12 }, (_, i) => (
        <div
          key={i}
          className="min-h-full rounded-sm border border-dashed border-[#d5dce8] bg-[#f8fafc]"
        />
      ))}
    </div>
  );
}

/** Stronger vertical lines while resizing — snap + neighbor alignment. */
function AlignmentGuides({
  activeSpan,
  guides,
}: {
  activeSpan: ColSpan;
  guides: ColSpan[];
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[2] grid gap-2.5"
      style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
    >
      {Array.from({ length: 12 }, (_, i) => {
        const col = (i + 1) as ColSpan;
        const isActive = col === activeSpan;
        const isGuide = guides.includes(col);
        if (!isActive && !isGuide) {
          return <div key={i} />;
        }
        return (
          <div key={i} className="relative min-h-full">
            <div
              className={`absolute top-0 right-0 bottom-0 w-0.5 ${
                isActive
                  ? "bg-brand shadow-[0_0_0_2px_rgba(255,102,0,.25)]"
                  : "bg-[#94a3b8]/70"
              }`}
            />
            {isActive ? (
              <span className="absolute top-1 right-1 rounded bg-brand px-1 py-0.5 text-[9px] font-bold text-white">
                {col}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ResizableFieldCol({
  field,
  span,
  canResize,
  layoutMode = "grid",
  onPreview,
  onCommit,
  onCancel,
  onPaletteDragOver,
  onPaletteDrop,
  children,
}: {
  field: FormField;
  span: ColSpan;
  canResize: boolean;
  layoutMode?: "grid" | "flex";
  onPreview: (span: ColSpan) => void;
  onCommit: (span: ColSpan) => void;
  onCancel: () => void;
  onPaletteDragOver?: (e: React.DragEvent<HTMLElement>) => void;
  onPaletteDrop?: (e: React.DragEvent<HTMLElement>) => void;
  children: ReactNode;
}) {
  const colRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    track: number;
    last: ColSpan;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!canResize || !colRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const grid = colRef.current.closest(
      "[data-avx-grid],[data-avx-flex]",
    ) as HTMLElement | null;
    const gridBox = (grid ?? colRef.current).getBoundingClientRect();
    const track = gridBox.width / 12;
    const startX = colRef.current.getBoundingClientRect().left;
    dragRef.current = { startX, track, last: span };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    onPreview(span);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    e.preventDefault();
    e.stopPropagation();
    const next = snapSpanFromPointer({
      startX: drag.startX,
      pointerX: e.clientX,
      trackWidth: drag.track,
    });
    if (next !== drag.last) {
      drag.last = next;
      onPreview(next);
    }
  }

  function endDrag(e: React.PointerEvent<HTMLButtonElement>, commit: boolean) {
    const drag = dragRef.current;
    if (!drag) return;
    const last = drag.last;
    dragRef.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (commit) onCommit(last);
    else onCancel();
  }

  return (
    <div
      ref={colRef}
      className="group/col relative min-w-0"
      style={fieldColReactStyle(span, layoutMode)}
      data-field-key={field.key}
      onDragOver={onPaletteDragOver}
      onDrop={onPaletteDrop}
    >
      {children}
      {canResize ? (
        <button
          type="button"
          aria-label="Resize column width"
          title="Drag to resize · snaps to 12-col"
          className={`absolute top-2 right-0 bottom-2 z-20 w-3 translate-x-1/2 cursor-col-resize touch-none rounded-full border-0 bg-transparent p-0 transition ${
            dragging
              ? "opacity-100"
              : "opacity-0 group-hover/col:opacity-100 focus-visible:opacity-100"
          }`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endDrag(e, true)}
          onPointerCancel={(e) => endDrag(e, false)}
        >
          <span
            className={`mx-auto block h-full w-1 rounded-full shadow-[0_0_0_1px_rgba(255,102,0,.35)] ${
              dragging ? "bg-brand" : "bg-brand/80"
            }`}
          />
        </button>
      ) : null}
      {dragging ? (
        <span className="pointer-events-none absolute -top-2 right-2 z-30 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
          {spanLabel(span)}
        </span>
      ) : null}
    </div>
  );
}

function DropStatusBar({ hint }: { hint: Exclude<DropHint, null> }) {
  let text: string;
  let iconName:
    | "publish"
    | "grip"
    | "lock"
    | "visibility"
    | "column"
    | "row"
    | "section" = "grip";

  if (hint.kind === "step") {
    text = hint.valid
      ? `Drop on “${hint.stepTitle}” to move to that page`
      : "Already on this page — pick another";
    iconName = hint.valid ? "publish" : "visibility";
  } else if (!hint.valid) {
    if (hint.reason === "locked") {
      text = "Can't drop on a locked field";
      iconName = "lock";
    } else if (hint.reason === "incompatible") {
      text = "Can't place side-by-side (section / hidden)";
      iconName = "column";
    } else {
      text = "Drop on a field or step tab";
      iconName = "visibility";
    }
  } else if (hint.kind === "side") {
    text = "Drop to place side-by-side in a row";
    iconName = "column";
  } else if (hint.kind === "section") {
    text = "Drop to move section + nested fields";
    iconName = "section";
  } else if (hint.kind === "split") {
    text = "Drop to leave row · stack full width";
    iconName = "row";
  } else {
    text = "Drop to reorder";
    iconName = "grip";
  }

  return (
    <div
      className={`flex items-center gap-2 border-b px-3 py-1.5 text-[11.5px] font-semibold ${
        hint.valid
          ? "border-[rgba(255,102,0,.2)] bg-[#fff8f3] text-brand"
          : "border-[#fecdca] bg-[#fef2f2] text-bad"
      }`}
      role="status"
    >
      <FormIcon name={iconName} size="xs" />
      {text}
      <span className="ml-auto hidden font-medium text-faint sm:inline">
        {hint.kind === "step"
          ? "Large page cards appear while dragging"
          : "Sides = columns · Top/bottom = stack"}
      </span>
    </div>
  );
}

/** Insertion line — horizontal for before/after, vertical for left/right. */
function DropLine({
  edge,
  valid,
}: {
  edge: RowDropPlacement;
  valid: boolean;
}) {
  const color = valid ? "bg-brand" : "bg-bad";
  if (edge === "left" || edge === "right") {
    return (
      <div
        aria-hidden
        className={`pointer-events-none absolute top-2 bottom-2 z-20 flex flex-col items-center ${
          edge === "left" ? "-left-1" : "-right-1"
        }`}
      >
        <span
          className={`size-2 shrink-0 rounded-full ring-2 ring-white ${color}`}
        />
        <span className={`w-0.5 flex-1 rounded-full ${color}`} />
        <span
          className={`size-2 shrink-0 rounded-full ring-2 ring-white ${color}`}
        />
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute right-2 left-2 z-20 flex items-center ${
        edge === "before" ? "-top-1" : "-bottom-1"
      }`}
    >
      <span
        className={`size-2 shrink-0 rounded-full ring-2 ring-white ${color}`}
      />
      <span className={`h-0.5 flex-1 rounded-full ${color}`} />
      <span
        className={`size-2 shrink-0 rounded-full ring-2 ring-white ${color}`}
      />
    </div>
  );
}

function StepDropTab({
  step,
  active,
  highlight,
  invalid,
  fieldCount,
  expanded,
  movingCount,
  isSectionMove,
  onSelect,
}: {
  step: FormStep;
  active: boolean;
  highlight: boolean;
  invalid?: boolean;
  fieldCount: number;
  expanded: boolean;
  movingCount?: number;
  isSectionMove?: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `step-drop:${step.id}`,
    data: { type: "step", stepId: step.id },
    disabled: !expanded && !highlight,
  });
  const hot = highlight || isOver;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition ${
          active
            ? "bg-brand text-white"
            : "bg-[#f1f4f8] text-muted hover:text-ink"
        }`}
      >
        {step.title}
        <span className="ml-1.5 opacity-70">{fieldCount}</span>
      </button>
    );
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      className={`flex min-h-[64px] flex-col items-start justify-center rounded-xl border px-3 py-2.5 text-left transition ${
        active && invalid
          ? "border-[#f87171] bg-[#fef2f2] text-bad ring-2 ring-[#f87171]/40"
          : hot && !invalid
            ? "border-brand bg-[rgba(255,102,0,.12)] text-brand ring-2 ring-brand/35"
            : active
              ? "border-brand/40 bg-[#fff8f3] text-brand"
              : "border-[#dbe1ea] bg-white text-muted hover:border-brand/40 hover:text-ink"
      }`}
      title={
        invalid
          ? "Already on this page"
          : `Drop to move to “${step.title}”`
      }
    >
      <span className="flex w-full items-center gap-1.5 text-[13px] font-semibold">
        <FormIcon name="publish" size="xs" />
        {step.title}
        {active ? (
          <span className="ml-auto rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
            Current
          </span>
        ) : null}
      </span>
      <span className="mt-1 text-[11px] font-medium opacity-80">
        {fieldCount} field{fieldCount === 1 ? "" : "s"}
        {hot && !invalid
          ? isSectionMove
            ? " · drop section block here"
            : movingCount && movingCount > 1
              ? ` · move ${movingCount} fields here`
              : " · drop here to move"
          : invalid
            ? " · already here"
            : ""}
      </span>
    </button>
  );
}

function SortableFieldCard({
  field: f,
  selected,
  multi,
  collapsed,
  typeMeta,
  inRow,
  stretch,
  dropEdge,
  dropValid,
  isDropTarget,
  displaySpan,
  canvasBp = "desktop",
  onSelect,
  onDuplicate,
  onDelete,
  onToggleLock,
  onTogglePin,
  onToggleCollapse,
}: {
  field: FormField;
  selected: boolean;
  multi: boolean;
  collapsed: boolean;
  typeMeta: TypeMeta;
  inRow?: boolean;
  stretch?: boolean;
  dropEdge?: RowDropPlacement | null;
  dropValid?: boolean;
  isDropTarget?: boolean;
  displaySpan?: ColSpan;
  canvasBp?: FieldWidthBreakpoint;
  onSelect: (key: string, e: React.MouseEvent) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onTogglePin: () => void;
  onToggleCollapse: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: f.key,
      disabled: Boolean(f.locked),
    });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    height: stretch ? "100%" : undefined,
  };

  const targetRing = isDropTarget
    ? dropValid
      ? "ring-2 ring-brand/45 border-brand"
      : "ring-2 ring-[#f87171]/55 border-[#f87171]"
    : "";

  const span =
    displaySpan ?? spanForBreakpoint(f, canvasBp);
  const inherited =
    canvasBp !== "desktop" && !hasBreakpointOverride(f, canvasBp);

  const chrome = containerChromeClass(f.container);
  const chromeStyle = containerReactStyle(f.container);

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...chromeStyle }}
      className={`group relative w-full rounded-xl border text-left transition duration-150 ease-out ${
        stretch ? "h-full" : ""
      } ${
        selected
          ? "border-brand bg-[#fff8f3] shadow-[0_10px_28px_rgba(255,102,0,.14)] ring-2 ring-brand/25"
          : inRow
            ? "border-[#e8edf5] bg-white shadow-[0_1px_0_rgba(11,30,58,.03)] hover:border-[#c3ccd9] hover:shadow-[0_6px_16px_rgba(11,30,58,.06)]"
            : "border-[#dbe1ea] bg-white shadow-[0_1px_0_rgba(11,30,58,.03)] hover:border-[#c3ccd9] hover:shadow-[0_6px_16px_rgba(11,30,58,.06)]"
      } ${chrome} ${multi ? "ring-1 ring-brand/35" : ""} ${targetRing}`}
    >
      {selected ? (
        <span className="pointer-events-none absolute -top-2 left-3 z-10 rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase shadow-sm">
          {spanLabel(span)}
        </span>
      ) : null}
      {dropEdge ? (
        <DropLine edge={dropEdge} valid={dropValid !== false} />
      ) : null}

      <div className="absolute top-2 right-2 z-10 hidden gap-0.5 group-hover:flex">
        <TinyBtn title="Duplicate (⌘D)" onClick={onDuplicate}>
          <FormIcon name="duplicate" size="xs" />
        </TinyBtn>
        <TinyBtn title={f.locked ? "Unlock" : "Lock"} onClick={onToggleLock}>
          <FormIcon name={f.locked ? "unlock" : "lock"} size="xs" />
        </TinyBtn>
        <TinyBtn title={f.pinned ? "Unpin" : "Pin"} onClick={onTogglePin}>
          <FormIcon name={f.pinned ? "unpin" : "pin"} size="xs" />
        </TinyBtn>
        {f.type === "section" ? (
          <TinyBtn title="Collapse section" onClick={onToggleCollapse}>
            <FormIcon name={collapsed ? "expand" : "collapse"} size="xs" />
          </TinyBtn>
        ) : null}
        <TinyBtn
          title="Delete"
          danger
          onClick={onDelete}
          disabled={Boolean(f.locked)}
        >
          <FormIcon name="remove" size="xs" />
        </TinyBtn>
      </div>

      <div className="flex h-full items-stretch">
        <button
          type="button"
          className={`cursor-grab touch-none px-2 text-faint hover:text-ink active:cursor-grabbing ${
            f.locked ? "cursor-not-allowed opacity-40" : ""
          }`}
          aria-label="Drag to reorder"
          disabled={Boolean(f.locked)}
          {...attributes}
          {...listeners}
        >
          <FormIcon name="grip" size="sm" />
        </button>
        <button
          type="button"
          onClick={(e) => onSelect(f.key, e)}
          className="min-w-0 flex-1 px-2 py-3 pr-3 text-left"
        >
          <span className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-[#f1f4f8] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-muted uppercase">
              <FormIcon
                name={iconForFieldType(f.type)}
                size="xs"
                className="text-muted"
              />
              {f.type}
            </span>
            <span className="truncate text-[11.5px] text-faint">{f.key}</span>
            {f.locked ? (
              <span className="text-[10.5px] font-semibold text-faint">locked</span>
            ) : null}
            {f.pinned ? (
              <span className="text-[10.5px] font-semibold text-faint">pinned</span>
            ) : null}
            {f.condition?.fieldKey ? (
              <span className="text-[10.5px] text-faint">· conditional</span>
            ) : null}
            {f.rowId ? (
              <span className="text-[10.5px] text-faint">· row</span>
            ) : null}
            {f.container?.variant && f.container.variant !== "none" ? (
              <span className="inline-flex items-center gap-0.5 text-[10.5px] text-faint">
                · <FormIcon name="container" size="xs" className="inline" />{" "}
                {f.container.variant}
              </span>
            ) : null}
            {f.lockWidth ? (
              <span className="text-[10.5px] font-semibold text-faint">
                · width locked
              </span>
            ) : null}
            <span className="rounded bg-[#eef2f7] px-1.5 py-0.5 text-[10px] font-semibold text-muted">
              {spanLabel(span)}
              {canvasBp !== "desktop" ? ` · ${canvasBp}` : ""}
            </span>
            {inherited ? (
              <span className="text-[10.5px] font-semibold text-faint">
                · inherited
              </span>
            ) : null}
          </span>

          {collapsed && f.type === "section" ? (
            <span className="block text-[13px] font-semibold text-muted">
              {f.label || "Section"} · collapsed
            </span>
          ) : (
            <FieldPreviewBody f={f} typeMeta={typeMeta} />
          )}
        </button>
      </div>
    </div>
  );
}

function TinyBtn({
  children,
  onClick,
  title,
  danger,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center justify-center rounded border bg-white p-1 shadow-sm disabled:opacity-35 ${
        danger
          ? "border-[#fecdca] text-bad hover:bg-[#fef2f2]"
          : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}

function FieldPreviewBody({
  f,
  typeMeta,
}: {
  f: FormField;
  typeMeta: TypeMeta;
}) {
  if (f.type === "section") {
    return (
      <span className="block border-b border-[#e6e9f0] pb-1 text-[14px] font-bold text-[#13233c]">
        {f.label || "Section"}
        {f.sectionConfig?.collapsible ? (
          <span className="ml-2 text-[11px] font-semibold text-faint">
            · collapsible
            {f.sectionConfig.collapsed ? " (starts closed)" : ""}
          </span>
        ) : null}
      </span>
    );
  }
  if (f.type === "hidden") {
    return (
      <span className="block text-[13px] font-semibold text-muted">
        {f.label || "Hidden"}{" "}
        <span className="font-normal text-faint">(not shown on form)</span>
      </span>
    );
  }
  return (
    <>
      <span className="mb-1.5 block text-[13px] font-semibold text-[#13233c]">
        {f.label || "Untitled"}
        {f.required ? <span className="text-brand"> *</span> : null}
      </span>
      {f.description?.trim() ? (
        <span className="mb-1.5 block text-[11.5px] leading-snug text-faint">
          {f.description}
        </span>
      ) : null}
      {f.type === "textarea" ? (
        <span className="block min-h-[72px] rounded-lg border border-[#dbe1ea] bg-white px-3 py-2.5 text-[13px] text-faint">
          {f.placeholder || "Long text…"}
        </span>
      ) : f.type === "checkbox" || f.type === "toggle" ? (
        <span className="flex items-center gap-2 text-[13px] text-[#13233c]">
          <span
            className={`inline-block size-4 rounded border border-[#dbe1ea] ${
              f.type === "toggle" ? "w-7 rounded-full bg-[#e6e9f0]" : "bg-white"
            }`}
          />
          {f.label || "Option"}
        </span>
      ) : f.type === "radio" || f.type === "multiselect" ? (
        <span className="flex flex-col gap-1.5">
          {f.choiceConfig?.style && f.choiceConfig.style !== "default" ? (
            <span className="mb-0.5 text-[10.5px] font-semibold tracking-wide text-faint uppercase">
              {f.choiceConfig.style} · {f.choiceConfig.layout ?? "vertical"}
            </span>
          ) : null}
          {(f.optionItems?.length
            ? f.optionItems
            : (f.options ?? ["Option"]).map((label) => ({
                label,
                value: label,
                icon: undefined as string | undefined,
              }))
          )
            .slice(0, 3)
            .map((o) => (
              <span
                key={o.value ?? o.label}
                className="flex items-center gap-2 text-[13px] text-[#13233c]"
              >
                {f.choiceConfig?.style === "image" ||
                f.choiceConfig?.style === "product" ? (
                  <span className="inline-block size-8 rounded bg-[#f1f4f8]" />
                ) : f.choiceConfig?.style === "icon" ? (
                  <span className="inline-flex size-6 items-center justify-center rounded bg-[#f1f4f8] text-[12px] text-muted">
                    {o.icon ? (
                      <ChoiceIconPreview icon={o.icon} size={14} />
                    ) : (
                      "◆"
                    )}
                  </span>
                ) : (
                  <span className="inline-block size-4 rounded border border-[#dbe1ea] bg-white" />
                )}
                {o.label}
              </span>
            ))}
        </span>
      ) : f.type === "select" ? (
        <span className="flex items-center justify-between rounded-lg border border-[#dbe1ea] bg-white px-3 py-2.5 text-[13px] text-faint">
          <span>
            {f.choiceConfig?.selectVariant &&
            f.choiceConfig.selectVariant !== "standard"
              ? `${f.choiceConfig.selectVariant} · `
              : ""}
            {f.placeholder || "Select…"}
          </span>
          <span aria-hidden>▾</span>
        </span>
      ) : f.type === "file" ? (
        <span className="block rounded-lg border border-dashed border-[#dbe1ea] bg-[#f8fafc] px-3 py-5 text-center text-[12.5px] text-faint">
          Drop files here or click to upload
          {f.fileConfig?.multiple ? (
            <span className="mt-1 block text-[11px]">
              Multi · max {f.fileConfig.maxFiles ?? 5} ·{" "}
              {f.fileConfig.maxSizeMb ?? 10} MB
            </span>
          ) : f.fileConfig?.maxSizeMb ? (
            <span className="mt-1 block text-[11px]">
              Max {f.fileConfig.maxSizeMb} MB
            </span>
          ) : null}
        </span>
      ) : f.type === "appointment" ? (
        <span className="block rounded-lg border border-[#dbe1ea] bg-[#f8fafc] px-3 py-4 text-center text-[12.5px] text-faint">
          Calendar · time slots
          {f.appointmentConfig?.showTimezone !== false ? (
            <span className="mt-1 block text-[11px]">Timezone auto-detect</span>
          ) : null}
        </span>
      ) : f.type === "signature" ? (
        <span className="block h-24 rounded-lg border border-[#dbe1ea] bg-white" />
      ) : f.type === "rating" ? (
        <span className="text-[20px] tracking-wide text-[#dbe1ea]">★★★★★</span>
      ) : f.type === "range" ? (
        <span className="block h-2 rounded-full bg-[#e6e9f0]">
          <span className="block h-2 w-1/2 rounded-full bg-brand" />
        </span>
      ) : f.type === "recaptcha" ? (
        <span className="block rounded-lg border border-dashed border-[#dbe1ea] px-3 py-3 text-center text-[12px] text-faint">
          reCAPTCHA
        </span>
      ) : (
        <span className="block rounded-lg border border-[#dbe1ea] bg-white px-3 py-2.5 text-[13px] text-faint">
          {f.placeholder ||
            (f.type === "email"
              ? "name@example.com"
              : f.type === "phone"
                ? "+1 555 000 0000"
                : typeMeta[f.type].hint)}
        </span>
      )}
    </>
  );
}
