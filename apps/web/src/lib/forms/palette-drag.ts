import type { DragEvent } from "react";
import type { FormField, FormFieldType } from "@/lib/db/schema";

/** MIME type for builder palette → canvas drag. */
export const PALETTE_MIME = "application/x-avonix-palette";

export type PaletteDragPayload =
  | { kind: "type"; fieldType: FormFieldType }
  | { kind: "template"; packId: string; templateKey: string }
  | { kind: "pack"; packId: string };

export type PaletteDropAnchor = {
  overKey: string;
  edge: "before" | "after";
} | null;

export function serializePalettePayload(payload: PaletteDragPayload): string {
  return JSON.stringify(payload);
}

export function parsePalettePayload(raw: string): PaletteDragPayload | null {
  try {
    const data = JSON.parse(raw) as PaletteDragPayload;
    if (!data || typeof data !== "object" || !("kind" in data)) return null;
    if (data.kind === "type" && typeof data.fieldType === "string") return data;
    if (
      data.kind === "template" &&
      typeof data.packId === "string" &&
      typeof data.templateKey === "string"
    ) {
      return data;
    }
    if (data.kind === "pack" && typeof data.packId === "string") return data;
    return null;
  } catch {
    return null;
  }
}

export function setPaletteDragData(
  e: DragEvent,
  payload: PaletteDragPayload,
): void {
  const json = serializePalettePayload(payload);
  e.dataTransfer.setData(PALETTE_MIME, json);
  e.dataTransfer.setData("text/plain", json);
  e.dataTransfer.effectAllowed = "copy";
}

export function readPaletteDragData(e: DragEvent): PaletteDragPayload | null {
  const raw =
    e.dataTransfer.getData(PALETTE_MIME) ||
    e.dataTransfer.getData("text/plain");
  if (!raw) return null;
  return parsePalettePayload(raw);
}

export function isPaletteDrag(e: DragEvent): boolean {
  return [...e.dataTransfer.types].some(
    (t) => t === PALETTE_MIME || t === "text/plain" || t === "Text",
  );
}

/**
 * Insert new fields into a step at an optional before/after anchor.
 * Appends within the step when `anchor` is null.
 */
export function insertFieldsInStep(
  fields: FormField[],
  stepId: string,
  newFields: FormField[],
  anchor: PaletteDropAnchor = null,
): FormField[] {
  if (!newFields.length) return fields;

  const stepFields = fields.filter((f) => (f.stepId || stepId) === stepId);
  let at = stepFields.length;
  if (anchor) {
    const idx = stepFields.findIndex((f) => f.key === anchor.overKey);
    if (idx >= 0) at = anchor.edge === "before" ? idx : idx + 1;
  }

  const nextStep = [
    ...stepFields.slice(0, at),
    ...newFields,
    ...stepFields.slice(at),
  ];

  let emitted = false;
  const out: FormField[] = [];
  for (const f of fields) {
    if ((f.stepId || stepId) === stepId) {
      if (!emitted) {
        out.push(...nextStep);
        emitted = true;
      }
    } else {
      out.push(f);
    }
  }
  if (!emitted) out.push(...nextStep);
  return out;
}
