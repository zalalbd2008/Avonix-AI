import type {
  FormField,
  FormFieldContainer,
  FormRowAlign,
  FormRowConfig,
  FormSectionConfig,
  FormContainerVariant,
} from "@/lib/db/schema";

export const CONTAINER_VARIANTS: {
  id: FormContainerVariant;
  label: string;
  hint: string;
}[] = [
  { id: "none", label: "None", hint: "No extra chrome" },
  { id: "card", label: "Card", hint: "Soft panel with border" },
  { id: "glass", label: "Glass", hint: "Blurred translucent panel" },
  { id: "border", label: "Border", hint: "Outline only" },
  { id: "shadow", label: "Shadow", hint: "Elevated soft shadow" },
];

export const ROW_ALIGN_Y: { id: FormRowAlign; label: string }[] = [
  { id: "start", label: "Top" },
  { id: "center", label: "Center" },
  { id: "end", label: "Bottom" },
  { id: "stretch", label: "Stretch" },
];

export const ROW_ALIGN_X: {
  id: NonNullable<FormRowConfig["alignX"]>;
  label: string;
}[] = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
  { id: "stretch", label: "Stretch" },
];

export function newRowId(): string {
  return `row_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeContainer(
  raw?: FormFieldContainer | null,
): FormFieldContainer | undefined {
  if (!raw) return undefined;
  const variant = normalizeVariant(raw.variant);
  const out: FormFieldContainer = {};
  if (variant && variant !== "none") out.variant = variant;
  if (raw.hover) out.hover = true;
  if (typeof raw.padding === "number" && !Number.isNaN(raw.padding)) {
    out.padding = clamp(raw.padding, 0, 48);
  }
  if (typeof raw.radius === "number" && !Number.isNaN(raw.radius)) {
    out.radius = clamp(raw.radius, 0, 32);
  }
  if (raw.background?.trim()) out.background = raw.background.trim().slice(0, 40);
  if (raw.borderColor?.trim()) {
    out.borderColor = raw.borderColor.trim().slice(0, 40);
  }
  return Object.keys(out).length ? out : undefined;
}

export function normalizeSectionConfig(
  raw?: FormSectionConfig | null,
): FormSectionConfig | undefined {
  if (!raw) return undefined;
  const out: FormSectionConfig = {};
  if (raw.collapsible) out.collapsible = true;
  if (raw.collapsed) out.collapsed = true;
  if (raw.divider === false) out.divider = false;
  else if (raw.divider) out.divider = true;
  if (raw.background?.trim()) out.background = raw.background.trim().slice(0, 40);
  const container = normalizeContainer(raw.container);
  if (container) out.container = container;
  return Object.keys(out).length ? out : undefined;
}

export const ROW_MODES: {
  id: NonNullable<FormRowConfig["mode"]>;
  label: string;
  hint: string;
}[] = [
  { id: "grid", label: "Grid", hint: "Strict 12-column tracks" },
  { id: "flex", label: "Flex", hint: "Wrap freely · unlimited columns" },
];

export function normalizeRowConfig(raw: FormRowConfig): FormRowConfig | null {
  const id = raw.id?.trim();
  if (!id) return null;
  const out: FormRowConfig = { id: id.slice(0, 40) };
  if (raw.mode === "flex" || raw.mode === "grid") out.mode = raw.mode;
  if (raw.wrap === false) out.wrap = false;
  else if (raw.wrap === true) out.wrap = true;
  if (raw.equalHeight) out.equalHeight = true;
  if (raw.alignY && ROW_ALIGN_Y.some((a) => a.id === raw.alignY)) {
    out.alignY = raw.alignY;
  }
  if (raw.alignX && ROW_ALIGN_X.some((a) => a.id === raw.alignX)) {
    out.alignX = raw.alignX;
  }
  if (typeof raw.gap === "number" && !Number.isNaN(raw.gap)) {
    out.gap = clamp(raw.gap, 0, 48);
  }
  return out;
}

export function normalizeRows(
  raw?: FormRowConfig[] | null,
): FormRowConfig[] {
  if (!raw?.length) return [];
  return raw
    .map(normalizeRowConfig)
    .filter((r): r is FormRowConfig => Boolean(r))
    .slice(0, 40);
}

function normalizeVariant(v?: FormContainerVariant): FormContainerVariant {
  if (v && CONTAINER_VARIANTS.some((c) => c.id === v)) return v;
  return "none";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function containerClassName(c?: FormFieldContainer | null): string {
  if (!c?.variant || c.variant === "none") {
    return c?.hover ? "avx-box avx-box--hover" : "";
  }
  const parts = ["avx-box", `avx-box--${c.variant}`];
  if (c.hover) parts.push("avx-box--hover");
  return parts.join(" ");
}

export function containerInlineStyle(
  c?: FormFieldContainer | null,
): string {
  if (!c) return "";
  const bits: string[] = [];
  if (typeof c.padding === "number") bits.push(`padding:${c.padding}px`);
  if (typeof c.radius === "number") bits.push(`border-radius:${c.radius}px`);
  if (c.background) bits.push(`background:${c.background}`);
  if (c.borderColor) bits.push(`border-color:${c.borderColor}`);
  return bits.join(";");
}

export function resolveRow(
  rowId: string | undefined,
  rows: FormRowConfig[],
): FormRowConfig | undefined {
  if (!rowId) return undefined;
  return rows.find((r) => r.id === rowId);
}

export function rowClassName(row?: FormRowConfig): string {
  if (!row) return "avx-row";
  const parts = ["avx-row"];
  if (row.mode === "flex") parts.push("avx-row--flex");
  if (row.wrap === false) parts.push("avx-row--nowrap");
  if (row.equalHeight) parts.push("avx-row--equal");
  if (row.alignY) parts.push(`avx-row-y-${row.alignY}`);
  if (row.alignX) parts.push(`avx-row-x-${row.alignX}`);
  return parts.join(" ");
}

export function rowInlineStyle(row?: FormRowConfig): string {
  if (!row || typeof row.gap !== "number") return "";
  return `gap:${row.gap}px`;
}

/** React style for canvas / live preview rows (grid vs flex). */
export function rowReactStyle(row?: FormRowConfig): {
  display: "grid" | "flex";
  gridTemplateColumns?: string;
  flexWrap?: "wrap" | "nowrap";
  gap: string;
  alignItems: string;
  justifyContent?: string;
  justifyItems?: string;
  width: string;
} {
  const gap =
    typeof row?.gap === "number"
      ? `${row.gap}px`
      : "var(--avx-row-gap, 12px) var(--avx-col-gap, 12px)";
  const alignItems =
    row?.equalHeight || row?.alignY === "stretch"
      ? "stretch"
      : row?.alignY === "center"
        ? "center"
        : row?.alignY === "end"
          ? "flex-end"
          : "flex-start";

  if (row?.mode === "flex") {
    const justify =
      row.alignX === "center"
        ? "center"
        : row.alignX === "end"
          ? "flex-end"
          : row.alignX === "stretch"
            ? "space-between"
            : "flex-start";
    return {
      display: "flex",
      flexWrap: row.wrap === false ? "nowrap" : "wrap",
      gap: typeof row.gap === "number" ? `${row.gap}px` : "12px",
      alignItems,
      justifyContent: justify,
      width: "100%",
    };
  }

  return {
    display: "grid",
    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
    gap,
    alignItems,
    justifyItems:
      row?.alignX === "center"
        ? "center"
        : row?.alignX === "end"
          ? "end"
          : row?.alignX === "start"
            ? "start"
            : "stretch",
    width: "100%",
  };
}

/** Column placement for a field inside a row (grid span vs flex basis). */
export function fieldColReactStyle(
  span: number,
  mode: "grid" | "flex" = "grid",
): {
  gridColumn?: string;
  flex?: string;
  maxWidth?: string;
  minWidth: number | string;
} {
  const s = Math.min(12, Math.max(1, Math.round(span)));
  if (mode === "flex") {
    const pct = `${(s / 12) * 100}%`;
    return {
      flex: `1 1 calc(${pct} - 0.01px)`,
      maxWidth: pct,
      minWidth: s <= 2 ? "3.5rem" : 0,
    };
  }
  return {
    gridColumn: `span ${s} / span ${s}`,
    minWidth: 0,
  };
}

/**
 * Group consecutive fields that share a rowId into row blocks.
 * Sections stay as their own units (never inside a row).
 */
export function groupFieldsForStructure<T extends FormField>(
  fields: T[],
): Array<
  | { kind: "field"; field: T }
  | { kind: "row"; rowId: string; fields: T[] }
> {
  const out: Array<
    | { kind: "field"; field: T }
    | { kind: "row"; rowId: string; fields: T[] }
  > = [];
  let i = 0;
  while (i < fields.length) {
    const f = fields[i]!;
    if (f.type === "section" || f.type === "hidden" || !f.rowId) {
      out.push({ kind: "field", field: f });
      i += 1;
      continue;
    }
    const rowId = f.rowId;
    const group: T[] = [f];
    i += 1;
    while (i < fields.length) {
      const n = fields[i]!;
      if (n.type === "section" || n.type === "hidden" || n.rowId !== rowId) break;
      group.push(n);
      i += 1;
    }
    if (group.length === 1) {
      out.push({ kind: "field", field: group[0]! });
    } else {
      out.push({ kind: "row", rowId, fields: group });
    }
  }
  return out;
}

/** Fields belonging to a section (until next section / end). */
export function sectionBodyFields<T extends FormField>(
  fields: T[],
  sectionIndex: number,
): T[] {
  const body: T[] = [];
  for (let i = sectionIndex + 1; i < fields.length; i++) {
    const f = fields[i]!;
    if (f.type === "section") break;
    body.push(f);
  }
  return body;
}

export type StructureUnit<T extends FormField = FormField> =
  | { kind: "field"; field: T }
  | { kind: "row"; rowId: string; fields: T[] };

/** Canvas / embed grouping: sections wrap nested rows & fields. */
export type SectionBlock<T extends FormField = FormField> =
  | { kind: "loose"; units: StructureUnit<T>[] }
  | { kind: "section"; section: T; units: StructureUnit<T>[] };

/**
 * Group a step's fields into section blocks (heading + body) and loose fields.
 * Body fields still use row grouping via `groupFieldsForStructure`.
 */
export function groupFieldsIntoSectionBlocks<T extends FormField>(
  fields: T[],
): SectionBlock<T>[] {
  const blocks: SectionBlock<T>[] = [];
  let i = 0;
  let loose: T[] = [];

  function flushLoose() {
    if (!loose.length) return;
    blocks.push({ kind: "loose", units: groupFieldsForStructure(loose) });
    loose = [];
  }

  while (i < fields.length) {
    const f = fields[i]!;
    if (f.type === "section") {
      flushLoose();
      const body = sectionBodyFields(fields, i);
      blocks.push({
        kind: "section",
        section: f,
        units: groupFieldsForStructure(body),
      });
      i += 1 + body.length;
      continue;
    }
    loose.push(f);
    i += 1;
  }
  flushLoose();
  return blocks;
}

/**
 * Move a section heading together with its body fields as one block.
 * Dropping onto a field inside another section targets that whole section.
 */
export function moveSectionBlock(
  stepFields: FormField[],
  activeKey: string,
  overKey: string,
  placement: "before" | "after",
): FormField[] {
  const activeIdx = stepFields.findIndex((f) => f.key === activeKey);
  if (activeIdx < 0) return stepFields;
  const active = stepFields[activeIdx]!;
  if (active.type !== "section" || active.locked) return stepFields;

  const body = sectionBodyFields(stepFields, activeIdx);
  const block = [active, ...body];
  const blockKeys = new Set(block.map((f) => f.key));
  if (blockKeys.has(overKey)) return stepFields;

  const without = stepFields.filter((f) => !blockKeys.has(f.key));
  const anchor = resolveBlockAnchor(stepFields, without, overKey, placement);
  if (anchor < 0) {
    return [...without, ...block];
  }
  return [
    ...without.slice(0, anchor),
    ...block,
    ...without.slice(anchor),
  ];
}

/**
 * When the drop target sits inside a section body, promote the anchor to
 * that section so blocks don't split mid-section.
 */
function resolveBlockAnchor(
  original: FormField[],
  without: FormField[],
  overKey: string,
  placement: "before" | "after",
): number {
  const overIdxOrig = original.findIndex((f) => f.key === overKey);
  if (overIdxOrig < 0) return without.length;

  let sectionIdx = -1;
  for (let i = overIdxOrig; i >= 0; i--) {
    if (original[i]!.type === "section") {
      sectionIdx = i;
      break;
    }
  }

  let targetKey = overKey;
  let edge = placement;

  if (sectionIdx >= 0 && original[overIdxOrig]!.type !== "section") {
    // Dropping relative to a body field → before/after the whole section block.
    targetKey = original[sectionIdx]!.key;
    const body = sectionBodyFields(original, sectionIdx);
    const bodyIndex = body.findIndex((f) => f.key === overKey);
    if (bodyIndex <= Math.floor((body.length - 1) / 2) && placement === "before") {
      edge = "before";
    } else {
      edge = "after";
    }
  }

  const targetInWithout = without.findIndex((f) => f.key === targetKey);
  if (targetInWithout < 0) return without.length;

  if (original.find((f) => f.key === targetKey)?.type === "section") {
    // Place before the section, or after its entire body in the `without` list.
    if (edge === "before") return targetInWithout;
    // After section = after the section field in `without` (body already removed if it was active's... 
    // In `without`, other sections still have their body following them.
    let end = targetInWithout;
    for (let i = targetInWithout + 1; i < without.length; i++) {
      if (without[i]!.type === "section") break;
      end = i;
    }
    return end + 1;
  }

  return edge === "before" ? targetInWithout : targetInWithout + 1;
}

export function moveSectionBlockInStep(
  fields: FormField[],
  stepId: string,
  activeKey: string,
  overKey: string,
  placement: "before" | "after",
): FormField[] {
  const stepFields = fields.filter((f) => (f.stepId || stepId) === stepId);
  const nextStep = moveSectionBlock(
    stepFields,
    activeKey,
    overKey,
    placement,
  );
  let ri = 0;
  return fields.map((f) => {
    if ((f.stepId || stepId) !== stepId) return f;
    return nextStep[ri++] ?? f;
  });
}

export function assignSelectedToRow(
  fields: FormField[],
  keys: string[],
  rowId: string,
): FormField[] {
  const set = new Set(keys);
  return fields.map((f) =>
    set.has(f.key) && f.type !== "section" && f.type !== "hidden"
      ? { ...f, rowId }
      : f,
  );
}

export function clearRowFromFields(
  fields: FormField[],
  rowId: string,
): FormField[] {
  return fields.map((f) =>
    f.rowId === rowId ? { ...f, rowId: undefined } : f,
  );
}

/** Fields that can sit side-by-side in a row. */
export function canJoinRow(field: FormField): boolean {
  return (
    field.type !== "section" &&
    field.type !== "hidden" &&
    !field.locked
  );
}

export type RowDropPlacement = "before" | "after" | "left" | "right";

export type RowAwareDropResult = {
  fields: FormField[];
  /** New row id when a fresh row was created by a side drop. */
  createdRowId?: string;
};

/** Clear rowId on fields that are alone in their row. */
export function pruneSingletonRows(fields: FormField[]): FormField[] {
  const counts = new Map<string, number>();
  for (const f of fields) {
    if (!f.rowId) continue;
    counts.set(f.rowId, (counts.get(f.rowId) ?? 0) + 1);
  }
  return fields.map((f) => {
    if (!f.rowId) return f;
    if ((counts.get(f.rowId) ?? 0) >= 2) return f;
    return { ...f, rowId: undefined };
  });
}

function withSideWidth(field: FormField): FormField {
  if (field.lockWidth) return field;
  if (field.width == null || field.width === "full" || field.width === 12) {
    return { ...field, width: "half" };
  }
  return field;
}

/**
 * Reorder / merge / split fields within one step's field list.
 * - left/right → join (or create) a row next to the target
 * - before/after → stack vertically; exits a row unless reordering inside the same row
 */
export function applyRowAwareDrop(
  stepFields: FormField[],
  activeKey: string,
  overKey: string,
  placement: RowDropPlacement,
): RowAwareDropResult {
  const activeIdx = stepFields.findIndex((f) => f.key === activeKey);
  const overIdx = stepFields.findIndex((f) => f.key === overKey);
  if (activeIdx < 0 || overIdx < 0 || activeKey === overKey) {
    return { fields: stepFields };
  }

  const source = stepFields[activeIdx]!;
  const target = stepFields[overIdx]!;
  if (source.locked || target.locked) return { fields: stepFields };

  // Sections move as a block (heading + body fields).
  if (source.type === "section") {
    const edge =
      placement === "left" || placement === "before" ? "before" : "after";
    return {
      fields: moveSectionBlock(stepFields, activeKey, overKey, edge),
    };
  }

  let place = placement;
  const side = place === "left" || place === "right";
  if (side && (!canJoinRow(source) || !canJoinRow(target))) {
    place = place === "left" ? "before" : "after";
  }

  const working = stepFields.filter((f) => f.key !== activeKey);
  const overPos = working.findIndex((f) => f.key === overKey);
  if (overPos < 0) return { fields: stepFields };

  const overNow = working[overPos]!;
  let createdRowId: string | undefined;
  let active: FormField = { ...source };

  if (place === "left" || place === "right") {
    let rowId = overNow.rowId;
    if (!rowId) {
      rowId = newRowId();
      createdRowId = rowId;
    }
    active = withSideWidth({ ...active, rowId });
    working[overPos] = withSideWidth({ ...overNow, rowId });

    // Keep other existing row mates consecutive — insert beside target.
    const insertAt = place === "left" ? overPos : overPos + 1;
    working.splice(insertAt, 0, active);
  } else {
    const sameRow =
      Boolean(source.rowId) &&
      source.rowId === overNow.rowId &&
      canJoinRow(active);

    if (sameRow) {
      active = { ...active, rowId: source.rowId };
      const insertAt = place === "before" ? overPos : overPos + 1;
      working.splice(insertAt, 0, active);
    } else {
      active = { ...active, rowId: undefined };
      const insertAt = verticalInsertIndex(working, overKey, place);
      working.splice(insertAt, 0, active);
    }
  }

  return { fields: pruneSingletonRows(working), createdRowId };
}

/** Stack above/below an entire row block when the target is inside a row. */
function verticalInsertIndex(
  fields: FormField[],
  overKey: string,
  placement: "before" | "after",
): number {
  const overPos = fields.findIndex((f) => f.key === overKey);
  if (overPos < 0) return 0;
  const over = fields[overPos]!;
  if (!over.rowId) {
    return placement === "before" ? overPos : overPos + 1;
  }
  let first = overPos;
  while (first > 0 && fields[first - 1]?.rowId === over.rowId) first -= 1;
  let last = overPos;
  while (
    last < fields.length - 1 &&
    fields[last + 1]?.rowId === over.rowId
  ) {
    last += 1;
  }
  return placement === "before" ? first : last + 1;
}

/**
 * Apply a row-aware drop to the full form field list for one step.
 */
export function applyRowAwareDropInStep(
  fields: FormField[],
  stepId: string,
  activeKey: string,
  overKey: string,
  placement: RowDropPlacement,
): RowAwareDropResult {
  const stepFields = fields.filter((f) => (f.stepId || stepId) === stepId);
  const { fields: nextStep, createdRowId } = applyRowAwareDrop(
    stepFields,
    activeKey,
    overKey,
    placement,
  );
  let ri = 0;
  const merged = fields.map((f) => {
    if ((f.stepId || stepId) !== stepId) return f;
    return nextStep[ri++] ?? f;
  });
  return { fields: merged, createdRowId };
}

export function duplicateRowFields(
  fields: FormField[],
  rowId: string,
  newId: string,
  keyFn: (base: string, n: number) => string,
): FormField[] {
  const members = fields.filter((f) => f.rowId === rowId);
  if (!members.length) return fields;
  const lastIdx = fields.reduce(
    (acc, f, i) => (f.rowId === rowId ? i : acc),
    -1,
  );
  const clones = members.map((f, i) => ({
    ...structuredClone(f),
    key: keyFn(f.key.replace(/_\d+$/, "") || f.key, fields.length + i + 1),
    rowId: newId,
    locked: undefined,
  }));
  const next = [...fields];
  next.splice(lastIdx + 1, 0, ...clones);
  return next;
}
