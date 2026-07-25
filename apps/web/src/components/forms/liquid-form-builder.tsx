"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AppearanceDesigner } from "@/components/forms/appearance-designer";
import { BuilderCanvas } from "@/components/forms/builder-canvas";
import { ChoiceFieldSettings } from "@/components/forms/choice-field-settings";
import { ChoiceOptionsControl } from "@/components/forms/choice-options-control";
import { FieldCaptionSettings } from "@/components/forms/field-caption-settings";
import {
  effectivePlaceholder,
  fieldAnimatesFloat,
  fieldUsesFloating,
} from "@/components/forms/field-caption-shell";
import { FieldWidthControls } from "@/components/forms/field-width-controls";
import { FileUploadControl } from "@/components/forms/file-upload-control";
import { FormLayoutControls } from "@/components/forms/form-layout-controls";
import { StructureFieldSettings } from "@/components/forms/structure-field-settings";
import { SmartLogicPanel } from "@/components/forms/smart-logic-panel";
import { AppointmentPicker } from "@/components/forms/appointment-picker";
import { BudgetBreakdownView } from "@/components/forms/budget-breakdown";
import { SubmissionUxEditor } from "@/components/forms/submission-ux-editor";
import { FormUxEditor } from "@/components/forms/form-ux-editor";
import { TrustEditor } from "@/components/forms/trust-editor";
import { AdminCrmEditor } from "@/components/forms/admin-crm-editor";
import { FormAnalyticsEditor } from "@/components/forms/form-analytics-editor";
import { FormSecurityEditor } from "@/components/forms/form-security-editor";
import { FormIntegrationsEditor } from "@/components/forms/form-integrations-editor";
import { FormAiEditor } from "@/components/forms/form-ai-editor";
import { FormEnterpriseEditor } from "@/components/forms/form-enterprise-editor";
import { SaveTemplateDialog } from "@/components/forms/save-template-dialog";
import { SaveLibraryPieceDialog } from "@/components/forms/save-library-piece-dialog";
import {
  FormIcon,
  iconForFieldType,
  iconForPackGroup,
  type IconName,
} from "@/components/forms/icons";
import { FormError, SubmitButton } from "@/components/ui/field";
import type {
  FormAdminCrmConfig,
  FormAiConfig,
  FormAnalyticsConfig,
  FormAppointmentConfig,
  FormConditionOp,
  FormConfirmation,
  FormConfirmationRule,
  FormEnterpriseConfig,
  FormField,
  FormFieldType,
  FormFileConfig,
  FormIntegrationsConfig,
  FormLayoutConfig,
  FormLogicConfig,
  FormRowConfig,
  FormSecurityConfig,
  FormSettings,
  FormStep,
  FormSubmissionUx,
  FormTrustConfig,
  FormUxConfig,
} from "@/lib/db/schema";
import { resolveFileConfig } from "@/lib/forms/file-config";
import {
  DEFAULT_APPOINTMENT_CONFIG,
  resolveAppointmentConfig,
  WEEKDAY_LABELS,
} from "@/lib/forms/appointment-config";
import {
  syncFieldOptions,
} from "@/lib/forms/choice-config";
import {
  assignSelectedToRow,
  clearRowFromFields,
  duplicateRowFields,
  fieldColReactStyle,
  groupFieldsForStructure,
  newRowId,
  normalizeRowConfig,
  normalizeRows,
  resolveRow,
  rowReactStyle,
  applyRowAwareDropInStep,
} from "@/lib/forms/structure";
import { applyLayoutSuggestion } from "@/lib/forms/layout-suggestions";
import {
  CONDITION_OPS,
  computeBudget,
  computeScore,
  fieldIsRequired,
  normalizeLogic,
  resolveNextStepIndex,
} from "@/lib/forms/smart-logic";
import {
  DEFAULT_SUBMISSION_UX,
  normalizeSubmissionUx,
} from "@/lib/forms/submission-ux";
import { DEFAULT_UX, normalizeUx } from "@/lib/forms/ux-config";
import { DEFAULT_TRUST, normalizeTrust } from "@/lib/forms/trust";
import {
  DEFAULT_ADMIN_CRM,
  normalizeAdminCrm,
} from "@/lib/forms/admin-crm";
import {
  DEFAULT_ANALYTICS,
  normalizeAnalytics,
} from "@/lib/forms/analytics";
import {
  DEFAULT_SECURITY,
  normalizeSecurity,
} from "@/lib/forms/security-config";
import {
  DEFAULT_INTEGRATIONS,
  normalizeIntegrations,
} from "@/lib/forms/integrations";
import { DEFAULT_AI, normalizeAi } from "@/lib/forms/ai-config";
import {
  DEFAULT_ENTERPRISE,
  DEFAULT_ROI,
  normalizeEnterprise,
} from "@/lib/forms/enterprise-config";
import {
  CONTACT_KEYS,
  DEFAULT_FIELDS,
  DEFAULT_SETTINGS,
  FIELD_TYPES,
  MAX_FIELDS,
  MAX_STEPS,
  defaultConfirmation,
  fieldVisible,
  fieldFloatText,
  floatLabelInlineStyle,
  newFieldKey,
  newStepId,
} from "@/lib/forms/fields";
import {
  FIELD_PACKS,
  materializePack,
  materializeTemplate,
  packFieldCatalog,
  type FieldTemplate,
} from "@/lib/forms/field-packs";
import { toColSpan, forcesFullWidth } from "@/lib/forms/field-width";
import {
  insertFieldsInStep,
  setPaletteDragData,
  type PaletteDragPayload,
  type PaletteDropAnchor,
} from "@/lib/forms/palette-drag";
import {
  cloneFields,
  countFieldsByStep,
  duplicateField,
  materializeLibraryFields,
  moveFieldsToStep,
  reorderStepFields,
  useBuilderHistory,
} from "@/lib/forms/builder-ops";
import { createForm, updateForm } from "@/lib/forms/create";
import {
  DEFAULT_LAYOUT,
  layoutProgressRatio,
  normalizeFormLayout,
} from "@/lib/forms/layout";
import {
  themeStyle,
  upgradeToTheme,
  type FormTheme,
} from "@/lib/forms/theme";
import { resolveConditionalClasses } from "@/lib/forms/theme-library";

type PreviewWidth = "fluid" | "tablet" | "phone";
type SideTab = "form" | "field" | "logic" | "layout" | "appearance";

const PREVIEW: Record<PreviewWidth, { label: string; max: string }> = {
  fluid: { label: "Fluid", max: "100%" },
  tablet: { label: "Tablet", max: "640px" },
  phone: { label: "Phone", max: "360px" },
};

const SIDE_TABS: { id: SideTab; label: string; icon: IconName }[] = [
  { id: "form", label: "Form", icon: "settings" },
  { id: "field", label: "Field", icon: "text" },
  { id: "logic", label: "Logic", icon: "logic" },
  { id: "layout", label: "Layout", icon: "grid" },
  { id: "appearance", label: "Appear", icon: "palette" },
];

function PaletteChip({
  label,
  hint,
  icon,
  onClick,
  disabled,
  dragPayload,
}: {
  label: string;
  hint: string;
  icon: IconName;
  onClick: () => void;
  disabled?: boolean;
  dragPayload?: PaletteDragPayload;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      draggable={Boolean(dragPayload) && !disabled}
      onDragStart={(e) => {
        if (!dragPayload || disabled) {
          e.preventDefault();
          return;
        }
        setPaletteDragData(e, dragPayload);
      }}
      className="min-w-0 cursor-grab overflow-hidden rounded-lg border border-[#edf0f5] px-2 py-2 text-left hover:border-brand hover:bg-[#fff8f3] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <FormIcon name={icon} size="sm" className="shrink-0 text-muted" />
        <span className="block min-w-0 truncate text-[12px] font-semibold text-[#13233c]">
          {label}
        </span>
      </span>
      <span className="mt-0.5 block min-w-0 truncate pl-[18px] text-[10px] text-faint">
        {hint}
      </span>
    </button>
  );
}

const TYPE_META: Record<FormFieldType, { label: string; hint: string }> = {
  text: { label: "Text", hint: "Single line" },
  email: { label: "Email", hint: "Validated email" },
  phone: { label: "Phone", hint: "Tel input" },
  number: { label: "Number", hint: "Numeric" },
  date: { label: "Date", hint: "Date picker" },
  url: { label: "URL", hint: "Website link" },
  textarea: { label: "Textarea", hint: "Long text" },
  select: { label: "Dropdown", hint: "Select one" },
  multiselect: { label: "Multi-select", hint: "Choose many" },
  radio: { label: "Radio", hint: "Choice list" },
  checkbox: { label: "Checkbox", hint: "Yes / no" },
  toggle: { label: "Toggle", hint: "On / off switch" },
  range: { label: "Range", hint: "Slider value" },
  rating: { label: "Rating", hint: "Star score" },
  file: { label: "File", hint: "Upload dropzone" },
  appointment: { label: "Appointment", hint: "Calendar & slots" },
  roi: { label: "ROI calculator", hint: "Investment / return" },
  signature: { label: "Signature", hint: "Draw pad" },
  recaptcha: { label: "reCAPTCHA", hint: "Bot protection" },
  hidden: { label: "Hidden", hint: "Not shown" },
  section: { label: "Section", hint: "Heading break" },
};

const OPS = CONDITION_OPS;

export type LiquidFormInitial = {
  formId: string;
  name: string;
  submitLabel: string;
  successMessage: string;
  notificationEmail?: string;
  confirmation?: FormConfirmation;
  submissionUx?: FormSubmissionUx;
  ux?: FormUxConfig;
  trust?: FormTrustConfig;
  admin?: FormAdminCrmConfig;
  analytics?: FormAnalyticsConfig;
  security?: FormSecurityConfig;
  integrations?: FormIntegrationsConfig;
  ai?: FormAiConfig;
  enterprise?: FormEnterpriseConfig;
  layout?: FormLayoutConfig;
  rows?: FormRowConfig[];
  logic?: FormLogicConfig;
  fields: FormField[];
  steps: FormStep[];
  appearance?: unknown;
};

/**
 * Fluent Forms-style builder: palette left, canvas center, tabbed
 * customization on the right.
 */
export function LiquidFormBuilder({
  clientId,
  websiteId,
  websiteName,
  memberRole = "member",
  initial,
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  memberRole?: "owner" | "admin" | "member";
  /** When set, the builder saves updates instead of creating a new form. */
  initial?: LiquidFormInitial;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.formId);
  const initialSteps = initial?.steps?.length
    ? initial.steps
    : DEFAULT_SETTINGS.steps;
  const initialFields = initial?.fields?.length ? initial.fields : DEFAULT_FIELDS;

  const {
    fields,
    steps,
    setFields,
    setSteps,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useBuilderHistory({ fields: initialFields, steps: initialSteps });

  const [activeStepId, setActiveStepId] = useState(initialSteps[0].id);
  const [theme, setTheme] = useState<FormTheme>(() =>
    upgradeToTheme(initial?.appearance as FormTheme | null),
  );
  const [name, setName] = useState(initial?.name ?? "Contact us");
  const [submitLabel, setSubmitLabel] = useState(initial?.submitLabel ?? "Send");
  const [successMessage, setSuccessMessage] = useState(
    initial?.successMessage ?? "Thanks — we'll be in touch.",
  );
  const [notificationEmail, setNotificationEmail] = useState(
    initial?.notificationEmail ?? "",
  );
  const [confirmation, setConfirmation] = useState<FormConfirmation>(() =>
    initial?.confirmation?.rules?.length
      ? initial.confirmation
      : defaultConfirmation(initial?.successMessage),
  );
  const [submissionUx, setSubmissionUx] = useState<FormSubmissionUx>(() =>
    normalizeSubmissionUx(initial?.submissionUx ?? DEFAULT_SUBMISSION_UX),
  );
  const [ux, setUx] = useState<FormUxConfig>(() =>
    normalizeUx(initial?.ux ?? DEFAULT_UX),
  );
  const [trust, setTrust] = useState<FormTrustConfig>(() =>
    normalizeTrust(initial?.trust ?? DEFAULT_TRUST),
  );
  const [adminCrm, setAdminCrm] = useState<FormAdminCrmConfig>(() =>
    normalizeAdminCrm(initial?.admin ?? DEFAULT_ADMIN_CRM),
  );
  const [analytics, setAnalytics] = useState<FormAnalyticsConfig>(() =>
    normalizeAnalytics(initial?.analytics ?? DEFAULT_ANALYTICS),
  );
  const [security, setSecurity] = useState<FormSecurityConfig>(() =>
    normalizeSecurity(initial?.security ?? DEFAULT_SECURITY),
  );
  const [integrations, setIntegrations] = useState<FormIntegrationsConfig>(() =>
    normalizeIntegrations(initial?.integrations ?? DEFAULT_INTEGRATIONS),
  );
  const [aiConfig, setAiConfig] = useState<FormAiConfig>(() =>
    normalizeAi(initial?.ai ?? DEFAULT_AI),
  );
  const [enterprise, setEnterprise] = useState<FormEnterpriseConfig>(() =>
    normalizeEnterprise(initial?.enterprise ?? DEFAULT_ENTERPRISE),
  );
  const [layout, setLayout] = useState<FormLayoutConfig>(() =>
    normalizeFormLayout(initial?.layout ?? DEFAULT_LAYOUT, initialSteps),
  );
  const [rows, setRows] = useState<FormRowConfig[]>(() =>
    normalizeRows(initial?.rows),
  );
  const [logic, setLogic] = useState<FormLogicConfig>(() =>
    normalizeLogic(initial?.logic),
  );
  const [preview, setPreview] = useState<PreviewWidth>("fluid");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [savePieceKind, setSavePieceKind] = useState<"component" | "section" | null>(
    null,
  );
  const [previewStep, setPreviewStep] = useState(0);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [selectedKeys, setSelectedKeys] = useState<string[]>(
    initialFields[0]?.key ? [initialFields[0].key] : [],
  );
  const selectedKey = selectedKeys[selectedKeys.length - 1] ?? null;
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(
    {},
  );
  const clipboardRef = useRef<FormField[]>([]);
  const [sideTab, setSideTab] = useState<SideTab>("field");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!previewOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [previewOpen]);

  const selected = fields.find((f) => f.key === selectedKey) ?? null;
  const selectedIndex = fields.findIndex((f) => f.key === selectedKey);

  const stepFields = useMemo(
    () => fields.filter((f) => (f.stepId || steps[0]?.id) === activeStepId),
    [fields, activeStepId, steps],
  );

  const resolvedLayout = useMemo(
    () => normalizeFormLayout(layout, steps),
    [layout, steps],
  );

  const conversationalFields = useMemo(
    () =>
      fields.filter(
        (f) =>
          f.type !== "hidden" &&
          f.type !== "section" &&
          f.type !== "recaptcha",
      ),
    [fields],
  );

  const previewUnitTotal = useMemo(() => {
    if (resolvedLayout.mode === "conversational") {
      return Math.max(1, conversationalFields.length);
    }
    if (resolvedLayout.mode === "single" || resolvedLayout.mode === "accordion") {
      return 1;
    }
    return Math.max(1, steps.length);
  }, [resolvedLayout.mode, conversationalFields.length, steps.length]);

  const previewFields = useMemo(() => {
    if (resolvedLayout.mode === "single" || resolvedLayout.mode === "accordion") {
      return fields.filter((f) => f.type !== "hidden");
    }
    if (resolvedLayout.mode === "conversational") {
      const f = conversationalFields[previewStep];
      return f ? [f] : [];
    }
    const stepId = steps[previewStep]?.id ?? steps[0]?.id;
    return fields.filter((f) => (f.stepId || steps[0]?.id) === stepId);
  }, [
    resolvedLayout.mode,
    fields,
    conversationalFields,
    previewStep,
    steps,
  ]);

  const conditionSources = fields.filter(
    (f) => f.type !== "section" && f.type !== "hidden" && f.key !== selectedKey,
  );

  function patchField(key: string, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  }

  function selectField(key: string, e?: React.MouseEvent) {
    if (e?.metaKey || e?.ctrlKey) {
      setSelectedKeys((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
      );
    } else if (e?.shiftKey && selectedKey) {
      const keys = stepFields.map((f) => f.key);
      const a = keys.indexOf(selectedKey);
      const b = keys.indexOf(key);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        setSelectedKeys(keys.slice(lo, hi + 1));
      } else {
        setSelectedKeys([key]);
      }
    } else {
      setSelectedKeys([key]);
    }
    if (sideTab === "form") setSideTab("field");
  }

  function addField(type: FormFieldType, anchor: PaletteDropAnchor = null) {
    if (fields.length >= MAX_FIELDS) return;
    let createdKey = "";
    setFields((prev) => {
      if (prev.length >= MAX_FIELDS) return prev;
      const next = buildFieldOfType(type, prev, activeStepId);
      createdKey = next.key;
      return insertFieldsInStep(prev, activeStepId, [next], anchor);
    });
    if (createdKey) {
      setSelectedKeys([createdKey]);
      setSideTab("field");
    }
  }

  function buildFieldOfType(
    type: FormFieldType,
    existing: FormField[],
    stepId: string,
  ): FormField {
    const n = existing.length + 1;
    const key = newFieldKey(type === "section" ? "section" : "field", n);
    return {
      key,
      label: type === "section" ? "Section title" : TYPE_META[type].label,
      type,
      required: false,
      width:
        type === "textarea" ||
        type === "section" ||
        type === "checkbox" ||
        type === "multiselect" ||
        type === "radio" ||
        type === "file" ||
        type === "appointment" ||
        type === "roi" ||
        type === "signature" ||
        type === "rating" ||
        type === "recaptcha" ||
        type === "range" ||
        type === "toggle"
          ? "full"
          : "half",
      stepId,
      options:
        type === "select" || type === "radio" || type === "multiselect"
          ? ["Option A", "Option B"]
          : undefined,
      placeholder: type === "text" || type === "email" ? "" : undefined,
      ...(type === "file"
        ? {
            fileConfig: {
              multiple: false,
              accept: "image/*,.pdf,.doc,.docx,.zip",
              maxSizeMb: 10,
              maxFiles: 5,
              virusScan: false,
            },
          }
        : {}),
      ...(type === "appointment"
        ? { appointmentConfig: { ...DEFAULT_APPOINTMENT_CONFIG } }
        : {}),
      ...(type === "roi" ? { roiConfig: { ...DEFAULT_ROI } } : {}),
    };
  }

  function insertPack(packId: string, anchor: PaletteDropAnchor = null) {
    const pack = FIELD_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    const created = materializePack(pack, fields, activeStepId);
    if (!created.length) return;
    if (fields.length + created.length > MAX_FIELDS) {
      setError(`Pack needs ${created.length} free slots (max ${MAX_FIELDS} fields).`);
      return;
    }
    setFields((prev) =>
      insertFieldsInStep(prev, activeStepId, created, anchor),
    );
    setSelectedKeys([created[created.length - 1]!.key]);
    setSideTab(packId === "budget" ? "logic" : "field");
    if (packId === "budget") {
      const findKey = (preferred: string) =>
        created.find(
          (f) => f.key === preferred || f.key.startsWith(`${preferred}_`),
        )?.key;
      const services = findKey("services");
      const addons = findKey("addons");
      const currency = findKey("currency");
      const discount = findKey("discount_code");
      setLogic(
        normalizeLogic({
          ...logic,
          pricing: {
            enabled: true,
            currency: "USD",
            baseAmount: 0,
            showLive: true,
            label: "Estimate",
            serviceFieldKeys: services ? [services] : [],
            addonFieldKeys: addons ? [addons] : [],
            currencyFieldKey: currency,
            discountFieldKey: discount,
            taxPercent: 0,
            discounts: [
              {
                code: "SAVE10",
                type: "percent",
                value: 10,
                label: "10% off",
              },
              {
                code: "WELCOME50",
                type: "fixed",
                value: 50,
                label: "$50 off",
              },
            ],
          },
        }),
      );
    }
  }

  function insertTemplate(
    template: FieldTemplate,
    anchor: PaletteDropAnchor = null,
  ) {
    if (fields.length >= MAX_FIELDS) return;
    let createdKey = "";
    setFields((prev) => {
      if (prev.length >= MAX_FIELDS) return prev;
      const next = materializeTemplate(template, prev, activeStepId);
      createdKey = next.key;
      return insertFieldsInStep(prev, activeStepId, [next], anchor);
    });
    if (createdKey) {
      setSelectedKeys([createdKey]);
      setSideTab("field");
    }
  }

  function handlePaletteDrop(
    payload: PaletteDragPayload,
    anchor: PaletteDropAnchor,
  ) {
    if (payload.kind === "type") {
      addField(payload.fieldType, anchor);
      return;
    }
    if (payload.kind === "pack") {
      insertPack(payload.packId, anchor);
      return;
    }
    const pack = FIELD_PACKS.find((p) => p.id === payload.packId);
    const template = pack?.fields.find((t) => t.key === payload.templateKey);
    if (template) insertTemplate(template, anchor);
  }

  function addStep() {
    if (steps.length >= MAX_STEPS) return;
    const id = newStepId(steps.length + 1);
    setSteps((prev) => [...prev, { id, title: `Step ${prev.length + 1}` }]);
    setActiveStepId(id);
    setSideTab("form");
  }

  function removeStep(id: string) {
    if (steps.length <= 1) return;
    const fallback = steps.find((s) => s.id !== id)!.id;
    setSteps((prev) => prev.filter((s) => s.id !== id));
    setFields((prev) =>
      prev.map((f) => (f.stepId === id ? { ...f, stepId: fallback } : f)),
    );
    if (activeStepId === id) setActiveStepId(fallback);
    setPreviewStep(0);
  }

  function moveField(key: string, by: number) {
    const stepId = activeStepId;
    const keys = fields
      .filter((f) => (f.stepId || steps[0]?.id) === stepId)
      .map((f) => f.key);
    const i = keys.indexOf(key);
    const to = i + by;
    if (i < 0 || to < 0 || to >= keys.length) return;
    if (fields.find((f) => f.key === key)?.locked) return;
    const nextKeys = [...keys];
    [nextKeys[i], nextKeys[to]] = [nextKeys[to]!, nextKeys[i]!];
    setFields((prev) => reorderStepFields(prev, stepId, nextKeys));
  }

  function duplicateSelected(key?: string) {
    if (fields.length >= MAX_FIELDS) return;
    const sourceKey = key ?? selectedKey;
    if (!sourceKey) return;
    const source = fields.find((f) => f.key === sourceKey);
    if (!source) return;
    const copy = duplicateField(source, fields, activeStepId);
    const idx = fields.findIndex((f) => f.key === sourceKey);
    setFields((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setSelectedKeys([copy.key]);
  }

  function deleteKeys(keys: string[]) {
    const unlocked = keys.filter((k) => !fields.find((f) => f.key === k)?.locked);
    if (!unlocked.length) return;
    if (fields.length - unlocked.length < 1) return;
    setFields((prev) => prev.filter((f) => !unlocked.includes(f.key)));
    setSelectedKeys((prev) => prev.filter((k) => !unlocked.includes(k)));
  }

  function copySelected() {
    const picks = fields.filter((f) => selectedKeys.includes(f.key));
    if (!picks.length) return;
    clipboardRef.current = cloneFields(picks);
  }

  function pasteClipboard() {
    if (!clipboardRef.current.length) return;
    if (fields.length + clipboardRef.current.length > MAX_FIELDS) return;
    const pasted: FormField[] = [];
    const pool = [...fields];
    for (const src of clipboardRef.current) {
      const copy = duplicateField(src, [...pool, ...pasted], activeStepId);
      pasted.push(copy);
    }
    setFields((prev) => [...prev, ...pasted]);
    setSelectedKeys(pasted.map((f) => f.key));
  }

  function toggleLock(key: string) {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, locked: !f.locked } : f)),
    );
  }

  function togglePin(key: string) {
    setFields((prev) => {
      const target = prev.find((f) => f.key === key);
      if (!target) return prev;
      const nextPinned = !target.pinned;
      const updated = prev.map((f) =>
        f.key === key ? { ...f, pinned: nextPinned } : f,
      );
      if (!nextPinned) return updated;
      const stepId = target.stepId || activeStepId;
      const others = updated.filter((f) => f.key !== key);
      const pinnedField = updated.find((f) => f.key === key)!;
      // Insert at start of this step's block.
      const result: FormField[] = [];
      let inserted = false;
      for (const f of others) {
        if (!inserted && (f.stepId || activeStepId) === stepId) {
          result.push(pinnedField);
          inserted = true;
        }
        result.push(f);
      }
      if (!inserted) result.push(pinnedField);
      return result;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (previewOpen) return;
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if (typing) return;
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedKeys.length) {
        e.preventDefault();
        deleteKeys(selectedKeys);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function saveForm() {
    if (pending) return;
    setPending(true);
    setError(null);
    setSavedFlash(false);

    try {
      const appearance = JSON.parse(JSON.stringify(theme)) as Record<string, unknown>;
      const defaultMsg =
        confirmation.rules.find((r) => !r.condition?.fieldKey)?.message?.trim() ||
        successMessage.trim() ||
        "Thanks — we'll be in touch.";
      const payload = {
        clientId,
        websiteId,
        name: name.trim() || "Untitled form",
        submitLabel,
        successMessage: defaultMsg,
        fields: JSON.parse(JSON.stringify(fields)) as FormField[],
        settings: {
          steps: JSON.parse(JSON.stringify(steps)) as FormStep[],
          layout: JSON.parse(JSON.stringify(layout)) as FormLayoutConfig,
          appearance,
          confirmation: JSON.parse(JSON.stringify(confirmation)) as FormConfirmation,
          submissionUx: JSON.parse(
            JSON.stringify(normalizeSubmissionUx(submissionUx)),
          ) as FormSubmissionUx,
          ux: JSON.parse(JSON.stringify(normalizeUx(ux))) as FormUxConfig,
          ...(normalizeTrust(trust).enabled
            ? {
                trust: JSON.parse(
                  JSON.stringify(normalizeTrust(trust)),
                ) as FormTrustConfig,
              }
            : {}),
          admin: JSON.parse(
            JSON.stringify(normalizeAdminCrm(adminCrm)),
          ) as FormAdminCrmConfig,
          analytics: JSON.parse(
            JSON.stringify(normalizeAnalytics(analytics)),
          ) as FormAnalyticsConfig,
          security: JSON.parse(
            JSON.stringify(normalizeSecurity(security)),
          ) as FormSecurityConfig,
          integrations: JSON.parse(
            JSON.stringify(normalizeIntegrations(integrations)),
          ) as FormIntegrationsConfig,
          ai: JSON.parse(JSON.stringify(normalizeAi(aiConfig))) as FormAiConfig,
          enterprise: JSON.parse(
            JSON.stringify(normalizeEnterprise(enterprise)),
          ) as FormEnterpriseConfig,
          ...(rows.length
            ? { rows: JSON.parse(JSON.stringify(rows)) as FormRowConfig[] }
            : {}),
          ...(Object.keys(normalizeLogic(logic)).length
            ? { logic: JSON.parse(JSON.stringify(normalizeLogic(logic))) as FormLogicConfig }
            : {}),
          ...(notificationEmail.trim()
            ? { notificationEmail: notificationEmail.trim() }
            : {}),
        },
      };

      // Pass a JSON string — large theme objects can hang Next server actions
      // when sent as nested objects.
      const result = isEdit
        ? await updateForm(JSON.stringify({ ...payload, formId: initial!.formId }))
        : await createForm(JSON.stringify(payload));

      if (!result.ok) {
        setError(result.error || "Could not save the form.");
        return;
      }

      if (isEdit) {
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 2500);
        router.refresh();
        return;
      }

      if (!result.formId) {
        setError("Form saved but no id was returned. Refresh the forms list.");
        return;
      }

      router.push(
        `/clients/${clientId}/websites/${websiteId}/forms/${result.formId}/edit` as never,
      );
      router.refresh();
    } catch (err) {
      console.error("saveForm failed", err);
      setError(
        err instanceof Error
          ? err.message
          : "Save failed — check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveForm();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white/95 px-3 py-2.5 shadow-[0_8px_24px_rgba(11,30,58,.06)] backdrop-blur">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Form name"
          className="min-w-[10rem] flex-1 rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13.5px] font-semibold outline-none focus:border-brand sm:max-w-xs"
        />
        <span className="hidden text-[12px] text-faint sm:inline">
          {websiteName} · {fields.length} fields
        </span>
        {savedFlash ? (
          <span className="text-[12.5px] font-semibold text-ok">Saved</span>
        ) : null}
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <Link
            href={`/clients/${clientId}/websites/${websiteId}/forms` as never}
            className="inline-flex items-center rounded-lg border border-[#dbe1ea] px-3 py-2 text-[13px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            Back to form
          </Link>
          <button
            type="button"
            onClick={() => {
              setPreviewStep(0);
              setPreviewOpen(true);
            }}
            className="rounded-lg border border-[#dbe1ea] px-3 py-2 text-[13px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setSaveTemplateOpen(true)}
            className="rounded-lg border border-brand/30 bg-[#fff8f3] px-3 py-2 text-[13px] font-semibold text-brand hover:border-brand"
          >
            Save as Template…
          </button>
          <div className="min-w-0 flex-1 sm:min-w-[9.5rem] sm:flex-none">
            <SubmitButton
              type="button"
              pending={pending}
              pendingLabel="Saving…"
              onClick={() => void saveForm()}
            >
              {isEdit ? "Save form" : "Create & save"}
            </SubmitButton>
          </div>
        </div>
      </div>

      <FormError message={error} />

      <div className="flex flex-wrap items-center gap-2 text-[12px] text-faint">
        <span>
          Scoped to <b className="font-semibold text-muted">{websiteName}</b>
        </span>
        <span>·</span>
        <span>
          {fields.length}/{MAX_FIELDS} fields · {steps.length} steps
        </span>
        {isEdit ? (
          <>
            <span>·</span>
            <Link
              href={`/clients/${clientId}/forms/${initial!.formId}` as never}
              className="font-semibold text-brand hover:underline"
            >
              View embed & submissions
            </Link>
          </>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px] xl:items-start">
        {/* Left — palette */}
        <aside className="max-h-[min(78vh,820px)] overflow-y-auto rounded-xl border border-line bg-white p-3.5">
          <button
            type="button"
            onClick={() => setTemplatesOpen(true)}
            disabled={fields.length >= MAX_FIELDS}
            className="mb-4 flex w-full items-center gap-3 rounded-xl border border-brand/25 bg-[#fff8f3] px-3 py-3 text-left hover:border-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand shadow-sm">
              <FormIcon name="pack" size="md" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-brand">
                Templates
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-faint">
                {FIELD_PACKS.length} field packs · click to preview & insert
              </span>
            </span>
            <FormIcon name="expand" size="sm" className="shrink-0 text-brand/70" />
          </button>

          <p className="mb-2 px-1 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
            Basic fields
          </p>
          <div className="mb-4 grid grid-cols-2 gap-1.5">
            {packFieldCatalog()
              .filter((c) => c.group === "basic")
              .map((c) => (
                <PaletteChip
                  key={`${c.packId}-${c.template.key}`}
                  label={c.template.label}
                  hint={c.template.type}
                  icon={iconForFieldType(c.template.type)}
                  onClick={() => insertTemplate(c.template)}
                  disabled={fields.length >= MAX_FIELDS}
                  dragPayload={{
                    kind: "template",
                    packId: c.packId,
                    templateKey: c.template.key,
                  }}
                />
              ))}
          </div>

          <p className="mb-2 px-1 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
            Lead qualification
          </p>
          <div className="mb-4 grid grid-cols-2 gap-1.5">
            {packFieldCatalog()
              .filter((c) => c.group === "qualification")
              .map((c) => (
                <PaletteChip
                  key={`${c.packId}-${c.template.key}`}
                  label={c.template.label}
                  hint={c.template.type}
                  icon={iconForFieldType(c.template.type)}
                  onClick={() => insertTemplate(c.template)}
                  disabled={fields.length >= MAX_FIELDS}
                  dragPayload={{
                    kind: "template",
                    packId: c.packId,
                    templateKey: c.template.key,
                  }}
                />
              ))}
          </div>

          <p className="mb-2 px-1 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
            Project discovery
          </p>
          <div className="mb-4 grid grid-cols-2 gap-1.5">
            {packFieldCatalog()
              .filter((c) => c.group === "discovery")
              .map((c) => (
                <PaletteChip
                  key={`${c.packId}-${c.template.key}`}
                  label={c.template.label}
                  hint={
                    c.template.type === "file"
                      ? `${c.template.type} · upload`
                      : c.template.type
                  }
                  icon={iconForFieldType(c.template.type)}
                  onClick={() => insertTemplate(c.template)}
                  disabled={fields.length >= MAX_FIELDS}
                  dragPayload={{
                    kind: "template",
                    packId: c.packId,
                    templateKey: c.template.key,
                  }}
                />
              ))}
          </div>

          <p className="mb-2 px-1 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
            Image / icon / card
          </p>
          <div className="mb-4 grid grid-cols-2 gap-1.5">
            {packFieldCatalog()
              .filter((c) => c.group === "choice")
              .map((c) => (
                <PaletteChip
                  key={`${c.packId}-${c.template.key}`}
                  label={c.template.label}
                  hint={c.template.choiceConfig?.style ?? c.template.type}
                  icon={
                    c.template.choiceConfig?.style === "icon"
                      ? "icon"
                      : c.template.choiceConfig?.style === "image"
                        ? "image"
                        : "choice"
                  }
                  onClick={() => insertTemplate(c.template)}
                  disabled={fields.length >= MAX_FIELDS}
                  dragPayload={{
                    kind: "template",
                    packId: c.packId,
                    templateKey: c.template.key,
                  }}
                />
              ))}
          </div>

          <p className="mb-2 px-1 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
            Appointment
          </p>
          <div className="mb-4 grid grid-cols-2 gap-1.5">
            {packFieldCatalog()
              .filter((c) => c.group === "appointment")
              .map((c) => (
                <PaletteChip
                  key={`${c.packId}-${c.template.key}`}
                  label={c.template.label}
                  hint={c.template.type}
                  icon={iconForFieldType(c.template.type)}
                  onClick={() => insertTemplate(c.template)}
                  disabled={fields.length >= MAX_FIELDS}
                  dragPayload={{
                    kind: "template",
                    packId: c.packId,
                    templateKey: c.template.key,
                  }}
                />
              ))}
          </div>

          <p className="mb-2 px-1 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
            Budget
          </p>
          <div className="mb-4 grid grid-cols-2 gap-1.5">
            {packFieldCatalog()
              .filter((c) => c.group === "budget")
              .map((c) => (
                <PaletteChip
                  key={`${c.packId}-${c.template.key}`}
                  label={c.template.label}
                  hint={c.template.type}
                  icon={iconForFieldType(c.template.type)}
                  onClick={() => insertTemplate(c.template)}
                  disabled={fields.length >= MAX_FIELDS}
                  dragPayload={{
                    kind: "template",
                    packId: c.packId,
                    templateKey: c.template.key,
                  }}
                />
              ))}
          </div>

          <p className="mb-2 px-1 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
            Enterprise unique
          </p>
          <div className="mb-4 grid grid-cols-2 gap-1.5">
            {packFieldCatalog()
              .filter((c) => c.group === "enterprise")
              .map((c) => (
                <PaletteChip
                  key={`${c.packId}-${c.template.key}`}
                  label={c.template.label}
                  hint={c.template.type}
                  icon={
                    c.template.type === "roi"
                      ? "roi"
                      : iconForFieldType(c.template.type)
                  }
                  onClick={() => insertTemplate(c.template)}
                  disabled={fields.length >= MAX_FIELDS}
                  dragPayload={{
                    kind: "template",
                    packId: c.packId,
                    templateKey: c.template.key,
                  }}
                />
              ))}
          </div>

          <p className="mb-2.5 px-1 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
            All field types
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FIELD_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addField(t)}
                disabled={fields.length >= MAX_FIELDS}
                draggable={fields.length < MAX_FIELDS}
                onDragStart={(e) => {
                  if (fields.length >= MAX_FIELDS) {
                    e.preventDefault();
                    return;
                  }
                  setPaletteDragData(e, { kind: "type", fieldType: t });
                }}
                className="min-w-0 cursor-grab overflow-hidden rounded-xl border border-[#edf0f5] px-3 py-2.5 text-left hover:border-brand hover:bg-[#fff8f3] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex min-w-0 items-start gap-2">
                  <FormIcon
                    name={iconForFieldType(t)}
                    size="md"
                    className="mt-0.5 shrink-0 text-muted"
                  />
                  <span className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-snug text-[#13233c]">
                    {TYPE_META[t].label}
                  </span>
                </span>
                <span className="mt-0.5 block min-w-0 truncate pl-7 text-[11px] leading-snug text-faint">
                  {TYPE_META[t].hint}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Center — canvas */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-faint">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="inline-flex items-center gap-1 rounded-md border border-[#dbe1ea] px-2 py-1 font-semibold hover:border-brand hover:text-brand disabled:opacity-35"
            >
              <FormIcon name="undo" size="xs" />
              Undo
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="inline-flex items-center gap-1 rounded-md border border-[#dbe1ea] px-2 py-1 font-semibold hover:border-brand hover:text-brand disabled:opacity-35"
            >
              <FormIcon name="redo" size="xs" />
              Redo
            </button>
            <button
              type="button"
              onClick={() => duplicateSelected()}
              disabled={!selectedKey || fields.length >= MAX_FIELDS}
              className="inline-flex items-center gap-1 rounded-md border border-[#dbe1ea] px-2 py-1 font-semibold hover:border-brand hover:text-brand disabled:opacity-35"
            >
              <FormIcon name="duplicate" size="xs" />
              Duplicate
            </button>
            {selectedKeys.length > 1 ? (
              <span className="font-semibold text-muted">
                {selectedKeys.length} selected
              </span>
            ) : null}
            <span className="ml-auto hidden items-center gap-1 sm:inline-flex">
              Desktop / Tablet / Mobile canvas · ⌘D
            </span>
          </div>
          <BuilderCanvas
            steps={steps}
            activeStepId={activeStepId}
            stepFields={stepFields}
            rows={rows}
            selectedKeys={selectedKeys}
            collapsedSections={collapsedSections}
            typeMeta={TYPE_META}
            canAddStep={steps.length < MAX_STEPS}
            onSelectStep={(id) => {
              setActiveStepId(id);
              setSideTab("form");
            }}
            onAddStep={addStep}
            onSelectField={selectField}
            onDuplicate={duplicateSelected}
            onDelete={deleteKeys}
            onToggleLock={toggleLock}
            onTogglePin={togglePin}
            onToggleCollapse={(key) =>
              setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }))
            }
            onRowAwareDrop={({ activeKey, overKey, placement }) => {
              let createdRowId: string | undefined;
              setFields((prev) => {
                const result = applyRowAwareDropInStep(
                  prev,
                  activeStepId,
                  activeKey,
                  overKey,
                  placement,
                );
                createdRowId = result.createdRowId;
                return result.fields;
              });
              if (createdRowId) {
                const id = createdRowId;
                setRows((r) =>
                  r.some((x) => x.id === id)
                    ? r
                    : [
                        ...r,
                        { id, equalHeight: true, alignY: "stretch" },
                      ],
                );
              }
            }}
            onResizeWidth={(key, patch) => patchField(key, patch)}
            onPaletteDrop={handlePaletteDrop}
            stepFieldCounts={countFieldsByStep(fields, steps)}
            onApplyLayoutSuggestion={(suggestion, opts) => {
              setFields((prev) => {
                const stepFields = prev.filter(
                  (f) => (f.stepId ?? steps[0]?.id) === activeStepId,
                );
                const result = applyLayoutSuggestion(
                  suggestion,
                  stepFields,
                  rows,
                  { bp: opts?.bp ?? "desktop", mode: opts?.mode },
                );
                setRows(result.rows);
                const byKey = new Map(result.fields.map((f) => [f.key, f]));
                return prev.map((f) => byKey.get(f.key) ?? f);
              });
            }}
            onPatchRow={(rowId, patch) => {
              setRows((prev) => {
                const base = prev.find((r) => r.id === rowId) ?? { id: rowId };
                const merged = { ...base, ...patch };
                if ("mode" in patch && patch.mode == null) delete merged.mode;
                if ("wrap" in patch && patch.wrap == null) delete merged.wrap;
                const next = normalizeRowConfig(merged);
                if (!next) return prev;
                if (prev.some((r) => r.id === rowId)) {
                  return prev.map((r) => (r.id === rowId ? next : r));
                }
                return [...prev, next];
              });
            }}
            onMoveToStep={(keys, stepId) => {
              setFields((prev) =>
                moveFieldsToStep(prev, keys, stepId, activeStepId),
              );
              setActiveStepId(stepId);
            }}
          />
        </div>

        {/* Right — tabbed customization */}
        <aside className="overflow-hidden rounded-xl border border-line bg-white xl:sticky xl:top-4">
          <div className="flex border-b border-[#edf0f5]">
            {SIDE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSideTab(tab.id)}
                className={`flex flex-1 flex-col items-center gap-0.5 px-1.5 py-2 text-[11px] font-semibold sm:flex-row sm:justify-center sm:gap-1 sm:text-[12px] ${
                  sideTab === tab.id
                    ? "border-b-2 border-brand text-brand"
                    : "text-muted hover:text-ink"
                }`}
              >
                <FormIcon name={tab.icon} size="sm" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-h-[min(70vh,720px)] overflow-y-auto p-4">
            {sideTab === "form" && (
              <div className="flex flex-col gap-3.5">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
                  Form settings
                </p>
                <div className="rounded-xl border border-brand/20 bg-[#fff8f3] p-3">
                  <p className="mb-1.5 text-[12px] font-semibold text-brand">
                    Cloud template library
                  </p>
                  <p className="mb-2 text-[11.5px] leading-relaxed text-muted">
                    Save this form to your organization library, or open
                    Templates from the sidebar.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSaveTemplateOpen(true)}
                      className="rounded-lg bg-brand px-2.5 py-1.5 text-[12px] font-semibold text-white"
                    >
                      Save as Template…
                    </button>
                    <button
                      type="button"
                      onClick={() => setSavePieceKind("component")}
                      className="rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
                    >
                      Component
                    </button>
                    <button
                      type="button"
                      onClick={() => setSavePieceKind("section")}
                      className="rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
                    >
                      Section
                    </button>
                    <Link
                      href="/templates"
                      className="rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
                    >
                      Open library
                    </Link>
                  </div>
                </div>
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                    Form name
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                    Submit button
                  </span>
                  <input
                    value={submitLabel}
                    onChange={(e) => setSubmitLabel(e.target.value)}
                    className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                  />
                </label>
                <div>
                  <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                    Button width
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        ["full", "Full width"],
                        ["half", "50%"],
                      ] as const
                    ).map(([value, label]) => {
                      const active = theme.buttons.submit.width === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setTheme((t) => ({
                              ...t,
                              buttons: {
                                ...t.buttons,
                                submit: { ...t.buttons.submit, width: value },
                              },
                            }))
                          }
                          className={`rounded-lg border px-2.5 py-2 text-[12.5px] font-semibold transition ${
                            active
                              ? "border-brand bg-[rgba(255,102,0,.1)] text-brand"
                              : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                    Button alignment
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ["left", "Left"],
                        ["center", "Center"],
                        ["right", "Right"],
                      ] as const
                    ).map(([value, label]) => {
                      const active = theme.buttons.submit.alignment === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setTheme((t) => ({
                              ...t,
                              buttons: {
                                ...t.buttons,
                                submit: {
                                  ...t.buttons.submit,
                                  alignment: value,
                                },
                              },
                            }))
                          }
                          className={`rounded-lg border px-2.5 py-2 text-[12.5px] font-semibold transition ${
                            active
                              ? "border-brand bg-[rgba(255,102,0,.1)] text-brand"
                              : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                    Success message
                  </span>
                  <textarea
                    rows={3}
                    value={successMessage}
                    onChange={(e) => {
                      const message = e.target.value;
                      setSuccessMessage(message);
                      setConfirmation((prev) => {
                        const rules = [...prev.rules];
                        const idx = rules.findIndex((r) => !r.condition?.fieldKey);
                        if (idx >= 0) {
                          rules[idx] = {
                            ...rules[idx],
                            action: rules[idx].action === "redirect" ? "redirect" : "message",
                            message,
                          };
                        } else {
                          rules.push({ id: "default", action: "message", message });
                        }
                        return { rules };
                      });
                    }}
                    className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                  />
                  <span className="mt-1 block text-[11.5px] text-faint">
                    Default after-submit text. Conditional redirect/message lives under Logic.
                  </span>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                    Notification email
                  </span>
                  <input
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    placeholder="you@agency.com"
                    className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                  />
                  <span className="mt-1 block text-[11.5px] text-faint">
                    New submissions are emailed here. Leave empty to turn off.
                  </span>
                </label>

                <div className="border-t border-[#f1f4f8] pt-3.5">
                  <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
                    Active step
                  </p>
                  <label className="block">
                    <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                      Step title
                    </span>
                    <input
                      value={steps.find((s) => s.id === activeStepId)?.title ?? ""}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s) =>
                            s.id === activeStepId ? { ...s, title: e.target.value } : s,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                    />
                  </label>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(activeStepId)}
                      className="mt-2.5 w-full rounded-lg border border-[#fecdca] px-2.5 py-2 text-[12.5px] font-semibold text-bad hover:bg-[#fef2f2]"
                    >
                      Remove this step
                    </button>
                  )}
                </div>
              </div>
            )}

            {sideTab === "field" &&
              (selected && selectedIndex >= 0 ? (
                <div className="flex flex-col gap-3.5">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
                      Field settings
                    </p>
                    <span className="rounded-full bg-[#f1f4f8] px-2 py-0.5 text-[10.5px] font-semibold text-muted uppercase">
                      {selected.type}
                    </span>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-[11.5px] font-semibold text-muted">Label</span>
                    <input
                      value={selected.label}
                      onChange={(e) => patchField(selected.key, { label: e.target.value })}
                      className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11.5px] font-semibold text-muted">Key</span>
                    <input
                      value={selected.key}
                      onChange={(e) => {
                        const next = e.target.value;
                        setFields((prev) =>
                          prev.map((f) => (f.key === selected.key ? { ...f, key: next } : f)),
                        );
                        setSelectedKeys([next]);
                      }}
                      disabled={Boolean(selected.locked)}
                      className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 font-mono text-[13px] outline-none focus:border-brand disabled:opacity-50"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11.5px] font-semibold text-muted">Type</span>
                    <select
                      value={selected.type}
                      onChange={(e) =>
                        patchField(selected.key, {
                          type: e.target.value as FormFieldType,
                        })
                      }
                      className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_META[t].label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selected.type !== "section" && selected.type !== "checkbox" && (
                    <label className="block">
                      <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                        Placeholder
                      </span>
                      <input
                        value={selected.placeholder ?? ""}
                        onChange={(e) =>
                          patchField(selected.key, { placeholder: e.target.value })
                        }
                        className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                      />
                    </label>
                  )}
                  <FieldCaptionSettings
                    field={selected}
                    onPatch={(partial) => patchField(selected.key, partial)}
                  />
                  {(selected.type === "select" ||
                    selected.type === "radio" ||
                    selected.type === "multiselect") &&
                    !(
                      selected.choiceConfig?.style &&
                      selected.choiceConfig.style !== "default"
                    ) &&
                    !selected.optionItems?.length && (
                    <label className="block">
                      <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                        Options (comma separated)
                      </span>
                      <textarea
                        rows={3}
                        value={(selected.options ?? []).join(", ")}
                        onChange={(e) => {
                          const options = e.target.value
                            .split(",")
                            .map((o) => o.trim())
                            .filter(Boolean);
                          patchField(selected.key, {
                            ...syncFieldOptions(
                              options.map((o) => ({ value: o, label: o })),
                            ),
                          });
                        }}
                        className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                      />
                    </label>
                  )}
                  {(selected.type === "radio" ||
                    selected.type === "multiselect" ||
                    selected.type === "select") && (
                    <ChoiceFieldSettings
                      field={selected}
                      onPatch={(partial) => patchField(selected.key, partial)}
                    />
                  )}
                  {selected.type === "file" && (
                    <FileFieldSettings
                      config={selected.fileConfig}
                      onChange={(fileConfig) =>
                        patchField(selected.key, { fileConfig })
                      }
                    />
                  )}
                  {selected.type === "appointment" && (
                    <AppointmentFieldSettings
                      config={selected.appointmentConfig}
                      onChange={(appointmentConfig) =>
                        patchField(selected.key, { appointmentConfig })
                      }
                    />
                  )}
                  {selected.type !== "section" && selected.type !== "hidden" && (
                    <label className="flex items-center gap-2 text-[12.5px] text-muted">
                      <input
                        type="checkbox"
                        checked={selected.required}
                        onChange={(e) =>
                          patchField(selected.key, { required: e.target.checked })
                        }
                      />
                      Required
                      {CONTACT_KEYS.has(selected.key) && (
                        <span className="text-ok">· contact</span>
                      )}
                    </label>
                  )}
                </div>
              ) : (
                <EmptySide hint="Select a field in the canvas to edit its settings." />
              ))}

            {sideTab === "logic" && (
              <div className="flex flex-col gap-4">
                <AfterSubmitEditor
                  confirmation={confirmation}
                  onChange={setConfirmation}
                  successMessage={successMessage}
                  onSuccessMessageChange={setSuccessMessage}
                  conditionSources={conditionSources}
                  submissionUx={submissionUx}
                  onSubmissionUxChange={setSubmissionUx}
                />

                <div className="border-t border-[#f1f4f8] pt-3.5">
                  <SmartLogicPanel
                    field={selected ?? null}
                    fields={fields}
                    steps={steps}
                    logic={logic}
                    values={previewValues}
                    onPatchField={patchField}
                    onChangeLogic={setLogic}
                  />
                </div>
              </div>
            )}

            {sideTab === "layout" && (
              <div className="flex flex-col gap-5">
                <FormLayoutControls
                  layout={layout}
                  stepCount={steps.length}
                  onChange={setLayout}
                />
                <FormUxEditor value={ux} onChange={setUx} />
                <TrustEditor value={trust} onChange={setTrust} />
                <AdminCrmEditor value={adminCrm} onChange={setAdminCrm} />
                <FormAnalyticsEditor
                  value={analytics}
                  onChange={setAnalytics}
                />
                <FormSecurityEditor
                  value={security}
                  onChange={setSecurity}
                />
                <FormIntegrationsEditor
                  value={integrations}
                  onChange={setIntegrations}
                />
                <FormAiEditor value={aiConfig} onChange={setAiConfig} />
                <FormEnterpriseEditor
                  value={enterprise}
                  onChange={setEnterprise}
                  clientId={clientId}
                  websiteId={websiteId}
                  memberRole={memberRole}
                  formSnapshot={{
                    name,
                    fields,
                    sourceFormId: initial?.formId,
                    settings: {
                      steps,
                      layout,
                      appearance: theme as unknown as Record<string, unknown>,
                      confirmation,
                      submissionUx,
                      ux,
                      trust,
                      admin: adminCrm,
                      analytics,
                      security,
                      integrations,
                      ai: aiConfig,
                      enterprise,
                      ...(rows.length ? { rows } : {}),
                      ...(Object.keys(normalizeLogic(logic)).length
                        ? { logic }
                        : {}),
                      ...(notificationEmail.trim()
                        ? { notificationEmail: notificationEmail.trim() }
                        : {}),
                    } as FormSettings,
                    submitLabel,
                    successMessage,
                  }}
                  onApplyTemplate={(tpl) => {
                    setName(tpl.name);
                    setFields(tpl.fields);
                    if (tpl.settings.steps?.length) setSteps(tpl.settings.steps);
                    if (tpl.settings.layout) {
                      setLayout(
                        normalizeFormLayout(
                          tpl.settings.layout,
                          tpl.settings.steps ?? steps,
                        ),
                      );
                    }
                    if (tpl.settings.enterprise) {
                      setEnterprise(normalizeEnterprise(tpl.settings.enterprise));
                    }
                    if (tpl.submitLabel) setSubmitLabel(tpl.submitLabel);
                    if (tpl.successMessage) setSuccessMessage(tpl.successMessage);
                    setSelectedKeys(tpl.fields[0]?.key ? [tpl.fields[0].key] : []);
                  }}
                  onInsertFields={(source, label) => {
                    const created = materializeLibraryFields(
                      source,
                      fields,
                      activeStepId,
                    );
                    if (!created.length) return;
                    if (fields.length + created.length > MAX_FIELDS) {
                      setError(
                        `“${label}” needs ${created.length} free slots (max ${MAX_FIELDS}).`,
                      );
                      return;
                    }
                    setFields((prev) =>
                      insertFieldsInStep(prev, activeStepId, created, null),
                    );
                    setSelectedKeys([created[created.length - 1]!.key]);
                    setSideTab("field");
                  }}
                  onRestoreVersion={(payload) => {
                    setFields(payload.fields);
                    if (payload.settings.steps?.length) {
                      setSteps(payload.settings.steps);
                    }
                    if (payload.settings.layout) {
                      setLayout(
                        normalizeFormLayout(
                          payload.settings.layout,
                          payload.settings.steps ?? steps,
                        ),
                      );
                    }
                    if (payload.settings.enterprise) {
                      setEnterprise(
                        normalizeEnterprise(payload.settings.enterprise),
                      );
                    }
                    if (payload.settings.ai) {
                      setAiConfig(normalizeAi(payload.settings.ai));
                    }
                  }}
                />
                <div className="border-t border-[#edf0f5] pt-4">
                  {selected && selectedIndex >= 0 ? (
                    <div className="flex flex-col gap-3.5">
                      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
                        Field layout
                      </p>
                      <FieldWidthControls
                        field={selected}
                        locked={Boolean(selected.lockWidth)}
                        onChange={(patch) => patchField(selected.key, patch)}
                      />
                      <StructureFieldSettings
                        field={selected}
                        rows={rows}
                        selectedKeys={selectedKeys}
                        onPatchField={(partial) => patchField(selected.key, partial)}
                        onPatchRows={setRows}
                        onGroupIntoRow={() => {
                          const id = newRowId();
                          setFields((prev) =>
                            assignSelectedToRow(prev, selectedKeys, id),
                          );
                          setRows((prev) =>
                            prev.some((r) => r.id === id)
                              ? prev
                              : [
                                  ...prev,
                                  { id, equalHeight: true, alignY: "stretch" },
                                ],
                          );
                        }}
                        onClearRow={() => {
                          if (!selected.rowId) return;
                          const id = selected.rowId;
                          setFields((prev) => clearRowFromFields(prev, id));
                          setRows((prev) => prev.filter((r) => r.id !== id));
                        }}
                        onDuplicateRow={() => {
                          if (!selected.rowId) return;
                          const id = selected.rowId;
                          const nextId = newRowId();
                          setFields((prev) =>
                            duplicateRowFields(prev, id, nextId, (base, n) =>
                              newFieldKey(base, n),
                            ),
                          );
                          const src = rows.find((r) => r.id === id);
                          setRows((prev) => [
                            ...prev,
                            {
                              id: nextId,
                              mode: src?.mode,
                              wrap: src?.wrap,
                              equalHeight: src?.equalHeight,
                              alignY: src?.alignY,
                              alignX: src?.alignX,
                              gap: src?.gap,
                            },
                          ]);
                        }}
                      />
                      <label className="block">
                        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                          Step
                        </span>
                        <select
                          value={selected.stepId || steps[0].id}
                          onChange={(e) =>
                            patchField(selected.key, { stepId: e.target.value })
                          }
                          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                        >
                          {steps.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div>
                        <span className="mb-1.5 block text-[11.5px] font-semibold text-muted">
                          Order
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => moveField(selected.key, -1)}
                            disabled={
                              Boolean(selected.locked) ||
                              stepFields.findIndex((f) => f.key === selected.key) <= 0
                            }
                            className="flex-1 rounded-lg border border-[#dbe1ea] py-2 text-[12.5px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-35"
                          >
                            ↑ Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveField(selected.key, 1)}
                            disabled={
                              Boolean(selected.locked) ||
                              stepFields.findIndex((f) => f.key === selected.key) >=
                                stepFields.length - 1
                            }
                            className="flex-1 rounded-lg border border-[#dbe1ea] py-2 text-[12.5px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-35"
                          >
                            ↓ Down
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteKeys([selected.key])}
                        disabled={fields.length <= 1 || Boolean(selected.locked)}
                        className="rounded-lg border border-[#fecdca] py-2 text-[12.5px] font-semibold text-bad hover:bg-[#fef2f2] disabled:opacity-35"
                      >
                        Delete field
                      </button>
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-faint">
                      Select a field to change width, step, or order.
                    </p>
                  )}
                </div>
              </div>
            )}

            {sideTab === "appearance" && (
              <AppearanceDesigner theme={theme} onChange={setTheme} />
            )}
          </div>
        </aside>
      </div>

      {templatesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,30,58,.45)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Field pack templates"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setTemplatesOpen(false);
          }}
        >
          <div className="flex max-h-[min(92vh,880px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_64px_rgba(11,30,58,.28)]">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0f5] px-4 py-3">
              <FormIcon name="pack" size="sm" className="text-brand" />
              <h2 className="text-sm font-semibold text-[#13233c]">Templates</h2>
              <span className="text-[12px] text-faint">
                Preview a pack, then insert all its fields
              </span>
              <button
                type="button"
                onClick={() => setTemplatesOpen(false)}
                className="ml-auto rounded-lg border border-[#dbe1ea] px-2.5 py-1 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {FIELD_PACKS.map((pack) => {
                  const full = fields.length >= MAX_FIELDS;
                  const previewFields = pack.fields.slice(0, 8);
                  const more = pack.fields.length - previewFields.length;
                  return (
                    <article
                      key={pack.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-[#dbe1ea] bg-white shadow-[0_8px_24px_rgba(11,30,58,.06)]"
                    >
                      <div className="flex items-start gap-3 border-b border-[#edf0f5] px-4 py-3.5">
                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fff8f3] text-brand">
                          <FormIcon
                            name={iconForPackGroup(pack.group)}
                            size="md"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[14px] font-semibold text-[#13233c]">
                            {pack.label}
                          </h3>
                          <p className="mt-0.5 text-[12px] leading-snug text-muted">
                            {pack.hint}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold tracking-wide text-faint uppercase">
                            {pack.fields.length} fields · {pack.group}
                          </p>
                        </div>
                      </div>
                      <ul className="flex flex-1 flex-col gap-1.5 px-4 py-3">
                        {previewFields.map((f) => (
                          <li
                            key={f.key}
                            className="flex min-w-0 items-center gap-2 rounded-lg bg-[#f8fafc] px-2.5 py-1.5"
                          >
                            <FormIcon
                              name={iconForFieldType(f.type)}
                              size="xs"
                              className="shrink-0 text-muted"
                            />
                            <span className="min-w-0 truncate text-[12.5px] font-medium text-[#13233c]">
                              {f.label}
                            </span>
                            <span className="ml-auto shrink-0 text-[10.5px] text-faint">
                              {f.type}
                              {f.required ? " · req" : ""}
                            </span>
                          </li>
                        ))}
                        {more > 0 ? (
                          <li className="px-1 text-[11.5px] text-faint">
                            +{more} more field{more === 1 ? "" : "s"}
                          </li>
                        ) : null}
                      </ul>
                      <div className="mt-auto border-t border-[#edf0f5] px-4 py-3">
                        <button
                          type="button"
                          disabled={full}
                          onClick={() => {
                            insertPack(pack.id);
                            setTemplatesOpen(false);
                          }}
                          className="w-full rounded-lg bg-brand px-3 py-2 text-[13px] font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Insert pack
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,30,58,.45)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Form preview"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreviewOpen(false);
          }}
        >
          <div className="flex max-h-[min(92vh,880px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_64px_rgba(11,30,58,.28)]">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0f5] px-4 py-3">
              <h2 className="text-sm font-semibold">Preview</h2>
              <span className="text-[12px] text-faint">{name || "Untitled"}</span>
              <div className="ml-auto flex items-center gap-2">
                <div className="flex rounded-lg border border-[#dbe1ea] p-0.5">
                  {(Object.keys(PREVIEW) as PreviewWidth[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPreview(key)}
                      className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${
                        preview === key ? "bg-brand text-white" : "text-muted hover:text-ink"
                      }`}
                    >
                      {PREVIEW[key].label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="rounded-lg border border-[#dbe1ea] px-2.5 py-1.5 text-[12.5px] font-semibold text-muted hover:border-brand hover:text-brand"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-3 py-5 sm:px-6">
              <div
                className={`mx-auto overflow-hidden rounded-[14px] border border-[#dbe1ea] bg-white shadow-[0_12px_40px_rgba(11,30,58,.08)] transition-[max-width] duration-300 ease-out ${
                  resolvedLayout.mode === "card" ? "p-1" : ""
                }`}
                style={{ maxWidth: PREVIEW[preview].max, width: "100%" }}
              >
                <div
                  className={
                    resolvedLayout.chrome?.progressPlacement === "sidebar" &&
                    (resolvedLayout.mode === "wizard" ||
                      resolvedLayout.mode === "card")
                      ? "grid gap-4 p-4 sm:grid-cols-[160px_1fr] sm:p-5"
                      : ""
                  }
                >
                  {resolvedLayout.chrome?.progress &&
                  resolvedLayout.chrome.progress !== "none" &&
                  previewUnitTotal > 1 ? (
                    <div
                      className={
                        resolvedLayout.chrome.progressPlacement === "sidebar"
                          ? "sm:sticky sm:top-2"
                          : "border-b border-[#f1f4f8] px-4 py-3"
                      }
                    >
                      {resolvedLayout.chrome.progressPlacement !== "sidebar" ? (
                        <>
                          <p className="truncate text-[13.5px] font-bold">
                            {name || "Untitled"}
                          </p>
                          <p className="mt-0.5 text-[11.5px] text-faint">
                            {resolvedLayout.mode === "conversational"
                              ? `Question ${previewStep + 1}/${previewUnitTotal}`
                              : `${steps[previewStep]?.title ?? "Step"} · ${previewStep + 1}/${previewUnitTotal}`}
                            {" · "}
                            {resolvedLayout.mode}
                          </p>
                        </>
                      ) : null}
                      {resolvedLayout.chrome.progress === "percentage" ||
                      resolvedLayout.chrome.progress === "line" ? (
                        <div className="mt-2.5 flex items-center gap-2">
                          <div
                            className="h-1 flex-1 overflow-hidden rounded-full"
                            style={{ background: theme.progress.pendingColor }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${layoutProgressRatio(previewStep, previewUnitTotal) * 100}%`,
                                background: theme.progress.activeColor,
                                height: theme.progress.height,
                              }}
                            />
                          </div>
                          {resolvedLayout.chrome.progress === "percentage" ? (
                            <span className="text-[11px] font-semibold text-muted">
                              {Math.round(
                                layoutProgressRatio(previewStep, previewUnitTotal) *
                                  100,
                              )}
                              %
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {Array.from({ length: previewUnitTotal }, (_, i) => (
                            <div
                              key={i}
                              className="rounded-full"
                              style={{
                                width:
                                  resolvedLayout.chrome?.progress === "circle"
                                    ? 10
                                    : undefined,
                                height:
                                  resolvedLayout.chrome?.progress === "circle"
                                    ? 10
                                    : theme.progress.height,
                                flex:
                                  resolvedLayout.chrome?.progress === "number"
                                    ? undefined
                                    : 1,
                                minWidth:
                                  resolvedLayout.chrome?.progress === "number"
                                    ? 28
                                    : undefined,
                                background:
                                  i < previewStep
                                    ? theme.progress.completedColor
                                    : i === previewStep
                                      ? theme.progress.activeColor
                                      : theme.progress.pendingColor,
                                color: "#fff",
                                fontSize: 10,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding:
                                  resolvedLayout.chrome?.progress === "number"
                                    ? "4px 6px"
                                    : undefined,
                                borderRadius:
                                  resolvedLayout.chrome?.progress === "number"
                                    ? 6
                                    : 999,
                              }}
                            >
                              {resolvedLayout.chrome?.progress === "number"
                                ? i + 1
                                : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-b border-[#f1f4f8] px-4 py-3">
                      <p className="truncate text-[13.5px] font-bold">
                        {name || "Untitled"}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-faint">
                        {resolvedLayout.mode}
                        {resolvedLayout.mount && resolvedLayout.mount !== "embedded"
                          ? ` · ${resolvedLayout.mount}`
                          : ""}
                      </p>
                    </div>
                  )}

                  <div
                    className={`p-4 sm:p-5 ${
                      resolvedLayout.mode === "card"
                        ? "rounded-xl border border-[#e6e9f0] shadow-[0_8px_24px_rgba(11,30,58,.06)]"
                        : ""
                    }`}
                  >
                    {resolvedLayout.mode === "accordion" ? (
                      <div className="flex flex-col gap-2">
                        {steps.map((s, si) => (
                          <div
                            key={s.id}
                            className="overflow-hidden rounded-lg border border-[#dbe1ea]"
                          >
                            <button
                              type="button"
                              onClick={() => setPreviewStep(si)}
                              className="w-full bg-[#f8fafc] px-3 py-2.5 text-left text-[13px] font-semibold"
                              style={{
                                color:
                                  previewStep === si
                                    ? theme.tokens.primary
                                    : undefined,
                              }}
                            >
                              {s.title}
                            </button>
                            {previewStep === si ? (
                              <div className="p-3">
                                <UltimatePreview
                                  theme={theme}
                                  fields={fields.filter(
                                    (f) =>
                                      (f.stepId || steps[0].id) === s.id &&
                                      f.type !== "hidden",
                                  )}
                                  allFields={fields}
                                  rows={rows}
                                  logic={logic}
                                  values={previewValues}
                                  onChange={(key, value) =>
                                    setPreviewValues((prev) => ({
                                      ...prev,
                                      [key]: value,
                                    }))
                                  }
                                  submitLabel={submitLabel}
                                  isLast
                                />
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <UltimatePreview
                        theme={theme}
                        fields={previewFields}
                        allFields={fields}
                        rows={rows}
                        logic={logic}
                        values={previewValues}
                        onChange={(key, value) =>
                          setPreviewValues((prev) => ({ ...prev, [key]: value }))
                        }
                        submitLabel={submitLabel}
                        isLast={previewStep >= previewUnitTotal - 1}
                        onBack={
                          previewStep > 0 &&
                          resolvedLayout.mode !== "single"
                            ? () => setPreviewStep((s) => s - 1)
                            : undefined
                        }
                        onNext={
                          previewStep < previewUnitTotal - 1 &&
                          resolvedLayout.mode !== "single"
                            ? () =>
                                setPreviewStep((s) =>
                                  resolvedLayout.mode === "conversational" ||
                                  resolvedLayout.mode === "accordion"
                                    ? Math.min(s + 1, previewUnitTotal - 1)
                                    : resolveNextStepIndex(
                                        s,
                                        steps,
                                        logic.skipRules,
                                        previewValues,
                                      ),
                                )
                            : undefined
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <SaveTemplateDialog
        open={saveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        role={memberRole}
        clientId={clientId}
        websiteId={websiteId}
        snapshot={{
          name,
          fields,
          settings: {
            steps,
            layout,
            appearance: theme as unknown as Record<string, unknown>,
            confirmation,
            submissionUx,
            ux,
            trust,
            admin: adminCrm,
            analytics,
            security,
            integrations,
            ai: aiConfig,
            enterprise,
            ...(rows.length ? { rows } : {}),
            ...(Object.keys(normalizeLogic(logic)).length
              ? { logic }
              : {}),
            ...(notificationEmail.trim()
              ? { notificationEmail: notificationEmail.trim() }
              : {}),
          } as FormSettings,
          submitLabel,
          successMessage,
          sourceFormId: initial?.formId,
          clientId,
          websiteId,
        }}
        onSaved={() => {
          setSavedFlash(true);
        }}
      />

      {savePieceKind ? (
        <SaveLibraryPieceDialog
          open
          kind={savePieceKind}
          onClose={() => setSavePieceKind(null)}
          fields={fields}
          defaultName={name}
          clientId={clientId}
          websiteId={websiteId}
        />
      ) : null}
    </form>
  );
}

function AfterSubmitEditor({
  confirmation,
  onChange,
  successMessage,
  onSuccessMessageChange,
  conditionSources,
  submissionUx,
  onSubmissionUxChange,
}: {
  confirmation: FormConfirmation;
  onChange: (c: FormConfirmation) => void;
  successMessage: string;
  onSuccessMessageChange: (m: string) => void;
  conditionSources: FormField[];
  submissionUx: FormSubmissionUx;
  onSubmissionUxChange: (ux: FormSubmissionUx) => void;
}) {
  const defaultRule =
    confirmation.rules.find((r) => !r.condition?.fieldKey) ??
    ({
      id: "default",
      action: "message" as const,
      message: successMessage,
    } satisfies FormConfirmationRule);
  const conditionalRules = confirmation.rules.filter((r) => r.condition?.fieldKey);

  function setDefault(patch: Partial<FormConfirmationRule>) {
    const next: FormConfirmationRule = { ...defaultRule, ...patch, id: defaultRule.id || "default" };
    delete next.condition;
    const others = confirmation.rules.filter((r) => r.condition?.fieldKey);
    onChange({ rules: [next, ...others] });
    if (patch.message !== undefined) onSuccessMessageChange(patch.message);
    if (patch.action === "message" && patch.message === undefined && next.message) {
      onSuccessMessageChange(next.message);
    }
  }

  function updateConditional(id: string, patch: Partial<FormConfirmationRule>) {
    onChange({
      rules: confirmation.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  }

  function addConditional() {
    const source = conditionSources[0];
    const rule: FormConfirmationRule = {
      id: `rule_${Date.now().toString(36)}`,
      action: "redirect",
      redirectUrl: "https://",
      message: successMessage,
      condition: source
        ? { fieldKey: source.key, op: "eq", value: "" }
        : { fieldKey: "", op: "eq", value: "" },
    };
    onChange({ rules: [...confirmation.rules, rule] });
  }

  function removeConditional(id: string) {
    const next = confirmation.rules.filter((r) => r.id !== id);
    if (!next.some((r) => !r.condition?.fieldKey)) {
      next.unshift({
        id: "default",
        action: "message",
        message: successMessage || "Thanks — we'll be in touch.",
      });
    }
    onChange({ rules: next });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        After submit
      </p>
      <p className="text-[12px] leading-relaxed text-muted">
        Choose the default success message or redirect. Add conditions to send
        visitors to different pages based on their answers.
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        {(
          [
            ["message", "Show message"],
            ["redirect", "Redirect"],
          ] as const
        ).map(([value, label]) => {
          const active = (defaultRule.action ?? "message") === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setDefault({ action: value })}
              className={`rounded-lg border px-2.5 py-2 text-[12.5px] font-semibold transition ${
                active
                  ? "border-brand bg-[rgba(255,102,0,.1)] text-brand"
                  : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {(defaultRule.action ?? "message") === "message" ? (
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Success message
          </span>
          <textarea
            rows={3}
            value={defaultRule.message ?? successMessage}
            onChange={(e) => setDefault({ message: e.target.value, action: "message" })}
            className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
          />
        </label>
      ) : (
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Redirect URL
          </span>
          <input
            type="url"
            value={defaultRule.redirectUrl ?? ""}
            onChange={(e) =>
              setDefault({ redirectUrl: e.target.value, action: "redirect" })
            }
            placeholder="https://example.com/thank-you"
            className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
          />
        </label>
      )}

      {(defaultRule.action ?? "message") === "redirect" ? (
        <label className="flex items-center gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={Boolean(defaultRule.showBeforeRedirect)}
            onChange={(e) =>
              setDefault({ showBeforeRedirect: e.target.checked })
            }
          />
          Show success screen before redirect
        </label>
      ) : null}

      <SubmissionUxEditor
        value={submissionUx}
        onChange={onSubmissionUxChange}
      />

      <div className="border-t border-[#f1f4f8] pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
            Conditional confirmations
          </p>
          <button
            type="button"
            onClick={addConditional}
            disabled={conditionSources.length === 0}
            className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-40"
          >
            + Add rule
          </button>
        </div>

        {conditionalRules.length === 0 ? (
          <p className="text-[12.5px] text-faint">
            No conditional rules yet. Example: if Subject equals Support → redirect
            to /support-thanks.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {conditionalRules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-xl border border-[#e6e9f0] bg-[#f8fafc] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-semibold text-muted">If</span>
                  <button
                    type="button"
                    onClick={() => removeConditional(rule.id)}
                    className="text-[11.5px] font-semibold text-bad hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  <select
                    value={rule.condition?.fieldKey ?? ""}
                    onChange={(e) =>
                      updateConditional(rule.id, {
                        condition: {
                          fieldKey: e.target.value,
                          op: rule.condition?.op ?? "eq",
                          value: rule.condition?.value ?? "",
                        },
                      })
                    }
                    className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                  >
                    {conditionSources.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label || f.key}
                      </option>
                    ))}
                  </select>
                  <select
                    value={rule.condition?.op ?? "eq"}
                    onChange={(e) =>
                      updateConditional(rule.id, {
                        condition: {
                          fieldKey: rule.condition?.fieldKey ?? "",
                          op: e.target.value as FormConditionOp,
                          value: rule.condition?.value,
                        },
                      })
                    }
                    className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                  >
                    {OPS.map((o) => (
                      <option key={o.op} value={o.op}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={rule.condition?.value ?? ""}
                    disabled={
                      rule.condition?.op === "empty" || rule.condition?.op === "filled"
                    }
                    onChange={(e) =>
                      updateConditional(rule.id, {
                        condition: {
                          fieldKey: rule.condition?.fieldKey ?? "",
                          op: rule.condition?.op ?? "eq",
                          value: e.target.value,
                        },
                      })
                    }
                    placeholder="Match value"
                    className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand disabled:opacity-40"
                  />
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {(
                      [
                        ["message", "Show message"],
                        ["redirect", "Redirect"],
                      ] as const
                    ).map(([value, label]) => {
                      const active = rule.action === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateConditional(rule.id, { action: value })}
                          className={`rounded-lg border px-2 py-1.5 text-[12px] font-semibold ${
                            active
                              ? "border-brand bg-[rgba(255,102,0,.1)] text-brand"
                              : "border-[#dbe1ea] bg-white text-muted"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {rule.action === "redirect" ? (
                    <>
                      <input
                        type="url"
                        value={rule.redirectUrl ?? ""}
                        onChange={(e) =>
                          updateConditional(rule.id, { redirectUrl: e.target.value })
                        }
                        placeholder="https://example.com/page"
                        className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                      />
                      <label className="flex items-center gap-2 text-[12px] text-muted">
                        <input
                          type="checkbox"
                          checked={Boolean(rule.showBeforeRedirect)}
                          onChange={(e) =>
                            updateConditional(rule.id, {
                              showBeforeRedirect: e.target.checked,
                            })
                          }
                        />
                        Show success screen before redirect
                      </label>
                    </>
                  ) : (
                    <textarea
                      rows={2}
                      value={rule.message ?? ""}
                      onChange={(e) =>
                        updateConditional(rule.id, { message: e.target.value })
                      }
                      placeholder="Custom success message"
                      className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FileFieldSettings({
  config,
  onChange,
}: {
  config?: FormFileConfig;
  onChange: (next: FormFileConfig) => void;
}) {
  const cfg = resolveFileConfig(config);
  function patch(partial: Partial<FormFileConfig>) {
    onChange(resolveFileConfig({ ...cfg, ...partial }));
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        File manager
      </p>
      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={cfg.multiple}
          onChange={(e) => patch({ multiple: e.target.checked })}
        />
        Allow multiple files
      </label>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Accept (MIME / extensions)
        </span>
        <input
          value={cfg.accept}
          onChange={(e) => patch({ accept: e.target.value })}
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 font-mono text-[12px] outline-none focus:border-brand"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Max size (MB)
          </span>
          <input
            type="number"
            min={1}
            max={100}
            value={cfg.maxSizeMb}
            onChange={(e) => patch({ maxSizeMb: Number(e.target.value) })}
            className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Max files
          </span>
          <input
            type="number"
            min={1}
            max={20}
            disabled={!cfg.multiple}
            value={cfg.maxFiles}
            onChange={(e) => patch({ maxFiles: Number(e.target.value) })}
            className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand disabled:opacity-40"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={cfg.virusScan}
          onChange={(e) => patch({ virusScan: e.target.checked })}
        />
        Request virus scan
      </label>
      <p className="text-[11px] leading-snug text-faint">
        Virus scan runs on the server when available. Client still checks type and size.
      </p>
    </div>
  );
}

function AppointmentFieldSettings({
  config,
  onChange,
}: {
  config?: FormAppointmentConfig;
  onChange: (next: FormAppointmentConfig) => void;
}) {
  const cfg = resolveAppointmentConfig(config);
  function patch(partial: Partial<FormAppointmentConfig>) {
    onChange(resolveAppointmentConfig({ ...cfg, ...partial }));
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        Appointment
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Min days from today
          </span>
          <input
            type="number"
            min={0}
            max={365}
            value={cfg.minDaysFromToday}
            onChange={(e) =>
              patch({ minDaysFromToday: Number(e.target.value) })
            }
            className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Max days ahead
          </span>
          <input
            type="number"
            min={1}
            max={365}
            value={cfg.maxDaysAhead}
            onChange={(e) => patch({ maxDaysAhead: Number(e.target.value) })}
            className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
          />
        </label>
      </div>
      <div>
        <span className="mb-1.5 block text-[11.5px] font-semibold text-muted">
          Available weekdays
        </span>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAY_LABELS.map((label, day) => {
            const on = cfg.weekdays.includes(day);
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  const next = on
                    ? cfg.weekdays.filter((d) => d !== day)
                    : [...cfg.weekdays, day].sort((a, b) => a - b);
                  patch({ weekdays: next.length ? next : [day] });
                }}
                className={[
                  "rounded-md border px-2 py-1 text-[11px] font-semibold",
                  on
                    ? "border-brand bg-[#fff8f3] text-brand"
                    : "border-[#dbe1ea] text-muted",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Time slots (HH:mm, comma-separated)
        </span>
        <textarea
          rows={3}
          value={cfg.slots.join(", ")}
          onChange={(e) =>
            patch({
              slots: e.target.value
                .split(/[,\n]/)
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 font-mono text-[12px] outline-none focus:border-brand"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Slot duration (minutes)
        </span>
        <input
          type="number"
          min={5}
          max={480}
          value={cfg.slotDurationMin}
          onChange={(e) =>
            patch({ slotDurationMin: Number(e.target.value) })
          }
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        />
      </label>
      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={cfg.showTimezone}
          onChange={(e) => patch({ showTimezone: e.target.checked })}
        />
        Auto-detect timezone (with override)
      </label>
    </div>
  );
}

function EmptySide({ hint }: { hint: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#dbe1ea] bg-[#f8fafc] px-3 py-8 text-center text-[12.5px] leading-relaxed text-muted">
      {hint}
    </div>
  );
}

function UltimatePreview({
  theme,
  fields,
  allFields,
  rows = [],
  logic,
  values,
  onChange,
  submitLabel,
  isLast,
  onBack,
  onNext,
}: {
  theme: FormTheme;
  fields: FormField[];
  allFields?: FormField[];
  rows?: FormRowConfig[];
  logic?: FormLogicConfig;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  submitLabel: string;
  isLast: boolean;
  onBack?: () => void;
  onNext?: () => void;
}) {
  const [focused, setFocused] = useState<Record<string, boolean>>({});
  const visible = fields.filter((f) => fieldVisible(f, values));
  const structureUnits = groupFieldsForStructure(visible);
  const scoreFields = allFields ?? fields;
  const logicCfg = normalizeLogic(logic);
  const showScore = Boolean(logicCfg.score?.enabled && logicCfg.score.showLive !== false);
  const showPrice = Boolean(
    logicCfg.pricing?.enabled && logicCfg.pricing.showLive !== false,
  );
  const liveScore = showScore ? computeScore(scoreFields, values) : 0;
  const liveBudget = showPrice
    ? computeBudget(logicCfg, scoreFields, values)
    : null;
  const style = themeStyle(theme);
  const condClasses = resolveConditionalClasses(theme, values);
  const primaryOverride = theme.conditionalStyles.find((r) =>
    condClasses.includes(r.className) && r.primaryOverride,
  )?.primaryOverride;

  const inputClass = "w-full bg-transparent outline-none";
  const shellStyle: CSSProperties = {
    background: "var(--avx-input-bg, #ffffff)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--avx-input-border, #dbe1ea)",
    borderRadius: "var(--avx-radius, 8px)",
    boxShadow: "var(--avx-input-shadow, none)",
    transition: `border-color var(--avx-input-transition, 150ms), box-shadow var(--avx-input-transition, 150ms)`,
    boxSizing: "border-box",
    width: "100%",
    minHeight: "var(--avx-input-h, 42px)",
    display: "flex",
    alignItems: "center",
    fontFamily: "var(--avx-font)",
  };
  const fieldStyle: CSSProperties = {
    color: "var(--avx-input-text, #13233c)",
    padding: "var(--avx-pad-y, 10px) var(--avx-pad-x, 12px)",
    fontSize: "var(--avx-font-size, 14px)",
    fontFamily: "var(--avx-font)",
    width: "100%",
    minHeight: "var(--avx-input-h, 42px)",
    boxSizing: "border-box",
    border: 0,
    background: "transparent",
    outline: "none",
  };

  return (
    <div
      className={["flex flex-col", ...condClasses].filter(Boolean).join(" ")}
      style={{
        ...style,
        ...(primaryOverride
          ? {
              ["--avx-primary" as string]: primaryOverride,
              ["--avx-btn-bg" as string]: primaryOverride,
              ["--avx-next-bg" as string]: primaryOverride,
              ["--avx-required" as string]: primaryOverride,
            }
          : null),
        direction: theme.rtl ? "rtl" : "ltr",
        gap: "var(--avx-field-gap)",
        fontFamily: "var(--avx-font)",
        fontSize: "var(--avx-font-size)",
        fontWeight: "var(--avx-font-weight)" as CSSProperties["fontWeight"],
        lineHeight: "var(--avx-leading)",
        letterSpacing: "var(--avx-letter)",
        textTransform: "var(--avx-transform)" as CSSProperties["textTransform"],
        background: "var(--avx-form-bg)",
        color: "var(--avx-type-color)",
        maxWidth: "min(var(--avx-form-width), var(--avx-form-max))",
        marginInline: "auto",
        marginBlock: "var(--avx-container-my)",
        padding: "var(--avx-container-pad)",
        borderRadius: "var(--avx-container-radius)",
        border: "var(--avx-container-bw) var(--avx-container-bs) var(--avx-container-border)",
        boxShadow: "var(--avx-container-shadow)",
        backdropFilter: "var(--avx-container-blur)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {(theme.brandKit.logoUrl || theme.brandKit.brandName) && (
        <div className="mb-1 flex items-center gap-2">
          {theme.brandKit.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={theme.brandKit.logoUrl}
              alt=""
              className="h-7 w-auto max-w-[120px] object-contain"
            />
          ) : null}
          {theme.brandKit.brandName ? (
            <span className="text-[13px] font-bold" style={{ color: "var(--avx-label)" }}>
              {theme.brandKit.brandName}
            </span>
          ) : null}
        </div>
      )}
      {(showScore || showPrice) && (
        <div className="flex flex-col gap-2" style={{ marginBottom: 4 }}>
          {showScore ? (
            <div
              className="flex flex-wrap gap-3 rounded-[10px] border px-3 py-2.5 text-[13px] font-bold"
              style={{
                borderColor: "var(--avx-input-border, #dbe1ea)",
                background: "var(--avx-upload-bg, #f8fafc)",
                color: "var(--avx-label)",
              }}
            >
              <span>
                {logicCfg.score?.label || "Score"}: {liveScore}
              </span>
            </div>
          ) : null}
          {showPrice && liveBudget ? (
            <BudgetBreakdownView
              budget={liveBudget}
              label={logicCfg.pricing?.label || "Estimate"}
            />
          ) : null}
        </div>
      )}
      <div
        className="grid"
        style={{
          gap: "var(--avx-row-gap) var(--avx-col-gap)",
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
        }}
      >
        {structureUnits.map((unit) => {
          const list = unit.kind === "row" ? unit.fields : [unit.field];
          const row =
            unit.kind === "row" ? resolveRow(unit.rowId, rows) : undefined;
          const cells = list.map((f) => {
          const span = forcesFullWidth(f.type) ? 12 : toColSpan(f.width);
          const rowMode = row?.mode === "flex" ? "flex" : "grid";
          const colStyle: CSSProperties = fieldColReactStyle(span, rowMode);
          const required = fieldIsRequired(f, values);
          if (f.type === "section") {
            return (
              <div
                key={f.key}
                className="border-b pb-1"
                style={{
                  gridColumn: "1 / -1",
                  color: "var(--avx-label)",
                  fontSize: "var(--avx-section-size)",
                  fontWeight: "var(--avx-section-weight)" as CSSProperties["fontWeight"],
                  marginBlock: "var(--avx-section-my)",
                  paddingBlock: "var(--avx-section-py)",
                  borderColor: "var(--avx-section-border)",
                  borderBottomWidth: "var(--avx-section-bw)",
                }}
              >
                {f.label}
              </div>
            );
          }
          if (f.type === "hidden") return null;

          if (f.type === "recaptcha") {
            return (
              <div
                key={f.key}
                className="text-center text-[12px]"
                style={{
                  gridColumn: "1 / -1",
                  padding: theme.recaptcha.size === "compact" ? 8 : 12,
                  border: "1px dashed var(--avx-border)",
                  borderRadius: "var(--avx-radius)",
                  color: "var(--avx-text-muted)",
                  background:
                    theme.recaptcha.theme === "dark" ? "#0f172a" : "transparent",
                }}
              >
                reCAPTCHA · {theme.recaptcha.theme}/{theme.recaptcha.size}
              </div>
            );
          }

          if (f.type === "file") {
            return (
              <div key={f.key} style={colStyle}>
                <FileUploadControl
                  label={f.label}
                  required={required}
                  fileConfig={f.fileConfig}
                  valueLabel={values[f.key]}
                  showLabel={theme.labels.show}
                  onChange={(names) => onChange(f.key, names)}
                />
              </div>
            );
          }

          if (f.type === "appointment") {
            return (
              <div key={f.key} style={colStyle}>
                <AppointmentPicker
                  label={f.label}
                  required={required}
                  appointmentConfig={f.appointmentConfig}
                  value={values[f.key]}
                  showLabel={theme.labels.show}
                  onChange={(next) => onChange(f.key, next)}
                />
              </div>
            );
          }

          if (f.type === "roi") {
            let parsed: {
              investment?: number;
              months?: number;
              projected?: number;
            } = {};
            try {
              parsed = values[f.key] ? JSON.parse(values[f.key]) : {};
            } catch {
              parsed = {};
            }
            const inv = parsed.investment ?? f.roiConfig?.defaultInvestment ?? 5000;
            const months = parsed.months ?? f.roiConfig?.defaultMonths ?? 6;
            const projected =
              parsed.projected ??
              Math.round(inv * (f.roiConfig?.returnMultiple ?? 2.5));
            const pct =
              inv > 0 ? Math.round(((projected - inv) / inv) * 100) : 0;
            return (
              <div key={f.key} style={colStyle} className="rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
                {theme.labels.show !== false ? (
                  <p className="mb-2 text-[13px] font-semibold text-[#13233c]">
                    {f.label}
                    {required ? " *" : ""}
                  </p>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="text-[12px] text-muted">
                    Investment
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-[#dbe1ea] px-2 py-1.5"
                      value={inv}
                      onChange={(e) => {
                        const investment = Number(e.target.value) || 0;
                        const nextProjected = Math.round(
                          investment * (f.roiConfig?.returnMultiple ?? 2.5),
                        );
                        onChange(
                          f.key,
                          JSON.stringify({
                            investment,
                            months,
                            projected: nextProjected,
                          }),
                        );
                      }}
                    />
                  </label>
                  <label className="text-[12px] text-muted">
                    Months
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-[#dbe1ea] px-2 py-1.5"
                      value={months}
                      onChange={(e) => {
                        const m = Number(e.target.value) || 1;
                        onChange(
                          f.key,
                          JSON.stringify({
                            investment: inv,
                            months: m,
                            projected,
                          }),
                        );
                      }}
                    />
                  </label>
                  <label className="text-[12px] text-muted">
                    Projected
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-[#dbe1ea] px-2 py-1.5"
                      value={projected}
                      onChange={(e) => {
                        const p = Number(e.target.value) || 0;
                        onChange(
                          f.key,
                          JSON.stringify({
                            investment: inv,
                            months,
                            projected: p,
                          }),
                        );
                      }}
                    />
                  </label>
                </div>
                <p className="mt-2 text-[12.5px] font-semibold text-[#13233c]">
                  {pct}% projected ROI
                </p>
              </div>
            );
          }

          if (
            f.type === "select" ||
            f.type === "multiselect" ||
            f.type === "radio"
          ) {
            return (
              <div key={f.key} style={colStyle}>
                <ChoiceOptionsControl
                  field={f}
                  value={values[f.key] ?? ""}
                  showLabel={theme.labels.show}
                  onChange={(v) => onChange(f.key, v)}
                />
              </div>
            );
          }

          if (f.type === "rating") {
            const max = theme.rating.max;
            const icon =
              theme.rating.icon === "heart"
                ? "♥"
                : theme.rating.icon === "emoji"
                  ? "😊"
                  : theme.rating.icon === "custom"
                    ? theme.rating.customIcon || "★"
                    : "★";
            const current = Number(values[f.key] || 0);
            return (
              <div key={f.key} style={{ gridColumn: "1 / -1" }}>
                {theme.labels.show && (
                  <div
                    className="mb-1.5 font-semibold"
                    style={{
                      color: "var(--avx-label)",
                      fontSize: "var(--avx-label-size)",
                    }}
                  >
                    {f.label}
                  </div>
                )}
                <div className="flex gap-1" style={{ fontSize: "var(--avx-rating-size)" }}>
                  {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onChange(f.key, String(n))}
                      style={{
                        background: "none",
                        border: 0,
                        padding: 0,
                        cursor: "pointer",
                        color:
                          n <= current
                            ? "var(--avx-rating-on)"
                            : "var(--avx-rating-off)",
                        fontSize: "inherit",
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            );
          }

          if (f.type === "signature") {
            return (
              <label
                key={f.key}
                className="block"
                style={{ gridColumn: "1 / -1", color: "var(--avx-label)" }}
              >
                {theme.labels.show && (
                  <span className="mb-1.5 block font-semibold" style={{ fontSize: "var(--avx-label-size)" }}>
                    {f.label}
                  </span>
                )}
                <div
                  style={{
                    height: "var(--avx-sig-h)",
                    background: "var(--avx-sig-bg)",
                    border: "var(--avx-sig-bw) solid var(--avx-sig-border)",
                    borderRadius: "var(--avx-radius)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--avx-text-muted)",
                    fontSize: 12,
                  }}
                >
                  Signature pad
                </div>
                <input
                  type="text"
                  value={values[f.key] ?? ""}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  placeholder="Signed (preview)"
                  className="mt-2 w-full outline-none"
                  style={{ ...fieldStyle, ...shellStyle, border: "1px solid var(--avx-input-border, #dbe1ea)" }}
                />
              </label>
            );
          }

          if (f.type === "toggle") {
            return (
              <label
                key={f.key}
                className="flex items-center gap-2.5"
                style={{ gridColumn: "1 / -1", color: "var(--avx-input-text)" }}
              >
                <input
                  type="checkbox"
                  className="avx-toggle"
                  checked={values[f.key] === "1"}
                  onChange={(e) => onChange(f.key, e.target.checked ? "1" : "")}
                  style={{
                    appearance: "none",
                    width: `calc(var(--avx-toggle-size) * 1.8)`,
                    height: "var(--avx-toggle-size)",
                    borderRadius: 999,
                    background:
                      values[f.key] === "1"
                        ? "var(--avx-toggle-active)"
                        : "var(--avx-toggle-inactive)",
                    cursor: "pointer",
                    border: 0,
                  }}
                />
                <span style={{ fontSize: "var(--avx-font-size)" }}>{f.label}</span>
              </label>
            );
          }

          if (f.type === "range") {
            return (
              <label
                key={f.key}
                className="block"
                style={{
                  ...colStyle,
                  color: "var(--avx-label)",
                  fontSize: "var(--avx-label-size)",
                }}
              >
                {theme.labels.show && (
                  <span className="mb-1.5 block font-semibold">
                    {f.label}
                    {theme.range.showBubble ? (
                      <span className="ml-2 font-mono text-faint">
                        {values[f.key] || "50"}
                      </span>
                    ) : null}
                  </span>
                )}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={values[f.key] || "50"}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  className="w-full"
                  style={{ accentColor: "var(--avx-range-active)" }}
                />
              </label>
            );
          }

          const floatText = fieldFloatText(f);
          const floating =
            fieldUsesFloating(f, theme) && f.type !== "checkbox";
          const usingPlaceholderAsFloat = fieldAnimatesFloat(f, theme);
          const stackedTitle =
            !theme.labels.show || fieldUsesFloating(f, theme)
              ? ""
              : (f.label?.trim() ?? "");
          const phValue = effectivePlaceholder(f, theme) ?? "";
          const isFocused = Boolean(focused[f.key]);
          const floatRaised =
            !usingPlaceholderAsFloat ||
            isFocused ||
            Boolean((values[f.key] ?? "").trim());

          return (
            <label
              key={f.key}
              className="block min-w-0"
              style={{
                ...colStyle,
                color: "var(--avx-label)",
                fontSize: "var(--avx-label-size)",
                fontWeight: "var(--avx-label-weight)" as CSSProperties["fontWeight"],
                margin: "var(--avx-field-margin)",
                marginTop: floating
                  ? "calc(var(--avx-label-size, 13px) * 0.55)"
                  : undefined,
                display:
                  stackedTitle || floating || f.type === "checkbox" ? "block" : "contents",
                position: floating ? "relative" : undefined,
              }}
            >
              {f.type !== "checkbox" && floating ? (
                <span
                  style={
                    floatLabelInlineStyle({
                      animate: usingPlaceholderAsFloat,
                      raised: floatRaised,
                      focused: isFocused,
                      textarea: f.type === "textarea",
                    }) as CSSProperties
                  }
                >
                  {floatText}
                  {required ? (
                    <span style={{ color: "var(--avx-required)" }}>
                      {" "}
                      {theme.labels.requiredText}
                    </span>
                  ) : null}
                </span>
              ) : null}
              {f.type !== "checkbox" && !floating && stackedTitle ? (
                <span
                  className="avx-label-text block"
                  style={{
                    display: "var(--avx-label-display)",
                    marginBottom: "var(--avx-label-mb)",
                  }}
                >
                  {stackedTitle}
                  {required ? (
                    <span style={{ color: "var(--avx-required)" }}>
                      {" "}
                      {theme.labels.requiredText}
                    </span>
                  ) : null}
                </span>
              ) : null}

              {f.type === "textarea" ? (
                <div style={{ ...shellStyle, alignItems: "stretch", minHeight: "auto" }}>
                  <textarea
                    rows={3}
                    value={values[f.key] ?? ""}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    onFocus={() => setFocused((s) => ({ ...s, [f.key]: true }))}
                    onBlur={() => setFocused((s) => ({ ...s, [f.key]: false }))}
                    placeholder={usingPlaceholderAsFloat ? " " : phValue || undefined}
                    className={inputClass}
                    style={{ ...fieldStyle, minHeight: 84, resize: "vertical" }}
                  />
                </div>
              ) : f.type === "checkbox" ? (
                <span
                  className="flex items-center gap-2 font-normal"
                  style={{
                    fontSize: "var(--avx-font-size)",
                    color: "var(--avx-input-text)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={values[f.key] === "1"}
                    onChange={(e) => onChange(f.key, e.target.checked ? "1" : "")}
                    style={{
                      accentColor: "var(--avx-check-on)",
                      width: "var(--avx-check-size)",
                      height: "var(--avx-check-size)",
                    }}
                  />
                  {f.label}
                  {required ? (
                    <span style={{ color: "var(--avx-required)" }}>
                      {" "}
                      {theme.labels.requiredText}
                    </span>
                  ) : null}
                </span>
              ) : (
                <div style={shellStyle}>
                  <input
                    /* Preview uses text+inputMode so password/email extensions
                       (e.g. Temp Mail) don't strip the visible field chrome. */
                    type={
                      f.type === "number"
                        ? "number"
                        : f.type === "date"
                          ? "date"
                          : f.type === "url"
                            ? "url"
                            : "text"
                    }
                    inputMode={
                      f.type === "email"
                        ? "email"
                        : f.type === "phone"
                          ? "tel"
                          : f.type === "number"
                            ? "numeric"
                            : undefined
                    }
                    autoComplete="off"
                    value={values[f.key] ?? ""}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    onFocus={() => setFocused((s) => ({ ...s, [f.key]: true }))}
                    onBlur={() => setFocused((s) => ({ ...s, [f.key]: false }))}
                    placeholder={usingPlaceholderAsFloat ? " " : phValue || undefined}
                    className={inputClass}
                    style={fieldStyle}
                  />
                </div>
              )}
              {f.description?.trim() &&
              (f.caption?.descriptionPosition ?? "below") === "below" ? (
                <p
                  className="mt-1.5 mb-0 text-[12px] leading-snug"
                  style={{ color: "var(--avx-text-muted, #5b6b83)" }}
                >
                  {f.description}
                </p>
              ) : null}
            </label>
          );
          });

          if (unit.kind === "row") {
            return (
              <div
                key={`row-${unit.rowId}`}
                style={{
                  gridColumn: "1 / -1",
                  ...rowReactStyle(row),
                }}
              >
                {cells}
              </div>
            );
          }
          return cells;
        })}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="font-semibold"
            style={{
              background: "var(--avx-prev-bg)",
              color: "var(--avx-prev-text)",
              borderRadius: "var(--avx-btn-radius)",
              padding: "var(--avx-btn-py) var(--avx-btn-px)",
              fontSize: "var(--avx-btn-size)",
              fontWeight: "var(--avx-btn-weight)" as CSSProperties["fontWeight"],
              fontFamily: "inherit",
              width: "auto",
              boxShadow: "var(--avx-btn-shadow)",
            }}
          >
            Back
          </button>
        )}
        {onNext ? (
          <button
            type="button"
            onClick={onNext}
            className="font-semibold"
            style={{
              background: "var(--avx-next-bg)",
              color: "var(--avx-next-text)",
              borderRadius: "var(--avx-btn-radius)",
              padding: "var(--avx-btn-py) var(--avx-btn-px)",
              fontSize: "var(--avx-btn-size)",
              fontWeight: "var(--avx-btn-weight)" as CSSProperties["fontWeight"],
              fontFamily: "inherit",
              width: "auto",
              boxShadow: "var(--avx-btn-shadow)",
            }}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="font-semibold opacity-90"
            style={{
              background: "var(--avx-btn-bg)",
              color: "var(--avx-btn-text)",
              borderRadius: "var(--avx-btn-radius)",
              padding: "var(--avx-btn-py) var(--avx-btn-px)",
              fontSize: "var(--avx-btn-size)",
              fontWeight: "var(--avx-btn-weight)" as CSSProperties["fontWeight"],
              fontFamily: "inherit",
              width: "var(--avx-btn-width)",
              marginLeft: "var(--avx-btn-ml)",
              marginRight: "var(--avx-btn-mr)",
              boxShadow: "var(--avx-btn-shadow)",
            }}
          >
            {isLast ? submitLabel || "Send" : "Continue"}
          </button>
        )}
      </div>
    </div>
  );
}
