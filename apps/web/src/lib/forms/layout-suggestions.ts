/**
 * Auto layout suggestions for the visual form builder (Step 11).
 * Equal spacing, equal height, wrap / overflow hints — pure transforms.
 */

import type { FormField, FormRowConfig } from "@/lib/db/schema";
import {
  forcesFullWidth,
  spanForBreakpoint,
  widthFromSpan,
  widthPatchForBreakpoint,
  type ColSpan,
  type FieldWidthBreakpoint,
} from "@/lib/forms/field-width";
import {
  groupFieldsForStructure,
  newRowId,
  normalizeRowConfig,
} from "@/lib/forms/structure";

export const SUGGESTED_ROW_GAP = 12;

export type LayoutSuggestionKind =
  | "equal_widths"
  | "equal_height"
  | "equal_gap"
  | "wrap_overflow"
  | "fill_row"
  | "group_pair";

export type LayoutSuggestion = {
  id: string;
  kind: LayoutSuggestionKind;
  title: string;
  detail: string;
  severity: "info" | "warn";
  rowId?: string;
  fieldKeys: string[];
};

/** Evenly distribute 12 columns across n fields (remainder goes to the first fields). */
export function equalColSpans(count: number): ColSpan[] {
  const n = Math.max(1, Math.min(12, Math.floor(count)));
  const base = Math.floor(12 / n);
  const rem = 12 - base * n;
  return Array.from({ length: n }, (_, i) => {
    const span = Math.max(1, base + (i < rem ? 1 : 0));
    return span as ColSpan;
  });
}

function editableInRow(f: FormField): boolean {
  return (
    !f.locked &&
    !f.lockWidth &&
    !forcesFullWidth(f.type) &&
    f.type !== "section" &&
    f.type !== "hidden"
  );
}

function spansMatch(a: ColSpan[], b: ColSpan[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((s, i) => s === b[i]);
}

function sumSpans(spans: ColSpan[]): number {
  return spans.reduce((acc, s) => acc + s, 0);
}

/**
 * Scan the current step fields for actionable layout suggestions.
 */
export function collectLayoutSuggestions(
  fields: FormField[],
  rows: FormRowConfig[],
  bp: FieldWidthBreakpoint = "desktop",
): LayoutSuggestion[] {
  const out: LayoutSuggestion[] = [];
  const units = groupFieldsForStructure(fields);
  const rowGaps: number[] = [];

  for (const unit of units) {
    if (unit.kind !== "row") continue;
    const rowFields = unit.fields.filter((f) => f.type !== "hidden");
    if (rowFields.length < 2) continue;

    const row = rows.find((r) => r.id === unit.rowId);
    const spans = rowFields.map((f) => spanForBreakpoint(f, bp));
    const total = sumSpans(spans);
    const editable = rowFields.every(editableInRow);
    const target = equalColSpans(rowFields.length);
    const keys = rowFields.map((f) => f.key);

    if (typeof row?.gap === "number") rowGaps.push(row.gap);

    if (total > 12) {
      if (row?.mode === "flex") {
        // Flex wraps by design — offer equal widths as polish, not a warning.
        if (editable && !spansMatch(spans, target)) {
          out.push({
            id: `eqw:${unit.rowId}:${bp}`,
            kind: "equal_widths",
            title: "Balance flex columns",
            detail: `Equalize for cleaner wraps (${target.map((s) => `${s}/12`).join(" · ")})`,
            severity: "info",
            rowId: unit.rowId,
            fieldKeys: keys,
          });
        }
      } else {
        out.push({
          id: `wrap:${unit.rowId}:${bp}`,
          kind: "wrap_overflow",
          title: "Row overflows grid",
          detail: `${total}/12 cols on ${bp} — fit evenly, split, or switch to Flex`,
          severity: "warn",
          rowId: unit.rowId,
          fieldKeys: keys,
        });
      }
    } else if (editable && !spansMatch(spans, target)) {
      if (total < 12 && 12 % rowFields.length === 0) {
        out.push({
          id: `fill:${unit.rowId}:${bp}`,
          kind: "fill_row",
          title: "Fill empty columns",
          detail: `Distribute leftover space evenly (${target.map((s) => `${s}/12`).join(" · ")})`,
          severity: "info",
          rowId: unit.rowId,
          fieldKeys: keys,
        });
      } else {
        out.push({
          id: `eqw:${unit.rowId}:${bp}`,
          kind: "equal_widths",
          title: "Equal column widths",
          detail: `Balance to ${target.map((s) => `${s}/12`).join(" · ")}`,
          severity: "info",
          rowId: unit.rowId,
          fieldKeys: keys,
        });
      }
    }

    if (!row?.equalHeight) {
      out.push({
        id: `eqh:${unit.rowId}`,
        kind: "equal_height",
        title: "Equal height",
        detail: "Stretch fields in this row to match the tallest",
        severity: "info",
        rowId: unit.rowId,
        fieldKeys: keys,
      });
    }

    if (row && typeof row.gap !== "number") {
      out.push({
        id: `gap:${unit.rowId}`,
        kind: "equal_gap",
        title: "Set row gap",
        detail: `Use ${SUGGESTED_ROW_GAP}px spacing between columns`,
        severity: "info",
        rowId: unit.rowId,
        fieldKeys: keys,
      });
    }
  }

  // Unify inconsistent gaps across rows
  if (rowGaps.length >= 2) {
    const unique = [...new Set(rowGaps)];
    if (unique.length > 1) {
      const firstRow = units.find((u) => u.kind === "row");
      out.push({
        id: "gap:unify",
        kind: "equal_gap",
        title: "Unify row gaps",
        detail: `Rows use ${unique.join("/")}px — set all to ${SUGGESTED_ROW_GAP}px`,
        severity: "info",
        rowId: firstRow?.kind === "row" ? firstRow.rowId : undefined,
        fieldKeys: [],
      });
    }
  }

  // Pair consecutive loose fields that can sit side-by-side
  for (let i = 0; i < fields.length - 1; i++) {
    const a = fields[i]!;
    const b = fields[i + 1]!;
    if (a.rowId || b.rowId) continue;
    if (!editableInRow(a) || !editableInRow(b)) continue;
    if (a.type === "section" || b.type === "section") continue;
    // Prefer contact-ish pairs / short text
    const pairable =
      (a.type === "text" || a.type === "email" || a.type === "phone" || a.type === "number") &&
      (b.type === "text" || b.type === "email" || b.type === "phone" || b.type === "number");
    if (!pairable) continue;
    out.push({
      id: `pair:${a.key}:${b.key}`,
      kind: "group_pair",
      title: "Place side by side",
      detail: `Group “${a.label || a.key}” + “${b.label || b.key}” into a half/half row`,
      severity: "info",
      fieldKeys: [a.key, b.key],
    });
    break; // one pair suggestion at a time
  }

  // Prefer actionable structure fixes over cosmetic equal-height/gap chips
  const rank: Record<LayoutSuggestionKind, number> = {
    wrap_overflow: 0,
    fill_row: 1,
    equal_widths: 2,
    group_pair: 3,
    equal_height: 4,
    equal_gap: 5,
  };
  out.sort((a, b) => {
    const d = rank[a.kind] - rank[b.kind];
    if (d !== 0) return d;
    return a.severity === "warn" && b.severity !== "warn" ? -1 : 0;
  });

  return out.slice(0, 8);
}

export type ApplyLayoutResult = {
  fields: FormField[];
  rows: FormRowConfig[];
};

/**
 * Apply one suggestion. For wrap_overflow, `mode` chooses fit vs split.
 */
export function applyLayoutSuggestion(
  suggestion: LayoutSuggestion,
  fields: FormField[],
  rows: FormRowConfig[],
  opts: {
    bp?: FieldWidthBreakpoint;
    /** wrap_overflow only */
    mode?: "fit" | "split";
  } = {},
): ApplyLayoutResult {
  const bp = opts.bp ?? "desktop";
  const mode = opts.mode ?? "fit";

  switch (suggestion.kind) {
    case "equal_widths":
    case "fill_row":
      return applyEqualWidths(suggestion, fields, rows, bp);
    case "equal_height":
      return applyEqualHeight(suggestion, fields, rows);
    case "equal_gap":
      return applyEqualGap(suggestion, fields, rows);
    case "wrap_overflow":
      return mode === "split"
        ? applyWrapSplit(suggestion, fields, rows, bp)
        : applyEqualWidths(suggestion, fields, rows, bp);
    case "group_pair":
      return applyGroupPair(suggestion, fields, rows);
    default:
      return { fields, rows };
  }
}

function patchFieldWidths(
  fields: FormField[],
  keys: string[],
  spans: ColSpan[],
  bp: FieldWidthBreakpoint,
): FormField[] {
  const spanByKey = new Map(keys.map((k, i) => [k, spans[i]!]));
  return fields.map((f) => {
    const span = spanByKey.get(f.key);
    if (span == null) return f;
    return { ...f, ...widthPatchForBreakpoint(bp, span) };
  });
}

function upsertRow(
  rows: FormRowConfig[],
  rowId: string,
  patch: Partial<FormRowConfig>,
): FormRowConfig[] {
  const base = rows.find((r) => r.id === rowId) ?? { id: rowId };
  const next = normalizeRowConfig({ ...base, id: rowId, ...patch });
  if (!next) return rows;
  if (rows.some((r) => r.id === rowId)) {
    return rows.map((r) => (r.id === rowId ? next : r));
  }
  return [...rows, next];
}

function applyEqualWidths(
  suggestion: LayoutSuggestion,
  fields: FormField[],
  rows: FormRowConfig[],
  bp: FieldWidthBreakpoint,
): ApplyLayoutResult {
  const keys = suggestion.fieldKeys;
  if (keys.length < 2) return { fields, rows };
  const spans = equalColSpans(keys.length);
  return {
    fields: patchFieldWidths(fields, keys, spans, bp),
    rows,
  };
}

function applyEqualHeight(
  suggestion: LayoutSuggestion,
  fields: FormField[],
  rows: FormRowConfig[],
): ApplyLayoutResult {
  if (!suggestion.rowId) return { fields, rows };
  return {
    fields,
    rows: upsertRow(rows, suggestion.rowId, {
      equalHeight: true,
      alignY: "stretch",
    }),
  };
}

function applyEqualGap(
  suggestion: LayoutSuggestion,
  fields: FormField[],
  rows: FormRowConfig[],
): ApplyLayoutResult {
  if (suggestion.id === "gap:unify") {
    const next = rows.map((r) => {
      const n = normalizeRowConfig({ ...r, gap: SUGGESTED_ROW_GAP });
      return n ?? { ...r, gap: SUGGESTED_ROW_GAP };
    });
    return { fields, rows: next };
  }
  if (!suggestion.rowId) return { fields, rows };
  return {
    fields,
    rows: upsertRow(rows, suggestion.rowId, { gap: SUGGESTED_ROW_GAP }),
  };
}

function applyWrapSplit(
  suggestion: LayoutSuggestion,
  fields: FormField[],
  rows: FormRowConfig[],
  bp: FieldWidthBreakpoint,
): ApplyLayoutResult {
  if (!suggestion.rowId || suggestion.fieldKeys.length < 2) {
    return { fields, rows };
  }
  const rowId = suggestion.rowId;
  const keys = suggestion.fieldKeys;
  const byKey = new Map(fields.map((f) => [f.key, f]));
  let used = 0;
  const keep: string[] = [];
  const move: string[] = [];
  for (const key of keys) {
    const f = byKey.get(key);
    if (!f) continue;
    const span = spanForBreakpoint(f, bp);
    if (keep.length === 0 || used + span <= 12) {
      keep.push(key);
      used += span;
    } else {
      move.push(key);
    }
  }
  if (move.length === 0) {
    // Nothing to split — fall back to equal fit
    return applyEqualWidths(suggestion, fields, rows, bp);
  }

  const newId = newRowId();
  const nextFields = fields.map((f) => {
    if (move.includes(f.key)) return { ...f, rowId: newId };
    return f;
  });
  let nextRows = upsertRow(rows, rowId, {
    equalHeight: true,
    alignY: "stretch",
  });
  nextRows = upsertRow(nextRows, newId, {
    equalHeight: true,
    alignY: "stretch",
    gap: SUGGESTED_ROW_GAP,
  });

  // Rebalance each resulting row
  const keepSpans = equalColSpans(keep.length);
  const moveSpans = equalColSpans(move.length);
  let out = patchFieldWidths(nextFields, keep, keepSpans, bp);
  out = patchFieldWidths(out, move, moveSpans, bp);
  return { fields: out, rows: nextRows };
}

function applyGroupPair(
  suggestion: LayoutSuggestion,
  fields: FormField[],
  rows: FormRowConfig[],
): ApplyLayoutResult {
  const [a, b] = suggestion.fieldKeys;
  if (!a || !b) return { fields, rows };
  const id = newRowId();
  const half = widthFromSpan(6);
  const nextFields = fields.map((f) => {
    if (f.key !== a && f.key !== b) return f;
    return { ...f, rowId: id, width: half };
  });
  return {
    fields: nextFields,
    rows: upsertRow(rows, id, {
      equalHeight: true,
      alignY: "stretch",
      gap: SUGGESTED_ROW_GAP,
    }),
  };
}
