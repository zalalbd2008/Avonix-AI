"use client";

import { useCallback, useState } from "react";
import type { FormField, FormStep } from "@/lib/db/schema";
import {
  pruneSingletonRows,
  sectionBodyFields,
} from "@/lib/forms/structure";

export type BuilderSnapshot = {
  fields: FormField[];
  steps: FormStep[];
};

const MAX_HISTORY = 60;

/**
 * Undo/redo stack for form builder structural edits.
 */
export function useBuilderHistory(initial: BuilderSnapshot) {
  const [present, setPresent] = useState(initial);
  const [past, setPast] = useState<BuilderSnapshot[]>([]);
  const [future, setFuture] = useState<BuilderSnapshot[]>([]);

  const commit = useCallback((next: BuilderSnapshot | ((prev: BuilderSnapshot) => BuilderSnapshot)) => {
    setPresent((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      if (value.fields === prev.fields && value.steps === prev.steps) {
        return prev;
      }
      setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), prev]);
      setFuture([]);
      return value;
    });
  }, []);

  const undo = useCallback(() => {
    setPast((pastNow) => {
      if (!pastNow.length) return pastNow;
      const last = pastNow[pastNow.length - 1]!;
      setPresent((prev) => {
        setFuture((f) => [prev, ...f].slice(0, MAX_HISTORY));
        return last;
      });
      return pastNow.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((futureNow) => {
      if (!futureNow.length) return futureNow;
      const [first, ...rest] = futureNow;
      setPresent((prev) => {
        setPast((p) => [...p, prev].slice(-MAX_HISTORY));
        return first!;
      });
      return rest;
    });
  }, []);

  return {
    fields: present.fields,
    steps: present.steps,
    commit,
    setFields: (fields: FormField[] | ((prev: FormField[]) => FormField[])) => {
      commit((prev) => ({
        ...prev,
        fields: typeof fields === "function" ? fields(prev.fields) : fields,
      }));
    },
    setSteps: (steps: FormStep[] | ((prev: FormStep[]) => FormStep[])) => {
      commit((prev) => ({
        ...prev,
        steps: typeof steps === "function" ? steps(prev.steps) : steps,
      }));
    },
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}

/** Deep-ish clone for clipboard payloads. */
export function cloneFields(fields: FormField[]): FormField[] {
  return JSON.parse(JSON.stringify(fields)) as FormField[];
}

/**
 * Remap library component/section fields onto the active step with unique keys.
 */
export function materializeLibraryFields(
  source: FormField[],
  existing: FormField[],
  stepId: string,
): FormField[] {
  const taken = new Set(existing.map((f) => f.key));
  const out: FormField[] = [];
  for (const field of cloneFields(source)) {
    let key = field.key || `field_${out.length + 1}`;
    if (taken.has(key)) {
      let n = 2;
      while (taken.has(`${field.key}_${n}`)) n += 1;
      key = `${field.key}_${n}`;
    }
    taken.add(key);
    out.push({
      ...field,
      key,
      stepId,
      locked: false,
    });
  }
  return out;
}

export function duplicateField(
  source: FormField,
  all: FormField[],
  stepId: string,
): FormField {
  const n = all.length + 1;
  const prefix = source.type === "section" ? "section" : "field";
  let key = `${prefix}_${n}`;
  let i = n;
  while (all.some((f) => f.key === key)) {
    i += 1;
    key = `${prefix}_${i}`;
  }
  return {
    ...cloneFields([source])[0]!,
    key,
    label: source.label ? `${source.label} copy` : source.label,
    stepId,
    locked: false,
  };
}

/** Reorder keys within a step; preserve global order of other steps. */
export function reorderStepFields(
  fields: FormField[],
  stepId: string,
  orderedKeys: string[],
): FormField[] {
  const inStep = new Map(
    fields
      .filter((f) => (f.stepId || stepId) === stepId)
      .map((f) => [f.key, f]),
  );
  const reordered = orderedKeys
    .map((k) => inStep.get(k))
    .filter(Boolean) as FormField[];

  let ri = 0;
  return fields.map((f) => {
    if ((f.stepId || stepId) !== stepId) return f;
    const next = reordered[ri++];
    return next ?? f;
  });
}

/**
 * When moving across steps, include a section's body fields so the block
 * stays together on the destination page.
 */
export function expandKeysForStepMove(
  fields: FormField[],
  fromStepId: string,
  keys: string[],
): string[] {
  const stepFields = fields.filter(
    (f) => (f.stepId || fromStepId) === fromStepId,
  );
  const out = new Set<string>();
  for (const key of keys) {
    const idx = stepFields.findIndex((f) => f.key === key);
    if (idx < 0) continue;
    const f = stepFields[idx]!;
    if (f.locked) continue;
    out.add(key);
    if (f.type === "section") {
      for (const body of sectionBodyFields(stepFields, idx)) {
        if (!body.locked) out.add(body.key);
      }
    }
  }
  return [...out];
}

export function moveFieldsToStep(
  fields: FormField[],
  keys: string[],
  stepId: string,
  fromStepId?: string,
): FormField[] {
  const sourceStep =
    fromStepId ??
    fields.find((f) => keys.includes(f.key))?.stepId ??
    stepId;
  const expanded = expandKeysForStepMove(fields, sourceStep, keys);
  const set = new Set(expanded);
  const updated = fields.map((f) =>
    set.has(f.key) && !f.locked ? { ...f, stepId } : f,
  );
  const target = updated.filter((f) => (f.stepId || stepId) === stepId);
  const others = updated.filter((f) => (f.stepId || stepId) !== stepId);
  const pinned = target.filter((f) => f.pinned);
  const unpinned = target.filter((f) => !f.pinned);
  const movedKeys = new Set(
    expanded.filter((k) => {
      const f = fields.find((x) => x.key === k);
      return f && !f.locked;
    }),
  );
  const stay = unpinned.filter((f) => !movedKeys.has(f.key));
  const moved = unpinned.filter((f) => movedKeys.has(f.key));
  return pruneSingletonRows([...others, ...pinned, ...stay, ...moved]);
}

/** Field counts per step id (for page drop zone badges). */
export function countFieldsByStep(
  fields: FormField[],
  steps: FormStep[],
): Record<string, number> {
  const fallback = steps[0]?.id;
  const counts: Record<string, number> = {};
  for (const s of steps) counts[s.id] = 0;
  for (const f of fields) {
    const id = f.stepId || fallback;
    if (id && counts[id] != null) counts[id]! += 1;
  }
  return counts;
}
