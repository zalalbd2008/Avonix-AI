/**
 * Template version diff helpers (ADR-007 Step 2) — browser-safe.
 */
import type { FormField, FormSettings } from "@/lib/db/schema";

export type TemplateVersionDiff = {
  fieldsAdded: string[];
  fieldsRemoved: string[];
  fieldsChanged: string[];
  settingsChanged: string[];
  submitLabelChanged: boolean;
  successMessageChanged: boolean;
  summary: string[];
};

/** Lightweight row for version history UI (no payload). */
export type TemplateVersionListItem = {
  id: string;
  templateId: string;
  version: number;
  changelog: string | null;
  fieldCount: number;
  createdBy: string | null;
  createdAt: string;
  isCurrent: boolean;
};

function fieldSig(f: FormField): string {
  return JSON.stringify({
    key: f.key,
    label: f.label,
    type: f.type,
    required: f.required,
    width: f.width,
    options: f.options,
    optionItems: f.optionItems,
    choiceConfig: f.choiceConfig,
    placeholder: f.placeholder,
    description: f.description,
    stepId: f.stepId,
    condition: f.condition,
  });
}

function settingsSig(s: FormSettings): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(s ?? {})) {
    if (v === undefined) continue;
    out[k] = JSON.stringify(v);
  }
  return out;
}

export function compareTemplatePayloads(
  a: {
    fields: FormField[];
    settings: FormSettings;
    submitLabel?: string;
    successMessage?: string;
  },
  b: {
    fields: FormField[];
    settings: FormSettings;
    submitLabel?: string;
    successMessage?: string;
  },
): TemplateVersionDiff {
  const aMap = new Map(a.fields.map((f) => [f.key, fieldSig(f)]));
  const bMap = new Map(b.fields.map((f) => [f.key, fieldSig(f)]));

  const fieldsAdded: string[] = [];
  const fieldsRemoved: string[] = [];
  const fieldsChanged: string[] = [];

  for (const key of bMap.keys()) {
    if (!aMap.has(key)) fieldsAdded.push(key);
  }
  for (const [key, sig] of aMap) {
    if (!bMap.has(key)) fieldsRemoved.push(key);
    else if (bMap.get(key) !== sig) fieldsChanged.push(key);
  }

  const aSet = settingsSig(a.settings);
  const bSet = settingsSig(b.settings);
  const settingsChanged: string[] = [];
  const keys = new Set([...Object.keys(aSet), ...Object.keys(bSet)]);
  for (const k of keys) {
    if (aSet[k] !== bSet[k]) settingsChanged.push(k);
  }

  const submitLabelChanged =
    (a.submitLabel ?? "") !== (b.submitLabel ?? "");
  const successMessageChanged =
    (a.successMessage ?? "") !== (b.successMessage ?? "");

  const summary: string[] = [];
  if (fieldsAdded.length) summary.push(`+${fieldsAdded.length} field(s)`);
  if (fieldsRemoved.length) summary.push(`−${fieldsRemoved.length} field(s)`);
  if (fieldsChanged.length) summary.push(`~${fieldsChanged.length} field(s)`);
  if (settingsChanged.length) {
    summary.push(`${settingsChanged.length} setting key(s)`);
  }
  if (submitLabelChanged) summary.push("submit label");
  if (successMessageChanged) summary.push("success message");
  if (!summary.length) summary.push("No differences");

  return {
    fieldsAdded,
    fieldsRemoved,
    fieldsChanged,
    settingsChanged,
    submitLabelChanged,
    successMessageChanged,
    summary,
  };
}

export function formatTemplateVersion(version: number): string {
  const major = Math.max(1, Math.floor(version));
  return `v${major}.0`;
}
