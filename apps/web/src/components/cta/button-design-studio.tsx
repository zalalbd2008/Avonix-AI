"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  CtaActionType,
  CtaButton,
  CtaButtonGroup,
  CtaButtonPayload,
  CtaGroupSettings,
  CtaPageTarget,
  CtaStatus,
} from "@/lib/db/schema";
import {
  actionCreateCtaButtonFromTemplate,
  actionDeleteCtaButton,
  actionDeleteCtaButtonTemplate,
  actionDeleteCtaGroup,
  actionReorderCtaButtons,
  actionSaveCtaButton,
  actionSaveCtaGroup,
} from "@/lib/cta/cta-actions";
import { SaveCtaTemplateDialog } from "@/components/cta/save-cta-template-dialog";
import {
  defaultGroupSettings,
  mergeGroupSettings,
  PAGE_SURFACES,
  summarizePageTarget,
} from "@/lib/cta/defaults";
import {
  ACTION_OPTIONS,
  BUTTON_FONTS,
  DESIGN_PRESETS,
  applyDesignPreset,
  buttonDesignToCss,
  defaultButtonDesign,
  designToLegacyStyle,
  mergeButtonDesign,
  type ButtonDesign,
  type DesignPresetId,
  type HoverFx,
} from "@/lib/cta/button-design";
import {
  FA_CATALOG_COUNT,
  faClassName,
  resolveFaStyleForName,
  searchFaIcons,
  type FaStyle,
} from "@/lib/cta/fa-icons";
import { PageHeader } from "@/components/shell/page-header";
import { SetupBadge } from "@/components/ui/setup-badge";

type GroupRow = CtaButtonGroup & { buttons: CtaButton[] };
type Device = "desktop" | "tablet" | "mobile";
type PanelId =
  | "groupRules"
  | "presets"
  | "layout"
  | "typography"
  | "icon"
  | "colors"
  | "effects"
  | "responsive"
  | "states"
  | "badge"
  | "action"
  | "liveChat"
  | "a11y"
  | "advanced";

const PANELS: { id: PanelId; label: string }[] = [
  { id: "groupRules", label: "Group · page rules" },
  { id: "presets", label: "Design presets" },
  { id: "layout", label: "Layout" },
  { id: "typography", label: "Typography" },
  { id: "icon", label: "Icon library" },
  { id: "colors", label: "Colors" },
  { id: "effects", label: "Hover & motion" },
  { id: "responsive", label: "Responsive" },
  { id: "states", label: "State manager" },
  { id: "badge", label: "Badge & notify" },
  { id: "action", label: "Button text" },
  { id: "liveChat", label: "Live chat button" },
  { id: "a11y", label: "Accessibility" },
  { id: "advanced", label: "Advanced CSS" },
];

const HOVER_FX: { value: HoverFx; label: string }[] = [
  { value: "none", label: "None" },
  { value: "lift", label: "Lift" },
  { value: "grow", label: "Grow" },
  { value: "shrink", label: "Shrink" },
  { value: "pulse", label: "Pulse" },
  { value: "bounce", label: "Bounce" },
  { value: "glow", label: "Glow" },
  { value: "float", label: "Float" },
  { value: "tilt", label: "Tilt" },
  { value: "rotate", label: "Rotate" },
  { value: "flip", label: "Flip" },
  { value: "darken", label: "Darken" },
  { value: "shake", label: "Shake" },
  { value: "liquid", label: "Liquid" },
  { value: "magnetic", label: "Magnetic" },
  { value: "morph", label: "Morph" },
  { value: "gradientShift", label: "Gradient shift" },
];

const input =
  "w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/15";
const labelCls = "text-[12px] font-medium text-ink";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={labelCls}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  unit = "px",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  unit?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2.5">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[#e6e9f0] accent-brand"
        />
        <span className="w-11 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted">
          {value}
          {unit}
        </span>
      </div>
    </Field>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          type="color"
          className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-line bg-white p-0.5"
          value={value.startsWith("#") ? value.slice(0, 7) : "#ff6600"}
          onChange={(e) => onChange(e.target.value)}
        />
        <input className={input} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

function previewIconClass(key: string, style: FaStyle = "solid") {
  return faClassName(key, style);
}

export type CtaTemplateOption = {
  id: string;
  name: string;
  scope?: string;
  status?: string;
};

export function ButtonDesignStudio({
  clientId,
  websiteId,
  websiteName,
  initialGroups,
  popupOptions = [],
  initialTemplates = [],
  memberRole = "member",
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  initialGroups: GroupRow[];
  /** Popups (or popup-mount forms) available to bind. */
  popupOptions?: { id: string; name: string }[];
  initialTemplates?: CtaTemplateOption[];
  memberRole?: "owner" | "admin" | "member";
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState(initialGroups[0]?.id ?? null);
  const [buttonId, setButtonId] = useState(initialGroups[0]?.buttons[0]?.id ?? null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [templateDialog, setTemplateDialog] = useState<{
    name: string;
    payload: CtaButtonPayload;
    buttonId?: string;
  } | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [panel, setPanel] = useState<PanelId | null>("groupRules");
  const [device, setDevice] = useState<Device>("mobile");
  const [previewDark, setPreviewDark] = useState(false);
  const [label, setLabel] = useState("Get started");
  const [actionType, setActionType] = useState<CtaActionType>("open_url");
  const [actionUrl, setActionUrl] = useState("https://");
  const [actionPhone, setActionPhone] = useState("");
  const [eventName, setEventName] = useState("");
  const [popupMode, setPopupMode] = useState<"select" | "custom">("select");
  const [design, setDesign] = useState<ButtonDesign>(defaultButtonDesign());
  const [groupName, setGroupName] = useState(
    initialGroups[0]?.name ?? "Button group",
  );
  const [groupSettings, setGroupSettings] = useState<CtaGroupSettings>(() =>
    mergeGroupSettings(initialGroups[0]?.settings),
  );
  const [priorityRank, setPriorityRank] = useState(
    initialGroups[0]?.priorityRank ?? 100,
  );
  const [iconSearch, setIconSearch] = useState("");
  const deferredIconSearch = useDeferredValue(iconSearch);
  const iconResults = useMemo(
    () =>
      searchFaIcons(
        deferredIconSearch,
        deferredIconSearch.trim() ? 120 : 64,
        (design.icon.faStyle as FaStyle | undefined) ?? "all",
      ),
    [deferredIconSearch, design.icon.faStyle],
  );

  const layerSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const selected = groups.find((g) => g.id === selectedId) ?? null;
  const active =
    selected?.buttons.find((b) => b.id === buttonId) ?? selected?.buttons[0] ?? null;

  useEffect(() => {
    if (!active) return;
    setLabel(active.payload.label || "Button");
    setActionType(active.payload.action?.type ?? "open_url");
    setActionUrl(active.payload.action?.url ?? "");
    setActionPhone(active.payload.action?.phone ?? "");
    setEventName(active.payload.eventName ?? "");
    const existing = (active.payload.eventName ?? "").trim();
    if (!existing) setPopupMode("select");
    else if (popupOptions.some((p) => p.id === existing)) setPopupMode("select");
    else setPopupMode("custom");
    const d = mergeButtonDesign(active.payload.style);
    if (active.payload.iconKey && active.payload.iconKey !== "none") {
      d.icon.key =
        active.payload.iconKey === "call"
          ? "phone"
          : active.payload.iconKey === "mail"
            ? "envelope"
            : active.payload.iconKey === "message"
              ? "comment"
              : active.payload.iconKey === "ai-chat"
                ? "robot"
                : active.payload.iconKey === "live-chat"
                  ? "headset"
                  : active.payload.iconKey;
    }
    setDesign(d);
  }, [active?.id]);

  useEffect(() => {
    if (!selected) return;
    setGroupName(selected.name);
    setGroupSettings(mergeGroupSettings(selected.settings));
    setPriorityRank(selected.priorityRank ?? 100);
  }, [selected?.id]);

  function patchPageTarget(partial: Partial<CtaPageTarget>) {
    setGroupSettings((s) => ({
      ...s,
      pageTarget: { ...s.pageTarget, ...partial },
    }));
  }

  function toggleSurface(
    surface: NonNullable<CtaPageTarget["surfaces"]>[number],
  ) {
    setGroupSettings((s) => {
      const cur = new Set(s.pageTarget.surfaces ?? []);
      if (cur.has(surface)) cur.delete(surface);
      else cur.add(surface);
      return {
        ...s,
        pageTarget: { ...s.pageTarget, surfaces: [...cur] },
      };
    });
  }

  useEffect(() => {
    const id = "avonix-fa-cdn";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css";
    document.head.appendChild(link);
  }, []);

  const css = useMemo(
    () => buttonDesignToCss(design, device),
    [design, device],
  );

  function patchDesign(next: ButtonDesign) {
    setDesign(next);
  }

  function patchLayout(partial: Partial<ButtonDesign["layout"]>) {
    patchDesign({
      ...design,
      presetId: "custom",
      layout: { ...design.layout, ...partial },
    });
  }

  function createGroup() {
    startTransition(async () => {
      const result = await actionSaveCtaGroup({
        clientId,
        websiteId,
        name: "Button group",
        status: "draft",
        settings: defaultGroupSettings(),
      });
      if (!result.ok) setError(result.error);
      else window.location.reload();
    });
  }

  function addButton() {
    if (!selected) return;
    const d = defaultButtonDesign();
    const payload: CtaButtonPayload = {
      label: "New button",
      iconKey: "none",
      action: { type: "open_url", url: "https://" },
      style: designToLegacyStyle(d) as unknown as CtaButtonPayload["style"],
    };
    startTransition(async () => {
      const result = await actionSaveCtaButton({
        groupId: selected.id,
        clientId,
        websiteId,
        name: "New button",
        payload,
        sortOrder: selected.buttons.length,
      });
      if (!result.ok) setError(result.error);
      else window.location.reload();
    });
  }

  function duplicateButton(source: CtaButton) {
    if (!selected) return;
    const payload: CtaButtonPayload = {
      ...structuredClone(source.payload),
      label: `${source.payload.label || source.name} (copy)`,
    };
    // Match group publish state so the copy appears on the live footer
    const status: CtaStatus =
      selected.status === "published" ? "published" : source.status;
    const nextCount = selected.buttons.length + 1;
    const maxVisible = groupSettings.maxVisible ?? 0;
    const needsMoreSlots = maxVisible > 0 && nextCount > maxVisible;

    startTransition(async () => {
      if (needsMoreSlots) {
        const nextSettings = {
          ...groupSettings,
          maxVisible: nextCount,
        };
        const groupOk = await actionSaveCtaGroup({
          id: selected.id,
          clientId,
          websiteId,
          name: groupName.trim() || selected.name,
          status: selected.status,
          priorityRank,
          settings: nextSettings,
        });
        if (!groupOk.ok) {
          setError(groupOk.error);
          return;
        }
        setGroupSettings(nextSettings);
      }

      const result = await actionSaveCtaButton({
        groupId: selected.id,
        clientId,
        websiteId,
        name: payload.label,
        payload,
        status,
        isEnabled: source.isEnabled ?? true,
        sortOrder: selected.buttons.length,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  function onLayerDragEnd(event: DragEndEvent) {
    if (!selected) return;
    const { active: dragActive, over } = event;
    if (!over || dragActive.id === over.id) return;
    const ids = selected.buttons.map((b) => b.id);
    const oldIndex = ids.indexOf(String(dragActive.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const orderedIds = arrayMove(ids, oldIndex, newIndex);
    setGroups((gs) =>
      gs.map((g) =>
        g.id !== selected.id
          ? g
          : {
              ...g,
              buttons: arrayMove(g.buttons, oldIndex, newIndex).map(
                (b, i) => ({ ...b, sortOrder: i }),
              ),
            },
      ),
    );
    startTransition(async () => {
      const result = await actionReorderCtaButtons({
        groupId: selected.id,
        clientId,
        websiteId,
        orderedIds,
      });
      if (!result.ok) setError(result.error);
    });
  }

  function customLinksText(): string {
    return (groupSettings.pageTarget.rules ?? [])
      .map((r) => {
        if (r.op === "starts_with") {
          const base = r.value.endsWith("/") ? r.value.slice(0, -1) : r.value;
          return `${base}/*`;
        }
        return r.value;
      })
      .join("\n");
  }

  function applyCustomLinks(text: string) {
    const lines = text
      .split(/\n|,/)
      .map((l) => l.trim())
      .filter(Boolean);
    const rules: NonNullable<CtaPageTarget["rules"]> = [];
    for (const line of lines) {
      let value = line;
      try {
        if (/^https?:\/\//i.test(value)) {
          value = new URL(value).pathname || "/";
        }
      } catch {
        /* keep raw */
      }
      if (!value.startsWith("/")) value = `/${value}`;
      if (value.endsWith("/*") || value.endsWith("*")) {
        value = value.replace(/\*+$/, "").replace(/\/$/, "") || "/";
        rules.push({ op: "starts_with", value });
      } else {
        rules.push({ op: "equals", value });
      }
    }
    setGroupSettings((s) => ({
      ...s,
      pageTarget: {
        ...s.pageTarget,
        mode:
          rules.length > 0 && s.pageTarget.mode === "everywhere"
            ? "include"
            : s.pageTarget.mode,
        rules,
      },
    }));
  }

  async function persistGroupRules(): Promise<boolean> {
    if (!selected) return false;
    const result = await actionSaveCtaGroup({
      id: selected.id,
      clientId,
      websiteId,
      name: groupName.trim() || selected.name,
      status: selected.status,
      priorityRank,
      settings: groupSettings,
    });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setGroups((gs) =>
      gs.map((g) =>
        g.id === selected.id
          ? {
              ...g,
              name: groupName.trim() || g.name,
              priorityRank,
              settings: groupSettings,
            }
          : g,
      ),
    );
    return true;
  }

  function currentButtonPayload(): CtaButtonPayload {
    return {
      label: label.trim() || "Button",
      iconKey: design.icon.key === "phone" ? "call" : design.icon.key,
      eventName: eventName.trim() || undefined,
      action: {
        type: eventName.trim() ? "open_popup" : actionType,
        url: actionUrl,
        phone: actionPhone || undefined,
        popupId: eventName.trim() || undefined,
      },
      style: designToLegacyStyle(design) as unknown as CtaButtonPayload["style"],
      ariaLabel: design.a11y.ariaLabel || label,
    };
  }

  function openSaveTemplate() {
    if (!active) return;
    setTemplateDialog({
      buttonId: active.id,
      name: label.trim() || active.name,
      payload: currentButtonPayload(),
    });
  }

  function applyTemplate(templateId: string) {
    if (!selected) return;
    startTransition(async () => {
      setError(null);
      const result = await actionCreateCtaButtonFromTemplate({
        templateId,
        groupId: selected.id,
        clientId,
        websiteId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  function save() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const groupOk = await persistGroupRules();
      if (!groupOk) return;

      if (!active) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1600);
        return;
      }

      const payload = currentButtonPayload();
      const result = await actionSaveCtaButton({
        id: active.id,
        groupId: selected.id,
        clientId,
        websiteId,
        name: label.trim() || active.name,
        payload,
        status: active.status,
        isEnabled: active.isEnabled,
        sortOrder: active.sortOrder,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGroups((gs) =>
        gs.map((g) =>
          g.id !== selected.id
            ? g
            : {
                ...g,
                name: groupName.trim() || g.name,
                priorityRank,
                settings: groupSettings,
                buttons: g.buttons.map((b) =>
                  b.id === active.id ? { ...b, name: payload.label, payload } : b,
                ),
              },
        ),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    });
  }

  function togglePublish() {
    if (!selected) return;
    const status: CtaStatus =
      selected.status === "published" ? "draft" : "published";
    startTransition(async () => {
      const result = await actionSaveCtaGroup({
        id: selected.id,
        clientId,
        websiteId,
        name: groupName.trim() || selected.name,
        status,
        priorityRank,
        settings: groupSettings,
      });
      if (!result.ok) setError(result.error);
      else
        setGroups((gs) =>
          gs.map((g) =>
            g.id === selected.id
              ? {
                  ...g,
                  status,
                  name: groupName.trim() || g.name,
                  priorityRank,
                  settings: groupSettings,
                }
              : g,
          ),
        );
    });
  }

  const frameW =
    device === "desktop" ? "100%" : device === "tablet" ? 420 : 320;

  const visibleOnDevice =
    (device === "desktop" && design.visibility.desktop) ||
    (device === "tablet" && design.visibility.tablet) ||
    (device === "mobile" && design.visibility.mobile);

  return (
    <div>
      <PageHeader
        title="Button Design Studio"
        subtitle={`Design-system component studio for ${websiteName}`}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={createGroup}
              className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-semibold hover:bg-[#f8fafc]"
            >
              + Group
            </button>
            <button
              type="button"
              disabled={pending || !selected}
              onClick={addButton}
              className="rounded-lg bg-brand px-3 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
            >
              + Button
            </button>
          </div>
        }
      />

      {error ? (
        <p className="mb-3 rounded-xl border border-bad/20 bg-red-50 px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      ) : null}

      {!selected ? (
        <EmptyState onCreate={createGroup} pending={pending} />
      ) : (
        <div className="grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
          {/* Layers */}
          <aside className="flex max-h-[min(82vh,920px)] flex-col overflow-hidden rounded-xl border border-line bg-white">
            <div className="border-b border-[#edf0f5] px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-[0.08em] text-faint uppercase">
                Groups
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {groups.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(g.id);
                        setButtonId(g.buttons[0]?.id ?? null);
                        setPanel("groupRules");
                      }}
                      className={`flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left text-[12.5px] ${
                        selectedId === g.id
                          ? "bg-brand/10 font-semibold text-brand-dark"
                          : "hover:bg-[#f4f6f9]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate">{g.name}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                            g.status === "published"
                              ? "bg-ok/10 text-ok"
                              : "bg-[#eef2f7] text-muted"
                          }`}
                        >
                          {g.status === "published" ? "LIVE" : "DRAFT"}
                        </span>
                      </span>
                      <span className="truncate text-[10px] font-normal text-muted">
                        {summarizePageTarget(
                          mergeGroupSettings(g.settings).pageTarget,
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-[#edf0f5] px-3 py-2">
                <p className="text-[10px] font-semibold tracking-[0.08em] text-faint uppercase">
                  Layers
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pending || !selected}
                    onClick={() => setShowTemplates((v) => !v)}
                    className="text-[11px] font-semibold text-muted"
                  >
                    Templates
                  </button>
                  <button
                    type="button"
                    onClick={addButton}
                    className="text-[11px] font-semibold text-brand"
                  >
                    + Add
                  </button>
                </div>
              </div>
              {showTemplates ? (
                <div className="mx-2 mt-2 max-h-36 space-y-1 overflow-y-auto rounded-lg border border-brand/20 bg-brand/5 p-2">
                  {templates.length === 0 ? (
                    <p className="px-1 py-2 text-[11px] text-muted">
                      <SetupBadge kind="setup" /> No templates yet — use Save as
                      template on a button.
                    </p>
                  ) : (
                    templates.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-1 rounded-md bg-white px-2 py-1.5"
                      >
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => applyTemplate(t.id)}
                          className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold text-ink"
                        >
                          {t.name}
                          <span className="ml-1 font-normal capitalize text-faint">
                            {t.scope ?? ""}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="text-[10px] font-semibold text-bad"
                          onClick={() => {
                            if (!confirm("Delete this button template?")) return;
                            startTransition(async () => {
                              const res = await actionDeleteCtaButtonTemplate({
                                id: t.id,
                                clientId,
                                websiteId,
                              });
                              if (!res.ok) setError(res.error);
                              else
                                setTemplates((prev) =>
                                  prev.filter((x) => x.id !== t.id),
                                );
                            });
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
              <p className="px-3 pt-1.5 text-[10px] text-muted">
                Drag to reorder · left→right on footer
              </p>
              <DndContext
                sensors={layerSensors}
                collisionDetection={closestCenter}
                onDragEnd={onLayerDragEnd}
              >
                <SortableContext
                  items={selected.buttons.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex-1 space-y-1 overflow-y-auto p-2">
                    {selected.buttons.map((b) => (
                      <SortableLayerItem
                        key={b.id}
                        button={b}
                        selected={active?.id === b.id}
                        pending={pending}
                        onSelect={() => setButtonId(b.id)}
                        onDuplicate={() => duplicateButton(b)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>
            <div className="space-y-1 border-t border-[#edf0f5] p-2.5">
              <button
                type="button"
                disabled={pending}
                onClick={togglePublish}
                className={`w-full rounded-lg py-2 text-[12px] font-semibold ${
                  selected.status === "published"
                    ? "border border-line"
                    : "bg-brand text-white hover:bg-brand-dark"
                }`}
              >
                {selected.status === "published" ? "Unpublish" : "Publish"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm("Delete this group?")) return;
                  startTransition(async () => {
                    await actionDeleteCtaGroup({
                      id: selected.id,
                      clientId,
                      websiteId,
                    });
                    window.location.reload();
                  });
                }}
                className="w-full rounded-lg py-1.5 text-[12px] font-semibold text-bad hover:bg-red-50"
              >
                Delete group
              </button>
            </div>
          </aside>

          {/* Preview stage */}
          <section className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0f5] px-3 py-2.5">
              <p className="text-[12px] font-semibold text-ink">Live preview</p>
              <div className="ml-auto flex rounded-lg border border-line p-0.5">
                {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDevice(d)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize ${
                      device === d
                        ? "bg-brand text-white"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPreviewDark((v) => !v)}
                className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-muted"
              >
                {previewDark ? "Light" : "Dark"}
              </button>
            </div>
            <div
              className={`flex flex-1 items-end justify-center p-6 ${
                previewDark ? "bg-[#0b1e3a]" : "bg-[#f4f6f9]"
              }`}
            >
              <div
                className={`relative overflow-hidden rounded-[28px] border shadow-[0_24px_60px_-28px_rgba(11,30,58,0.45)] transition-all ${
                  previewDark ? "border-white/10 bg-[#13233c]" : "border-line bg-white"
                }`}
                style={{
                  width: frameW,
                  maxWidth: "100%",
                  minHeight: device === "desktop" ? 360 : 480,
                }}
              >
                <div
                  className={`flex h-8 items-center gap-1.5 border-b px-3 ${
                    previewDark ? "border-white/10" : "border-[#edf0f5]"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                  <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
                  <span className="h-2 w-2 rounded-full bg-[#28c840]" />
                </div>
                <div className="relative flex min-h-[380px] flex-col">
                  <div className="flex-1 p-5">
                    <div
                      className={`h-3 w-2/3 rounded ${previewDark ? "bg-white/10" : "bg-[#e6e9f0]"}`}
                    />
                    <div
                      className={`mt-2 h-3 w-1/2 rounded ${previewDark ? "bg-white/10" : "bg-[#e6e9f0]"}`}
                    />
                    <div
                      className={`mt-4 h-24 rounded-xl ${previewDark ? "bg-white/5" : "bg-[#f1f4f8]"}`}
                    />
                  </div>
                  {visibleOnDevice ? (
                    <div
                      className={`sticky bottom-0 border-t p-px ${
                        previewDark
                          ? "border-white/10 bg-[#0b1e3a]/90"
                          : "border-line bg-white/95"
                      } backdrop-blur`}
                    >
                      <div
                        className="flex flex-wrap gap-px"
                        style={{
                          justifyContent:
                            design.layout.alignX === "left"
                              ? "flex-start"
                              : design.layout.alignX === "right"
                                ? "flex-end"
                                : "center",
                        }}
                      >
                        <button
                          type="button"
                          className={`avx-studio-preview-btn avx-fx-${design.hover.effect}`}
                          style={css}
                        >
                          {design.icon.key !== "none" &&
                          (design.icon.position === "before" ||
                            design.icon.position === "top") ? (
                            design.icon.pack === "custom" &&
                            design.icon.customUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={design.icon.customUrl}
                                alt=""
                                style={{
                                  width: "var(--avx-btn-icon-size)",
                                  height: "var(--avx-btn-icon-size)",
                                  objectFit: "contain",
                                  transform: `rotate(${design.icon.rotation}deg)${
                                    design.icon.flipX ? " scaleX(-1)" : ""
                                  }${design.icon.flipY ? " scaleY(-1)" : ""}`,
                                }}
                                aria-hidden
                              />
                            ) : (
                              <i
                                className={previewIconClass(
                                  design.icon.key,
                                  design.icon.faStyle ?? "solid",
                                )}
                                style={{
                                  fontSize: "var(--avx-btn-icon-size)",
                                  color: "var(--avx-btn-icon)",
                                  transform: `rotate(${design.icon.rotation}deg)${
                                    design.icon.flipX ? " scaleX(-1)" : ""
                                  }${design.icon.flipY ? " scaleY(-1)" : ""}`,
                                }}
                                aria-hidden
                              />
                            )
                          ) : null}
                          <span>{label}</span>
                          {design.icon.key !== "none" &&
                          design.icon.position === "after" ? (
                            design.icon.pack === "custom" &&
                            design.icon.customUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={design.icon.customUrl}
                                alt=""
                                style={{
                                  width: "var(--avx-btn-icon-size)",
                                  height: "var(--avx-btn-icon-size)",
                                  objectFit: "contain",
                                }}
                                aria-hidden
                              />
                            ) : (
                              <i
                                className={previewIconClass(
                                  design.icon.key,
                                  design.icon.faStyle ?? "solid",
                                )}
                                style={{ fontSize: "var(--avx-btn-icon-size)" }}
                                aria-hidden
                              />
                            )
                          ) : null}
                          {design.badge?.enabled ? (
                            <span
                              className="absolute -top-1.5 -right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                              style={{
                                background: design.badge.bg,
                                color: design.badge.textColor,
                              }}
                            >
                              {design.badge.text}
                            </span>
                          ) : null}
                          {design.notification?.enabled ? (
                            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bad px-1 text-[9px] font-bold text-white">
                              {design.notification.count || ""}
                              {design.notification.ping ? (
                                <span className="absolute inset-0 animate-ping rounded-full bg-bad/40" />
                              ) : null}
                            </span>
                          ) : null}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="p-4 text-center text-[12px] text-faint">
                      Hidden on {device}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-[#edf0f5] px-3 py-2.5">
              <button
                type="button"
                disabled={pending || !selected}
                onClick={save}
                className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
              >
                {active ? "Save design & rules" : "Save group rules"}
              </button>
              {active ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={openSaveTemplate}
                  className="rounded-lg border border-line px-3 py-2 text-[13px] font-semibold text-ink"
                >
                  Save as template
                </button>
              ) : null}
              {active ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("Remove this button?")) return;
                    startTransition(async () => {
                      await actionDeleteCtaButton({
                        id: active.id,
                        clientId,
                        websiteId,
                      });
                      window.location.reload();
                    });
                  }}
                  className="rounded-lg border border-line px-3 py-2 text-[13px] font-semibold text-bad"
                >
                  Remove
                </button>
              ) : null}
              {saved ? (
                <span className="text-[12px] font-medium text-ok">Saved</span>
              ) : null}
              <span className="ml-auto text-[11px] text-faint">
                Preset · {design.presetId}
              </span>
            </div>
          </section>

          {/* Design panels */}
          <aside className="flex max-h-[min(82vh,920px)] flex-col overflow-hidden rounded-xl border border-line bg-white">
            <div className="border-b border-[#edf0f5] px-3 py-2.5">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
                Visual designer
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted">
                Set group page rules first — then style each button layer.
              </p>
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
              {PANELS.map((p) => {
                if (p.id !== "groupRules" && !active) return null;
                const open = panel === p.id;
                return (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-lg border border-[#e6e9f0]"
                  >
                    <button
                      type="button"
                      onClick={() => setPanel(open ? null : p.id)}
                      className="flex w-full items-center justify-between bg-[#f8fafc] px-2.5 py-2 text-left text-[12.5px] font-semibold text-ink hover:bg-[#f1f4f8]"
                    >
                      {p.label}
                      <span className="text-[10px] text-faint">
                        {open ? "▾" : "▸"}
                      </span>
                    </button>
                    {open ? (
                      <div className="space-y-3 border-t border-[#e6e9f0] bg-white p-2.5">
                          {p.id === "groupRules" && (
                            <>
                              <p className="text-[11px] leading-snug text-muted">
                                Each group can target different pages. Publish
                                multiple groups so homepage, shop, blog, etc.
                                show different footer buttons.
                              </p>
                              <Field label="Group name">
                                <input
                                  className={input}
                                  value={groupName}
                                  onChange={(e) => setGroupName(e.target.value)}
                                  placeholder="e.g. Homepage footer"
                                />
                              </Field>
                              <Field label="Show this group on">
                                <select
                                  className={input}
                                  value={groupSettings.pageTarget.mode}
                                  onChange={(e) =>
                                    patchPageTarget({
                                      mode: e.target.value as CtaPageTarget["mode"],
                                    })
                                  }
                                >
                                  <option value="everywhere">
                                    Everywhere (all pages)
                                  </option>
                                  <option value="include">
                                    Only matching pages
                                  </option>
                                  <option value="exclude">
                                    Everywhere except matches
                                  </option>
                                </select>
                              </Field>

                              <Field label="Custom page links">
                                <textarea
                                  className={`${input} min-h-[88px] font-mono text-[12px]`}
                                  value={customLinksText()}
                                  placeholder={
                                    "/contact\n/services/*\nhttps://yoursite.com/about"
                                  }
                                  onChange={(e) =>
                                    applyCustomLinks(e.target.value)
                                  }
                                />
                                <p className="mt-1 text-[10px] leading-snug text-muted">
                                  One path or full URL per line. Use{" "}
                                  <code>/*</code> for prefix match (e.g.{" "}
                                  <code>/shop/*</code>). Adding links switches
                                  to “Only matching” if set to Everywhere.
                                </p>
                              </Field>

                              {groupSettings.pageTarget.mode !== "everywhere" ? (
                                <>
                                  <div>
                                    <p className={labelCls}>WP surfaces</p>
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {PAGE_SURFACES.map((s) => {
                                        const on = (
                                          groupSettings.pageTarget.surfaces ?? []
                                        ).includes(s.value);
                                        return (
                                          <button
                                            key={s.value}
                                            type="button"
                                            onClick={() => toggleSurface(s.value)}
                                            className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
                                              on
                                                ? "border-brand bg-brand/10 text-brand-dark"
                                                : "border-line text-muted hover:border-brand/40"
                                            }`}
                                          >
                                            {s.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </>
                              ) : null}

                              <Field label="Always hide on paths (optional)">
                                <input
                                  className={input}
                                  value={(
                                    groupSettings.pageTarget.excludePaths ?? []
                                  ).join(", ")}
                                  placeholder="/checkout, /cart"
                                  onChange={(e) =>
                                    patchPageTarget({
                                      excludePaths: e.target.value
                                        .split(",")
                                        .map((v) => v.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                />
                                <p className="mt-1 text-[10px] text-muted">
                                  Comma-separated path fragments. Applied even
                                  in “Everywhere” mode.
                                </p>
                              </Field>

                              <Field label="Priority rank (lower = first)">
                                <input
                                  className={input}
                                  type="number"
                                  min={1}
                                  max={9999}
                                  value={priorityRank}
                                  onChange={(e) =>
                                    setPriorityRank(
                                      Number(e.target.value) || 100,
                                    )
                                  }
                                />
                              </Field>

                              <Field label="Max buttons visible">
                                <input
                                  className={input}
                                  type="number"
                                  min={0}
                                  max={20}
                                  value={groupSettings.maxVisible ?? 0}
                                  onChange={(e) =>
                                    setGroupSettings((s) => ({
                                      ...s,
                                      maxVisible: Math.max(
                                        0,
                                        Math.min(
                                          20,
                                          Number(e.target.value) || 0,
                                        ),
                                      ),
                                    }))
                                  }
                                />
                                <p className="mt-1 text-[10px] text-muted">
                                  <code>0</code> = show all buttons in this
                                  group (no cap).
                                </p>
                              </Field>

                              <label className="flex items-start gap-2 text-[12px] font-medium text-ink">
                                <input
                                  type="checkbox"
                                  className="mt-0.5"
                                  checked={Boolean(groupSettings.exclusive)}
                                  onChange={(e) =>
                                    setGroupSettings((s) => ({
                                      ...s,
                                      exclusive: e.target.checked,
                                    }))
                                  }
                                />
                                <span>
                                  Exclusive footer
                                  <span className="mt-0.5 block text-[11px] font-normal text-muted">
                                    When this group matches, ignore
                                    lower-priority groups on that page.
                                  </span>
                                </span>
                              </label>

                              <p className="rounded-lg bg-[#f4f6f9] px-2.5 py-2 text-[11px] leading-snug text-muted">
                                Preview:{" "}
                                <span className="font-semibold text-ink">
                                  {summarizePageTarget(groupSettings.pageTarget)}
                                </span>
                                {groupSettings.exclusive
                                  ? " · exclusive"
                                  : ""}
                              </p>
                            </>
                          )}

                          {p.id === "presets" && (
                            <div className="grid grid-cols-2 gap-1.5">
                              {DESIGN_PRESETS.map((pr) => (
                                <button
                                  key={pr.id}
                                  type="button"
                                  onClick={() =>
                                    patchDesign(
                                      applyDesignPreset(
                                        design,
                                        pr.id as DesignPresetId,
                                      ),
                                    )
                                  }
                                  className={`rounded-lg border px-2 py-2 text-left ${
                                    design.presetId === pr.id
                                      ? "border-brand bg-brand/5"
                                      : "border-line hover:border-brand/30"
                                  }`}
                                >
                                  <span className="block text-[12px] font-semibold">
                                    {pr.label}
                                  </span>
                                  <span className="text-[10px] text-faint">
                                    {pr.hint}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {p.id === "layout" && (
                            <>
                              <Field label="Width mode">
                                <select
                                  className={input}
                                  value={design.layout.widthMode}
                                  onChange={(e) =>
                                    patchLayout({
                                      widthMode: e.target
                                        .value as ButtonDesign["layout"]["widthMode"],
                                    })
                                  }
                                >
                                  <option value="auto">Auto</option>
                                  <option value="full">Full width</option>
                                  <option value="fixed">Fixed</option>
                                  <option value="custom">Custom</option>
                                </select>
                              </Field>
                              {(design.layout.widthMode === "fixed" ||
                                design.layout.widthMode === "custom") && (
                                <Slider
                                  label="Width"
                                  value={design.layout.widthPx}
                                  min={80}
                                  max={480}
                                  onChange={(n) => patchLayout({ widthPx: n })}
                                />
                              )}
                              <Slider
                                label="Padding X"
                                value={design.layout.paddingX}
                                min={0}
                                max={64}
                                onChange={(n) => patchLayout({ paddingX: n })}
                              />
                              <Slider
                                label="Padding Y"
                                value={design.layout.paddingY}
                                min={0}
                                max={48}
                                onChange={(n) => patchLayout({ paddingY: n })}
                              />
                              <Slider
                                label="Radius"
                                value={design.layout.radius}
                                min={0}
                                max={40}
                                onChange={(n) => patchLayout({ radius: n })}
                              />
                              <Field label="Align">
                                <select
                                  className={input}
                                  value={design.layout.alignX}
                                  onChange={(e) =>
                                    patchLayout({
                                      alignX: e.target
                                        .value as ButtonDesign["layout"]["alignX"],
                                    })
                                  }
                                >
                                  <option value="left">Left</option>
                                  <option value="center">Center</option>
                                  <option value="right">Right</option>
                                  <option value="justify">Justify</option>
                                </select>
                              </Field>
                            </>
                          )}

                          {p.id === "typography" && (
                            <>
                              <Field label="Font">
                                <select
                                  className={input}
                                  value={design.typography.fontFamily}
                                  onChange={(e) =>
                                    patchDesign({
                                      ...design,
                                      presetId: "custom",
                                      typography: {
                                        ...design.typography,
                                        fontFamily: e.target.value,
                                      },
                                    })
                                  }
                                >
                                  {BUTTON_FONTS.map((f) => (
                                    <option key={f.label} value={f.value}>
                                      {f.label}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <Slider
                                label="Weight"
                                value={design.typography.weight}
                                min={100}
                                max={900}
                                unit=""
                                onChange={(n) =>
                                  patchDesign({
                                    ...design,
                                    presetId: "custom",
                                    typography: {
                                      ...design.typography,
                                      weight: Math.round(n / 100) * 100,
                                    },
                                  })
                                }
                              />
                              <Slider
                                label={`Size · ${device}`}
                                value={design.typography.size[device]}
                                min={10}
                                max={28}
                                onChange={(n) =>
                                  patchDesign({
                                    ...design,
                                    presetId: "custom",
                                    typography: {
                                      ...design.typography,
                                      size: {
                                        ...design.typography.size,
                                        [device]: n,
                                      },
                                    },
                                  })
                                }
                              />
                              <Field label="Transform">
                                <select
                                  className={input}
                                  value={design.typography.transform}
                                  onChange={(e) =>
                                    patchDesign({
                                      ...design,
                                      presetId: "custom",
                                      typography: {
                                        ...design.typography,
                                        transform: e.target
                                          .value as ButtonDesign["typography"]["transform"],
                                      },
                                    })
                                  }
                                >
                                  <option value="none">None</option>
                                  <option value="uppercase">Uppercase</option>
                                  <option value="lowercase">Lowercase</option>
                                  <option value="capitalize">Capitalize</option>
                                </select>
                              </Field>
                            </>
                          )}

                          {p.id === "icon" && (
                            <>
                              <label className="flex items-center gap-2 text-[12px] font-semibold text-[#13233c]">
                                <input
                                  type="checkbox"
                                  checked={design.icon.key !== "none"}
                                  onChange={(e) =>
                                    patchDesign({
                                      ...design,
                                      presetId: "custom",
                                      icon: {
                                        ...design.icon,
                                        key: e.target.checked ? "phone" : "none",
                                        pack: e.target.checked
                                          ? design.icon.pack === "lucide"
                                            ? "fa"
                                            : design.icon.pack
                                          : design.icon.pack,
                                      },
                                    })
                                  }
                                />
                                Show icon
                              </label>

                              {design.icon.key !== "none" ? (
                                <>
                                  <Field label="Icon pack">
                                    <select
                                      className={input}
                                      value={design.icon.pack}
                                      onChange={(e) =>
                                        patchDesign({
                                          ...design,
                                          presetId: "custom",
                                          icon: {
                                            ...design.icon,
                                            pack: e.target
                                              .value as ButtonDesign["icon"]["pack"],
                                          },
                                        })
                                      }
                                    >
                                      <option value="fa">Font Awesome</option>
                                      <option value="custom">Custom SVG / image URL</option>
                                    </select>
                                  </Field>

                                  {design.icon.pack === "custom" ? (
                                    <Field label="Custom icon URL">
                                      <input
                                        className={input}
                                        value={design.icon.customUrl ?? ""}
                                        placeholder="https://…/icon.svg"
                                        onChange={(e) =>
                                          patchDesign({
                                            ...design,
                                            presetId: "custom",
                                            icon: {
                                              ...design.icon,
                                              customUrl: e.target.value,
                                              key: e.target.value.trim()
                                                ? "custom"
                                                : "none",
                                            },
                                          })
                                        }
                                      />
                                    </Field>
                                  ) : (
                                    <>
                                      <Field label="FA style">
                                        <select
                                          className={input}
                                          value={design.icon.faStyle ?? "solid"}
                                          onChange={(e) =>
                                            patchDesign({
                                              ...design,
                                              presetId: "custom",
                                              icon: {
                                                ...design.icon,
                                                faStyle: e.target
                                                  .value as FaStyle,
                                              },
                                            })
                                          }
                                        >
                                          <option value="solid">Solid</option>
                                          <option value="regular">Regular</option>
                                          <option value="brands">Brands</option>
                                        </select>
                                      </Field>
                                      <Field label="Search icons">
                                        <input
                                          className={input}
                                          value={iconSearch}
                                          placeholder={`Search ${FA_CATALOG_COUNT.toLocaleString()} Font Awesome Free icons…`}
                                          onChange={(e) =>
                                            setIconSearch(e.target.value)
                                          }
                                        />
                                        <p className="mt-1 text-[10px] text-muted">
                                          Full FA 6 Free catalog (solid, regular,
                                          brands). Results filter by the FA style
                                          above.
                                        </p>
                                      </Field>
                                      <Field label="Icon name (any FA slug)">
                                        <div className="flex gap-1.5">
                                          <input
                                            className={input}
                                            value={
                                              design.icon.key === "none"
                                                ? ""
                                                : design.icon.key
                                            }
                                            placeholder="e.g. phone-volume"
                                            onChange={(e) => {
                                              const raw = e.target.value
                                                .trim()
                                                .replace(/^fa-/, "");
                                              const style =
                                                resolveFaStyleForName(
                                                  raw,
                                                  design.icon.faStyle ?? "solid",
                                                );
                                              patchDesign({
                                                ...design,
                                                presetId: "custom",
                                                icon: {
                                                  ...design.icon,
                                                  key: raw || "none",
                                                  pack: "fa",
                                                  faStyle: style,
                                                },
                                              });
                                            }}
                                          />
                                          <button
                                            type="button"
                                            className="shrink-0 rounded-lg border border-line px-2 text-[11px] font-semibold text-muted hover:border-brand hover:text-brand"
                                            onClick={() =>
                                              patchDesign({
                                                ...design,
                                                presetId: "custom",
                                                icon: {
                                                  ...design.icon,
                                                  key: "none",
                                                },
                                              })
                                            }
                                          >
                                            Clear
                                          </button>
                                        </div>
                                      </Field>
                                      <div className="max-h-56 overflow-y-auto rounded-lg border border-line p-1.5">
                                        <div className="grid grid-cols-4 gap-1">
                                          {iconResults.map((ic) => {
                                            const selected =
                                              design.icon.key === ic.name &&
                                              (design.icon.faStyle ??
                                                "solid") === ic.style;
                                            return (
                                              <button
                                                key={`${ic.style}-${ic.name}`}
                                                type="button"
                                                title={`${ic.label} (${ic.style})`}
                                                onClick={() => {
                                                  setIconSearch("");
                                                  patchDesign({
                                                    ...design,
                                                    presetId: "custom",
                                                    icon: {
                                                      ...design.icon,
                                                      pack: "fa",
                                                      key: ic.name,
                                                      faStyle: ic.style,
                                                    },
                                                  });
                                                }}
                                                className={`flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-[9px] font-semibold ${
                                                  selected
                                                    ? "border-brand bg-brand/5 text-brand-dark"
                                                    : "border-transparent text-muted hover:border-line hover:bg-[#f8fafc]"
                                                }`}
                                              >
                                                <i
                                                  className={faClassName(
                                                    ic.name,
                                                    ic.style,
                                                  )}
                                                  style={{ fontSize: 16 }}
                                                  aria-hidden
                                                />
                                                <span className="max-w-full truncate">
                                                  {ic.label}
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                        {iconResults.length === 0 ? (
                                          <p className="px-2 py-3 text-center text-[11px] text-muted">
                                            No matches — try another search or
                                            type the FA name above.
                                          </p>
                                        ) : !deferredIconSearch.trim() ? (
                                          <p className="px-2 pt-2 text-center text-[10px] text-muted">
                                            Showing first {iconResults.length} —
                                            type to search all{" "}
                                            {FA_CATALOG_COUNT.toLocaleString()}.
                                          </p>
                                        ) : null}
                                      </div>
                                    </>
                                  )}

                                  <Field label="Position">
                                    <select
                                      className={input}
                                      value={design.icon.position}
                                      onChange={(e) =>
                                        patchDesign({
                                          ...design,
                                          presetId: "custom",
                                          icon: {
                                            ...design.icon,
                                            position: e.target
                                              .value as ButtonDesign["icon"]["position"],
                                          },
                                        })
                                      }
                                    >
                                      <option value="before">Before</option>
                                      <option value="after">After</option>
                                      <option value="top">Top</option>
                                      <option value="bottom">Bottom</option>
                                    </select>
                                  </Field>
                                  <Slider
                                    label="Icon gap"
                                    value={design.icon.gap}
                                    min={0}
                                    max={24}
                                    onChange={(n) =>
                                      patchDesign({
                                        ...design,
                                        presetId: "custom",
                                        icon: { ...design.icon, gap: n },
                                      })
                                    }
                                  />
                                  <Slider
                                    label="Rotation"
                                    value={design.icon.rotation}
                                    min={0}
                                    max={360}
                                    onChange={(n) =>
                                      patchDesign({
                                        ...design,
                                        presetId: "custom",
                                        icon: { ...design.icon, rotation: n },
                                      })
                                    }
                                  />
                                </>
                              ) : (
                                <p className="text-[11px] text-muted">
                                  Enable the icon, then search or type any Font
                                  Awesome name — no fixed preset list.
                                </p>
                              )}
                            </>
                          )}

                          {p.id === "colors" && (
                            <>
                              <p className="text-[11px] font-semibold text-faint">
                                Normal
                              </p>
                              <ColorRow
                                label="Background"
                                value={design.colors.normal.bg}
                                onChange={(v) =>
                                  patchDesign({
                                    ...design,
                                    presetId: "custom",
                                    colors: {
                                      ...design.colors,
                                      normal: {
                                        ...design.colors.normal,
                                        bg: v,
                                      },
                                    },
                                  })
                                }
                              />
                              <ColorRow
                                label="Text"
                                value={design.colors.normal.text}
                                onChange={(v) =>
                                  patchDesign({
                                    ...design,
                                    presetId: "custom",
                                    colors: {
                                      ...design.colors,
                                      normal: {
                                        ...design.colors.normal,
                                        text: v,
                                        icon: v,
                                      },
                                    },
                                  })
                                }
                              />
                              <p className="pt-1 text-[11px] font-semibold text-faint">
                                Hover
                              </p>
                              <ColorRow
                                label="Background"
                                value={design.colors.hover.bg}
                                onChange={(v) =>
                                  patchDesign({
                                    ...design,
                                    presetId: "custom",
                                    colors: {
                                      ...design.colors,
                                      hover: { ...design.colors.hover, bg: v },
                                    },
                                  })
                                }
                              />
                              <Field label="Fill mode">
                                <select
                                  className={input}
                                  value={design.colors.bgMode}
                                  onChange={(e) =>
                                    patchDesign({
                                      ...design,
                                      presetId: "custom",
                                      colors: {
                                        ...design.colors,
                                        bgMode: e.target
                                          .value as ButtonDesign["colors"]["bgMode"],
                                      },
                                    })
                                  }
                                >
                                  <option value="solid">Solid</option>
                                  <option value="gradient">Gradient</option>
                                  <option value="glass">Glass</option>
                                </select>
                              </Field>
                            </>
                          )}

                          {p.id === "effects" && (
                            <>
                              <Field label="Hover effect">
                                <select
                                  className={input}
                                  value={design.hover.effect}
                                  onChange={(e) =>
                                    patchDesign({
                                      ...design,
                                      presetId: "custom",
                                      hover: {
                                        ...design.hover,
                                        effect: e.target.value as HoverFx,
                                      },
                                    })
                                  }
                                >
                                  {HOVER_FX.map((h) => (
                                    <option key={h.value} value={h.value}>
                                      {h.label}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <Slider
                                label="Duration"
                                value={design.hover.durationMs}
                                min={80}
                                max={800}
                                unit="ms"
                                onChange={(n) =>
                                  patchDesign({
                                    ...design,
                                    hover: { ...design.hover, durationMs: n },
                                  })
                                }
                              />
                              <label className="flex items-center gap-2 text-[12px]">
                                <input
                                  type="checkbox"
                                  checked={design.shadow.enabled}
                                  onChange={(e) =>
                                    patchDesign({
                                      ...design,
                                      shadow: {
                                        ...design.shadow,
                                        enabled: e.target.checked,
                                      },
                                    })
                                  }
                                />
                                Outer shadow
                              </label>
                            </>
                          )}

                          {p.id === "responsive" && (
                            <>
                              {(
                                [
                                  ["desktop", "Desktop"],
                                  ["tablet", "Tablet"],
                                  ["mobile", "Mobile"],
                                ] as const
                              ).map(([k, lab]) => (
                                <label
                                  key={k}
                                  className="flex items-center justify-between gap-2 text-[12px]"
                                >
                                  <span>{lab} visible</span>
                                  <input
                                    type="checkbox"
                                    checked={design.visibility[k]}
                                    onChange={(e) =>
                                      patchDesign({
                                        ...design,
                                        visibility: {
                                          ...design.visibility,
                                          [k]: e.target.checked,
                                        },
                                      })
                                    }
                                  />
                                </label>
                              ))}
                            </>
                          )}

                          {p.id === "states" && (
                            <p className="text-[12px] leading-relaxed text-muted">
                              Normal / Hover colors are live. Focus ring, pressed,
                              disabled, loading, and success states share the same
                              token model — extend per state in Advanced when
                              shipping micro-interactions.
                            </p>
                          )}

                          {p.id === "badge" && (
                            <>
                              <label className="flex items-center gap-2 text-[12px]">
                                <input
                                  type="checkbox"
                                  checked={!!design.badge?.enabled}
                                  onChange={(e) =>
                                    patchDesign({
                                      ...design,
                                      badge: {
                                        enabled: e.target.checked,
                                        text: design.badge?.text || "New",
                                        bg: design.badge?.bg || "#0b1e3a",
                                        textColor:
                                          design.badge?.textColor || "#fff",
                                      },
                                    })
                                  }
                                />
                                Show badge
                              </label>
                              <Field label="Badge text">
                                <input
                                  className={input}
                                  value={design.badge?.text ?? ""}
                                  onChange={(e) =>
                                    patchDesign({
                                      ...design,
                                      badge: {
                                        enabled: true,
                                        text: e.target.value,
                                        bg: design.badge?.bg || "#0b1e3a",
                                        textColor:
                                          design.badge?.textColor || "#fff",
                                      },
                                    })
                                  }
                                />
                              </Field>
                              <label className="flex items-center gap-2 text-[12px]">
                                <input
                                  type="checkbox"
                                  checked={!!design.notification?.enabled}
                                  onChange={(e) =>
                                    patchDesign({
                                      ...design,
                                      notification: {
                                        enabled: e.target.checked,
                                        count: design.notification?.count || 3,
                                        ping: true,
                                      },
                                    })
                                  }
                                />
                                Notification counter
                              </label>
                            </>
                          )}

                          {p.id === "action" && (
                            <>
                              <Field label="Button text">
                                <input
                                  className={input}
                                  value={label}
                                  onChange={(e) => setLabel(e.target.value)}
                                  placeholder="e.g. Call now"
                                />
                              </Field>
                              <Field label="Action type">
                                <select
                                  className={input}
                                  value={actionType}
                                  onChange={(e) =>
                                    setActionType(e.target.value as CtaActionType)
                                  }
                                >
                                  {ACTION_OPTIONS.map((a) => (
                                    <option key={a.value} value={a.value}>
                                      {a.label}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              <Field label="URL">
                                <input
                                  className={input}
                                  value={actionUrl}
                                  onChange={(e) => setActionUrl(e.target.value)}
                                />
                              </Field>
                              <Field label="Phone">
                                <input
                                  className={input}
                                  value={actionPhone}
                                  onChange={(e) => setActionPhone(e.target.value)}
                                />
                              </Field>
                              <div>
                                <p className={labelCls}>Open popup</p>
                                <p className="mt-0.5 text-[11px] text-faint">
                                  Pick a popup from the list, or enter a custom
                                  event id.
                                </p>
                                <div className="mt-1.5 flex rounded-lg border border-line p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPopupMode("select");
                                      if (
                                        eventName &&
                                        !popupOptions.some((p) => p.id === eventName)
                                      ) {
                                        setEventName("");
                                      }
                                    }}
                                    className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold ${
                                      popupMode === "select"
                                        ? "bg-brand text-white"
                                        : "text-muted hover:text-ink"
                                    }`}
                                  >
                                    Select popup
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPopupMode("custom")}
                                    className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold ${
                                      popupMode === "custom"
                                        ? "bg-brand text-white"
                                        : "text-muted hover:text-ink"
                                    }`}
                                  >
                                    Custom ID
                                  </button>
                                </div>
                                <div className="mt-2">
                                  {popupMode === "select" ? (
                                    <select
                                      className={input}
                                      value={
                                        popupOptions.some((p) => p.id === eventName)
                                          ? eventName
                                          : ""
                                      }
                                      onChange={(e) => {
                                        setEventName(e.target.value);
                                        if (e.target.value) {
                                          setActionType("open_popup");
                                        }
                                      }}
                                    >
                                      <option value="">
                                        {popupOptions.length
                                          ? "— Choose popup —"
                                          : "No popups yet"}
                                      </option>
                                      {popupOptions.map((pop) => (
                                        <option key={pop.id} value={pop.id}>
                                          {pop.name}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      className={input}
                                      value={eventName}
                                      placeholder="e.g. welcome-offer"
                                      onChange={(e) => {
                                        setEventName(e.target.value);
                                        if (e.target.value.trim()) {
                                          setActionType("open_popup");
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                                {popupMode === "select" &&
                                popupOptions.length === 0 ? (
                                  <p className="mt-1.5 text-[11px] text-faint">
                                    Popup Studio is live — pick a popup above, or
                                    bind a form / custom event id.
                                  </p>
                                ) : null}
                              </div>
                            </>
                          )}

                          {p.id === "liveChat" && (
                            <>
                              <label className="flex items-center gap-2 text-[12px]">
                                <input
                                  type="checkbox"
                                  checked={!!design.liveChat?.enabled}
                                  onChange={(e) =>
                                    patchDesign({
                                      ...design,
                                      liveChat: {
                                        enabled: e.target.checked,
                                        pulse: design.liveChat?.pulse ?? true,
                                        onlineDot:
                                          design.liveChat?.onlineDot ?? true,
                                        position:
                                          design.liveChat?.position ?? "right",
                                      },
                                      icon: e.target.checked
                                        ? { ...design.icon, key: "headset" }
                                        : design.icon,
                                    })
                                  }
                                />
                                Treat as Live Chat trigger
                              </label>
                              <label className="flex items-center gap-2 text-[12px]">
                                <input
                                  type="checkbox"
                                  checked={!!design.liveChat?.pulse}
                                  onChange={(e) =>
                                    patchDesign({
                                      ...design,
                                      liveChat: {
                                        enabled: true,
                                        pulse: e.target.checked,
                                        onlineDot:
                                          design.liveChat?.onlineDot ?? true,
                                        position:
                                          design.liveChat?.position ?? "right",
                                      },
                                    })
                                  }
                                />
                                Pulse animation
                              </label>
                              <label className="flex items-center gap-2 text-[12px]">
                                <input
                                  type="checkbox"
                                  checked={!!design.liveChat?.onlineDot}
                                  onChange={(e) =>
                                    patchDesign({
                                      ...design,
                                      liveChat: {
                                        enabled: true,
                                        pulse: design.liveChat?.pulse ?? true,
                                        onlineDot: e.target.checked,
                                        position:
                                          design.liveChat?.position ?? "right",
                                      },
                                    })
                                  }
                                />
                                Online indicator
                              </label>
                            </>
                          )}

                          {p.id === "a11y" && (
                            <>
                              <Field label="ARIA / screen reader label">
                                <input
                                  className={input}
                                  value={design.a11y.ariaLabel}
                                  onChange={(e) =>
                                    patchDesign({
                                      ...design,
                                      a11y: {
                                        ...design.a11y,
                                        ariaLabel: e.target.value,
                                      },
                                    })
                                  }
                                />
                              </Field>
                              <label className="flex items-center gap-2 text-[12px]">
                                <input
                                  type="checkbox"
                                  checked={design.a11y.focusRing}
                                  onChange={(e) =>
                                    patchDesign({
                                      ...design,
                                      a11y: {
                                        ...design.a11y,
                                        focusRing: e.target.checked,
                                      },
                                    })
                                  }
                                />
                                Focus ring
                              </label>
                            </>
                          )}

                          {p.id === "advanced" && (
                            <Field label="Custom CSS">
                              <textarea
                                className={`${input} min-h-[100px] font-mono text-[11px]`}
                                value={design.customCss ?? ""}
                                placeholder=".avx-btn { }"
                                onChange={(e) =>
                                  patchDesign({
                                    ...design,
                                    customCss: e.target.value,
                                  })
                                }
                              />
                            </Field>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              {!active ? (
                <p className="px-2 py-4 text-center text-[12px] text-muted">
                  Add a button layer to edit design tokens.
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      )}

      <style>{`
        .avx-studio-preview-btn { position: relative; text-decoration: none; }
        .avx-studio-preview-btn:hover {
          background: var(--avx-btn-bg-hover) !important;
          color: var(--avx-btn-fg-hover) !important;
        }
        .avx-fx-lift:hover { transform: translateY(-2px); }
        .avx-fx-grow:hover { transform: scale(1.05); }
        .avx-fx-shrink:hover { transform: scale(0.96); }
        .avx-fx-glow:hover { box-shadow: 0 0 22px rgba(255, 102, 0, 0.45) !important; }
        .avx-fx-darken:hover { filter: brightness(0.9); }
        .avx-fx-float:hover { transform: translateY(-4px); }
        .avx-fx-tilt:hover { transform: rotate(-2deg); }
        .avx-fx-rotate:hover { transform: rotate(3deg); }
      `}</style>

      {templateDialog ? (
        <SaveCtaTemplateDialog
          open
          onClose={() => setTemplateDialog(null)}
          role={memberRole}
          clientId={clientId}
          websiteId={websiteId}
          snapshot={templateDialog}
          onSaved={(id, meta) => {
            setTemplates((prev) => [
              { id, name: meta.name, scope: "organization", status: "published" },
              ...prev,
            ]);
            setSaved(true);
            setTimeout(() => setSaved(false), 1600);
          }}
        />
      ) : null}
    </div>
  );
}

function EmptyState({
  onCreate,
  pending,
}: {
  onCreate: () => void;
  pending: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-white px-6 py-16 text-center">
      <p className="text-[15px] font-semibold tracking-[-0.01em]">
        Open the Button Design Studio
      </p>
      <p className="mx-auto mt-1.5 max-w-lg text-[13px] text-muted">
        Create a button group with page rules (homepage vs shop vs blog), then
        design each footer button. Different groups = different pages.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={onCreate}
        className="mt-5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
      >
        Create first group
      </button>
    </div>
  );
}

function DuplicateIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="7" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  );
}

function SortableLayerItem({
  button,
  selected,
  pending,
  onSelect,
  onDuplicate,
}: {
  button: CtaButton;
  selected: boolean;
  pending: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: button.id });
  const st = mergeButtonDesign(button.payload.style);
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 2 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={`flex items-center gap-0.5 rounded-lg border px-1 py-1.5 ${
          selected
            ? "border-brand/25 bg-brand/5"
            : "border-transparent hover:bg-[#f4f6f9]"
        }`}
      >
        <button
          type="button"
          title="Drag to reorder"
          className="inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-faint hover:bg-white hover:text-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-2 px-0.5 py-0.5 text-left"
        >
          <span
            className="h-7 w-7 shrink-0 rounded-md"
            style={{ background: st.colors.normal.bg }}
          />
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">
            {button.payload.label}
          </span>
          {button.status !== "published" ? (
            <span className="shrink-0 rounded bg-[#eef2f7] px-1 py-0.5 text-[9px] font-bold text-muted">
              DRAFT
            </span>
          ) : null}
        </button>
        <button
          type="button"
          title="Duplicate button"
          disabled={pending}
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-white hover:text-brand disabled:opacity-40"
        >
          <DuplicateIcon />
        </button>
      </div>
    </li>
  );
}

/** Back-compat export used by the buttons page. */
export { ButtonDesignStudio as CtaManager };
