/**
 * Visual Popup Experience Builder — Library + tabbed editor (ADR-010 P2).
 */
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type {
  Popup,
  PopupCategory,
  PopupLayout,
  PopupPayload,
  PopupPriority,
  PopupStatus,
  PopupType,
} from "@/lib/db/schema";
import {
  actionCreatePopupFromTemplate,
  actionDeletePopup,
  actionDeletePopupTemplate,
  actionSavePopup,
} from "@/lib/popup/popup-actions";
import {
  DEFAULT_POPUP_EXCLUDE_PATHS,
  POPUP_CATEGORIES,
  POPUP_CLOSE_ANIMATIONS,
  POPUP_CLOSE_HOVER_ANIMATIONS,
  POPUP_CLOSE_ICONS,
  POPUP_EDITOR_TABS,
  POPUP_LAYOUTS,
  POPUP_PRIORITIES,
  POPUP_TYPES,
  applyCampaignHeaderLook,
  defaultPopupPayload,
  popupCloseGlyph,
  slugifyPopupName,
  summarizePageTarget,
  type PopupEditorTab,
} from "@/lib/popup/defaults";
import { PageHeader } from "@/components/shell/page-header";
import { SetupBadge } from "@/components/ui/setup-badge";
import { GoogleFontPicker } from "@/components/fonts/google-font-picker";
import { googleFontsCssUrl } from "@/lib/fonts/google";
import { SavePopupTemplateDialog } from "@/components/popup/save-popup-template-dialog";
import { PopupComponentsCanvas } from "@/components/popup/popup-components-canvas";
import { PopupLivePreview } from "@/components/popup/popup-live-preview";
import {
  isSafeEmbedUrl,
  resolveFormLink,
} from "@/lib/popup/resolve-form-link";

export type PopupFormOption = {
  id: string;
  name: string;
  formNumber?: number;
  updatedAt?: string;
};

const input =
  "w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/15";

function mergePayload(raw: PopupPayload | undefined, type: PopupType): PopupPayload {
  const base = defaultPopupPayload(type);
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    type,
    slug: raw.slug || base.slug,
    category: raw.category || base.category,
    triggers: { ...base.triggers, ...raw.triggers },
    audience: {
      ...base.audience,
      ...raw.audience,
      pageTarget: {
        ...base.audience.pageTarget,
        ...raw.audience?.pageTarget,
      },
    },
    frequency: { ...base.frequency, ...raw.frequency },
    conflicts: { ...base.conflicts, ...raw.conflicts },
    design: { ...base.design, ...raw.design, grid: { ...base.design.grid, ...raw.design?.grid }, theme: { ...base.design.theme, ...raw.design?.theme } },
    content: { ...base.content, ...raw.content },
    close: { ...base.close, ...raw.close },
    behavior: { ...base.behavior, ...raw.behavior },
    schedule: { ...base.schedule, ...raw.schedule },
    automation: { ...base.automation, ...raw.automation },
    buttons: raw.buttons ?? base.buttons,
    components: raw.components ?? base.components,
  };
}

function statusBadge(status: PopupStatus) {
  if (status === "published")
    return "bg-ok/10 text-ok";
  if (status === "scheduled")
    return "bg-amber-50 text-amber-800";
  if (status === "archived")
    return "bg-[#eef2f7] text-faint";
  return "bg-[#eef2f7] text-muted";
}

export type PopupTemplateOption = {
  id: string;
  name: string;
  type: PopupType;
  description?: string | null;
  scope?: string;
  status?: string;
  updatedAt?: string;
};

export function PopupDesignStudio({
  clientId,
  websiteId,
  websiteName,
  initialPopups,
  formOptions = [],
  initialTemplates = [],
  memberRole = "member",
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  initialPopups: Popup[];
  formOptions?: PopupFormOption[];
  initialTemplates?: PopupTemplateOption[];
  memberRole?: "owner" | "admin" | "member";
}) {
  const [rows, setRows] = useState(initialPopups);
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templateDialog, setTemplateDialog] = useState<{
    name: string;
    type: PopupType;
    payload: PopupPayload;
    popupId?: string;
    category?: PopupCategory;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tab, setTab] = useState<PopupEditorTab>("general");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [formQuery, setFormQuery] = useState("");
  const [formLinkDraft, setFormLinkDraft] = useState("");
  const [formLinkHint, setFormLinkHint] = useState<string | null>(null);
  const [canvasBlockId, setCanvasBlockId] = useState<string | null>(null);

  const selected = rows.find((p) => p.id === selectedId) ?? null;

  const [name, setName] = useState("");
  const [type, setType] = useState<PopupType>("welcome");
  const [status, setStatus] = useState<PopupStatus>("draft");
  const [payload, setPayload] = useState<PopupPayload>(() =>
    defaultPopupPayload("welcome"),
  );

  useEffect(() => {
    if (!selected) return;
    setName(selected.name);
    setType(selected.type);
    setStatus(selected.status);
    const next = mergePayload(selected.payload, selected.type);
    setPayload(next);
    setFormLinkDraft(next.content.formEmbedUrl ?? "");
    setFormLinkHint(null);
    setCanvasBlockId(null);
    setTab("general");
  }, [selected?.id]);

  // Preview: load selected Google Fonts via CDN stylesheet (not self-hosted).
  useEffect(() => {
    const url = googleFontsCssUrl([
      payload.design.googleFont,
      payload.design.headingFont,
      payload.content.headlineStyle?.fontFamily,
      payload.content.descriptionStyle?.fontFamily,
    ]);
    if (!url) return;
    const id = "avonix-popup-gfont-preview";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = url;
  }, [
    payload.design.googleFont,
    payload.design.headingFont,
    payload.content.headlineStyle?.fontFamily,
    payload.content.descriptionStyle?.fontFamily,
  ]);

  const filteredLibrary = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) => {
      const hay = `${p.name} ${p.type} ${p.payload?.slug ?? ""} ${p.payload?.category ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, libraryQuery]);

  const filteredForms = useMemo(() => {
    const q = formQuery.trim().toLowerCase();
    if (!q) return formOptions;
    return formOptions.filter((f) => f.name.toLowerCase().includes(q));
  }, [formOptions, formQuery]);

  const customLinks = useMemo(() => {
    return (payload.audience.pageTarget.rules ?? [])
      .map((r) =>
        r.op === "starts_with" ? `${r.value.replace(/\/$/, "")}/*` : r.value,
      )
      .join("\n");
  }, [payload.audience.pageTarget.rules]);

  function applyCustomLinks(text: string) {
    const rules = text
      .split(/\n|,/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        let value = line;
        try {
          if (/^https?:\/\//i.test(value)) value = new URL(value).pathname || "/";
        } catch {
          /* keep */
        }
        if (!value.startsWith("/")) value = `/${value}`;
        if (value.endsWith("/*") || value.endsWith("*")) {
          value = value.replace(/\*+$/, "").replace(/\/$/, "") || "/";
          return { op: "starts_with" as const, value };
        }
        return { op: "equals" as const, value };
      });
    setPayload((p) => ({
      ...p,
      audience: {
        ...p.audience,
        pageTarget: {
          ...p.audience.pageTarget,
          mode:
            rules.length && p.audience.pageTarget.mode === "everywhere"
              ? "include"
              : p.audience.pageTarget.mode,
          rules,
        },
      },
    }));
  }

  function createFromType(t: PopupType) {
    const meta = POPUP_TYPES.find((x) => x.value === t);
    startTransition(async () => {
      const result = await actionSavePopup({
        clientId,
        websiteId,
        name: meta?.label ?? "Popup",
        type: t,
        status: "draft",
        payload: defaultPopupPayload(t),
      });
      if (!result.ok) setError(result.error);
      else window.location.reload();
    });
  }

  function createFromTemplate(templateId: string) {
    startTransition(async () => {
      setError(null);
      const result = await actionCreatePopupFromTemplate({
        templateId,
        clientId,
        websiteId,
      });
      if (!result.ok) setError(result.error);
      else window.location.reload();
    });
  }

  function saveAsTemplate(source: {
    id?: string;
    name: string;
    type: PopupType;
    payload: PopupPayload;
  }) {
    setTemplateDialog({
      popupId: source.id,
      name: source.name,
      type: source.type,
      payload: source.payload,
      category: source.payload.category,
    });
  }

  function clonePopup(source: Popup) {
    startTransition(async () => {
      const cloned = mergePayload(source.payload, source.type);
      cloned.slug = slugifyPopupName(`${source.name}-copy`);
      const result = await actionSavePopup({
        clientId,
        websiteId,
        name: `${source.name} (copy)`,
        type: source.type,
        status: "draft",
        payload: cloned,
      });
      if (!result.ok) setError(result.error);
      else window.location.reload();
    });
  }

  function cloneSelected() {
    if (!selected) return;
    clonePopup(selected);
  }

  function save() {
    if (!selected) return;
    setError(null);
    const nextPayload: PopupPayload = {
      ...payload,
      type,
      slug: payload.slug || slugifyPopupName(name),
      publishedAt:
        status === "published"
          ? payload.publishedAt || new Date().toISOString()
          : payload.publishedAt,
    };
    startTransition(async () => {
      const result = await actionSavePopup({
        id: selected.id,
        clientId,
        websiteId,
        name: name.trim() || selected.name,
        type,
        status,
        priorityRank: nextPayload.priorityRank,
        isEnabled: selected.isEnabled,
        payload: nextPayload,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((rs) =>
        rs.map((r) =>
          r.id === selected.id
            ? {
                ...r,
                name: name.trim() || r.name,
                type,
                status,
                payload: nextPayload,
                priorityRank: nextPayload.priorityRank,
              }
            : r,
        ),
      );
      setPayload(nextPayload);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    });
  }

  const formsBase = `/clients/${clientId}/forms`;

  if (!selectedId) {
    return (
      <div>
        <PageHeader
          title="Popup Library"
          subtitle={`Visual Popup Experience Builder for ${websiteName}`}
          action={
            <button
              type="button"
              disabled={pending}
              onClick={() => setCreateOpen(true)}
              className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
            >
              New popup
            </button>
          }
        />

        {error ? (
          <p className="mb-3 rounded-xl border border-bad/20 bg-red-50 px-3 py-2 text-[13px] text-bad">
            {error}
          </p>
        ) : null}

        {createOpen ? (
          <CreateTypePicker
            pending={pending}
            templates={templates}
            onCancel={() => setCreateOpen(false)}
            onPick={createFromType}
            onPickTemplate={createFromTemplate}
            onDeleteTemplate={(id) => {
              if (!confirm("Delete this template from the database?")) return;
              startTransition(async () => {
                const res = await actionDeletePopupTemplate({
                  id,
                  clientId,
                  websiteId,
                });
                if (!res.ok) setError(res.error);
                else setTemplates((prev) => prev.filter((t) => t.id !== id));
              });
            }}
          />
        ) : null}

        <div className="mb-3">
          <input
            className={input}
            value={libraryQuery}
            onChange={(e) => setLibraryQuery(e.target.value)}
            placeholder="Search popups by name, slug, type…"
          />
        </div>

        {filteredLibrary.length === 0 ? (
          <div className="rounded-xl border border-line bg-white px-6 py-16 text-center">
            <p className="text-[15px] font-semibold">No popups yet</p>
            <p className="mx-auto mt-1.5 max-w-lg text-[13px] text-muted">
              Create an experience, embed an existing Form Builder form, set
              triggers & targeting, then publish. Highest priority wins on-site.
            </p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-5 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              Create first popup
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredLibrary.map((p) => {
              const pl = mergePayload(p.payload, p.type);
              const formName = formOptions.find(
                (f) => f.id === pl.content.formId,
              )?.name;
              return (
                <article
                  key={p.id}
                  className="flex flex-col rounded-xl border border-line bg-white p-4 shadow-[0_1px_0_rgba(11,30,58,.04)]"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[14px] font-semibold text-ink">
                        {p.name}
                      </h3>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-faint">
                        {pl.slug || "—"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${statusBadge(p.status)}`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
                    <div>
                      <dt className="text-faint">Category</dt>
                      <dd className="font-medium capitalize text-ink">
                        {pl.category ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-faint">Layout</dt>
                      <dd className="font-medium text-ink">
                        {POPUP_LAYOUTS.find((l) => l.value === pl.design.layout)
                          ?.label ?? pl.design.layout}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-faint">Priority</dt>
                      <dd className="font-medium capitalize text-ink">
                        {pl.priority.replace(/_/g, " ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-faint">Type</dt>
                      <dd className="font-medium capitalize text-ink">
                        {p.type.replace(/_/g, " ")}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-faint">Display rules</dt>
                      <dd className="truncate font-medium text-ink">
                        {summarizePageTarget(pl.audience.pageTarget)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-faint">Form</dt>
                      <dd className="truncate font-medium text-ink">
                        {formName ?? (pl.content.formId ? pl.content.formId : "None")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-faint">Updated</dt>
                      <dd className="font-medium text-ink">
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-faint">Analytics</dt>
                      <dd className="font-medium">
                        <SetupBadge kind="demo" /> · <SetupBadge kind="demo" /> ·{" "}
                        <SetupBadge kind="demo" />
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-auto flex flex-wrap gap-1.5 border-t border-[#edf0f5] pt-3">
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className="rounded-md bg-brand px-2.5 py-1.5 text-[11px] font-semibold text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => clonePopup(p)}
                      className="rounded-md border border-line px-2.5 py-1.5 text-[11px] font-semibold text-ink"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        saveAsTemplate({
                          id: p.id,
                          name: p.name,
                          type: p.type,
                          payload: mergePayload(p.payload, p.type),
                        })
                      }
                      className="rounded-md border border-line px-2.5 py-1.5 text-[11px] font-semibold text-ink"
                    >
                      Save as template
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm("Archive this popup?")) return;
                        startTransition(async () => {
                          await actionSavePopup({
                            id: p.id,
                            clientId,
                            websiteId,
                            name: p.name,
                            type: p.type,
                            status: "archived",
                            payload: mergePayload(p.payload, p.type),
                          });
                          window.location.reload();
                        });
                      }}
                      className="rounded-md border border-line px-2.5 py-1.5 text-[11px] font-semibold text-muted"
                    >
                      Archive
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (
                          !confirm(
                            `Permanently delete “${p.name}” from the database? This cannot be undone.`,
                          )
                        ) {
                          return;
                        }
                        startTransition(async () => {
                          setError(null);
                          const res = await actionDeletePopup({
                            id: p.id,
                            clientId,
                            websiteId,
                          });
                          if (!res.ok) {
                            setError(res.error);
                            return;
                          }
                          setRows((prev) => prev.filter((row) => row.id !== p.id));
                        });
                      }}
                      className="rounded-md border border-bad/20 px-2.5 py-1.5 text-[11px] font-semibold text-bad hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {templateDialog ? (
          <SavePopupTemplateDialog
            open
            onClose={() => setTemplateDialog(null)}
            role={memberRole}
            clientId={clientId}
            websiteId={websiteId}
            snapshot={templateDialog}
            onSaved={(id, meta) => {
              setTemplates((prev) => [
                {
                  id,
                  name: meta.name,
                  type: meta.type,
                  description: null,
                  updatedAt: new Date().toISOString(),
                },
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

  // —— Editor ——
  return (
    <>
    <div className="min-w-0">
      <header className="mb-3 space-y-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-[-0.02em] break-words">
            {name || "Popup editor"}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Visual Popup Experience Builder
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="rounded-lg border border-line px-2.5 py-2 text-[12px] font-semibold sm:px-3 sm:text-[13px]"
            >
              ← Library
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="rounded-lg border border-line px-2.5 py-2 text-[12px] font-semibold sm:px-3 sm:text-[13px]"
            >
              Preview
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={cloneSelected}
              className="rounded-lg border border-line px-2.5 py-2 text-[12px] font-semibold sm:px-3 sm:text-[13px]"
            >
              Duplicate
            </button>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="w-full rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark sm:w-auto"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            {saved ? (
              <span className="shrink-0 text-[12px] font-medium text-ok">
                Saved
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {error ? (
        <p className="mb-3 rounded-xl border border-bad/20 bg-red-50 px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      ) : null}

      <div className="sticky top-0 z-20 -mx-1 mb-3 bg-surface/95 px-1 py-1 backdrop-blur-sm">
        <div
          className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Popup editor sections"
        >
          {POPUP_EDITOR_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={(e) => {
                setTab(t.id);
                e.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  inline: "center",
                  block: "nearest",
                });
              }}
              className={`snap-start shrink-0 rounded-lg px-3 py-2 text-[12px] font-semibold sm:px-2.5 sm:py-1.5 sm:text-[11px] ${
                tab === t.id
                  ? "bg-brand text-white"
                  : "text-muted hover:bg-[#f4f6f9] hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-faint sm:hidden">
          Swipe tabs → · {POPUP_EDITOR_TABS.find((t) => t.id === tab)?.label}
        </p>
      </div>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4 rounded-xl border border-line bg-white p-3 sm:p-4">
          {tab === "general" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Popup name">
                <input
                  className={input}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setPayload((p) => ({
                      ...p,
                      slug: p.slug?.startsWith(
                        slugifyPopupName(selected?.name ?? ""),
                      )
                        ? slugifyPopupName(e.target.value)
                        : p.slug || slugifyPopupName(e.target.value),
                    }));
                  }}
                />
              </Field>
              <Field label="Internal slug">
                <input
                  className={`${input} font-mono text-[12px]`}
                  value={payload.slug ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      slug: slugifyPopupName(e.target.value),
                    }))
                  }
                />
              </Field>
              <Field label="Category">
                <select
                  className={input}
                  value={payload.category ?? "custom"}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      category: e.target.value as PopupCategory,
                    }))
                  }
                >
                  {POPUP_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Template type">
                <select
                  className={input}
                  value={type}
                  onChange={(e) => {
                    const t = e.target.value as PopupType;
                    setType(t);
                    setPayload(defaultPopupPayload(t));
                  }}
                >
                  {POPUP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Layout (chrome)">
                <select
                  className={input}
                  value={payload.design.layout}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      design: {
                        ...p.design,
                        layout: e.target.value as PopupLayout,
                      },
                    }))
                  }
                >
                  {POPUP_LAYOUTS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className={input}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PopupStatus)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
              <Field label="Priority">
                <select
                  className={input}
                  value={payload.priority}
                  onChange={(e) => {
                    const pr = e.target.value as PopupPriority;
                    const rank =
                      POPUP_PRIORITIES.find((x) => x.value === pr)?.rank ?? 100;
                    setPayload((p) => ({
                      ...p,
                      priority: pr,
                      priorityRank: rank,
                    }));
                  }}
                >
                  {POPUP_PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priority rank (lower = first)">
                <input
                  className={input}
                  type="number"
                  value={payload.priorityRank}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      priorityRank: Number(e.target.value) || 100,
                    }))
                  }
                />
              </Field>
            </div>
          )}

          {tab === "content" && (
            <div className="space-y-4">
              <Field label="Header badge (e.g. LIMITED TIME)">
                <input
                  className={input}
                  value={payload.content.scarcityText ?? ""}
                  placeholder="LIMITED TIME"
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      content: {
                        ...p.content,
                        scarcityText: e.target.value || undefined,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Primary heading">
                <input
                  className={input}
                  value={payload.content.headline ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      content: { ...p.content, headline: e.target.value },
                    }))
                  }
                />
              </Field>
              <GoogleFontPicker
                label="Heading font"
                value={
                  payload.content.headlineStyle?.fontFamily ||
                  payload.design.headingFont ||
                  payload.design.googleFont ||
                  "system"
                }
                onChange={(family) =>
                  setPayload((p) => ({
                    ...p,
                    content: {
                      ...p.content,
                      headlineStyle: {
                        ...p.content.headlineStyle,
                        fontFamily:
                          family === "system" ? undefined : family,
                      },
                    },
                  }))
                }
              />
              <div className="grid gap-2 sm:grid-cols-4">
                <Field label="Heading size (px)">
                  <input
                    className={input}
                    type="number"
                    min={12}
                    max={48}
                    value={payload.content.headlineStyle?.fontSize ?? 20}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: {
                          ...p.content,
                          headlineStyle: {
                            ...p.content.headlineStyle,
                            fontSize: Number(e.target.value) || 20,
                          },
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Weight">
                  <select
                    className={input}
                    value={payload.content.headlineStyle?.fontWeight ?? 700}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: {
                          ...p.content,
                          headlineStyle: {
                            ...p.content.headlineStyle,
                            fontWeight: Number(e.target.value) || 700,
                          },
                        },
                      }))
                    }
                  >
                    <option value={500}>Medium</option>
                    <option value={600}>Semibold</option>
                    <option value={700}>Bold</option>
                    <option value={800}>Extra bold</option>
                  </select>
                </Field>
                <Field label="Color">
                  <input
                    className={input}
                    type="color"
                    value={payload.content.headlineStyle?.color ?? "#13233c"}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: {
                          ...p.content,
                          headlineStyle: {
                            ...p.content.headlineStyle,
                            color: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Align">
                  <select
                    className={input}
                    value={payload.content.headlineStyle?.align ?? "left"}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: {
                          ...p.content,
                          headlineStyle: {
                            ...p.content.headlineStyle,
                            align: e.target.value as "left" | "center" | "right",
                          },
                        },
                      }))
                    }
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </Field>
                <Field label="Transform">
                  <select
                    className={input}
                    value={payload.content.headlineStyle?.textTransform ?? "none"}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: {
                          ...p.content,
                          headlineStyle: {
                            ...p.content.headlineStyle,
                            textTransform: e.target.value as
                              | "none"
                              | "uppercase"
                              | "lowercase"
                              | "capitalize",
                          },
                        },
                      }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="uppercase">Uppercase</option>
                    <option value="capitalize">Capitalize</option>
                    <option value="lowercase">Lowercase</option>
                  </select>
                </Field>
                <Field label="Letter spacing">
                  <input
                    className={input}
                    type="number"
                    step={0.5}
                    value={payload.content.headlineStyle?.letterSpacing ?? 0}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: {
                          ...p.content,
                          headlineStyle: {
                            ...p.content.headlineStyle,
                            letterSpacing: Number(e.target.value) || 0,
                          },
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Line height">
                  <input
                    className={input}
                    type="number"
                    step={0.05}
                    min={0.8}
                    max={2.4}
                    value={payload.content.headlineStyle?.lineHeight ?? 1.2}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: {
                          ...p.content,
                          headlineStyle: {
                            ...p.content.headlineStyle,
                            lineHeight: Number(e.target.value) || 1.2,
                          },
                        },
                      }))
                    }
                  />
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  className={`${input} min-h-[88px]`}
                  value={payload.content.description ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      content: { ...p.content, description: e.target.value },
                    }))
                  }
                />
              </Field>
              <GoogleFontPicker
                label="Description font"
                value={
                  payload.content.descriptionStyle?.fontFamily ||
                  payload.design.googleFont ||
                  "system"
                }
                onChange={(family) =>
                  setPayload((p) => ({
                    ...p,
                    content: {
                      ...p.content,
                      descriptionStyle: {
                        ...p.content.descriptionStyle,
                        fontFamily:
                          family === "system" ? undefined : family,
                      },
                    },
                  }))
                }
              />
              <div className="grid gap-2 sm:grid-cols-4">
                <Field label="Desc size (px)">
                  <input
                    className={input}
                    type="number"
                    min={11}
                    max={24}
                    value={payload.content.descriptionStyle?.fontSize ?? 14}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: {
                          ...p.content,
                          descriptionStyle: {
                            ...p.content.descriptionStyle,
                            fontSize: Number(e.target.value) || 14,
                          },
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Weight">
                  <select
                    className={input}
                    value={payload.content.descriptionStyle?.fontWeight ?? 400}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: {
                          ...p.content,
                          descriptionStyle: {
                            ...p.content.descriptionStyle,
                            fontWeight: Number(e.target.value) || 400,
                          },
                        },
                      }))
                    }
                  >
                    <option value={400}>Regular</option>
                    <option value={500}>Medium</option>
                    <option value={600}>Semibold</option>
                  </select>
                </Field>
                <Field label="Color">
                  <input
                    className={input}
                    type="color"
                    value={payload.content.descriptionStyle?.color ?? "#5b6b7c"}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: {
                          ...p.content,
                          descriptionStyle: {
                            ...p.content.descriptionStyle,
                            color: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="Align">
                  <select
                    className={input}
                    value={payload.content.descriptionStyle?.align ?? "left"}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: {
                          ...p.content,
                          descriptionStyle: {
                            ...p.content.descriptionStyle,
                            align: e.target.value as "left" | "center" | "right",
                          },
                        },
                      }))
                    }
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </Field>
              </div>

              <div className="rounded-xl border border-brand/20 bg-brand/5 p-3">
                <p className="text-[13px] font-semibold text-ink">
                  Form (any source)
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Paste a Form Builder link / UUID / shortcode for a native embed,
                  or any external form URL (Typeform, Google Forms, Jotform…) for
                  an iframe. You can also pick from this website’s forms.
                </p>
                <div className="mt-3 space-y-2">
                  <label className="block">
                    <span className="text-[12px] font-medium">Form link or URL</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <input
                        className={`${input} min-w-[220px] flex-1`}
                        value={formLinkDraft}
                        onChange={(e) => {
                          setFormLinkDraft(e.target.value);
                          setFormLinkHint(null);
                        }}
                        placeholder='https://…/forms/…  ·  [avonix_form id="3"]  ·  https://form.typeform.com/…'
                      />
                      <button
                        type="button"
                        className="rounded-lg bg-brand px-3 py-2 text-[12px] font-semibold text-white"
                        onClick={() => {
                          const resolved = resolveFormLink(
                            formLinkDraft,
                            formOptions,
                          );
                          if (resolved.kind === "empty") {
                            setPayload((p) => ({
                              ...p,
                              content: {
                                ...p.content,
                                formId: undefined,
                                formEmbedUrl: undefined,
                              },
                            }));
                            setFormLinkHint("Form cleared.");
                            return;
                          }
                          if (resolved.kind === "invalid") {
                            setFormLinkHint(resolved.message);
                            return;
                          }
                          if (resolved.kind === "formId") {
                            setPayload((p) => ({
                              ...p,
                              content: {
                                ...p.content,
                                formId: resolved.formId,
                                formEmbedUrl: undefined,
                              },
                            }));
                            setFormLinkDraft("");
                            setFormLinkHint(
                              `Attached Form Builder form: ${resolved.label}`,
                            );
                            return;
                          }
                          setPayload((p) => ({
                            ...p,
                            content: {
                              ...p.content,
                              formId: undefined,
                              formEmbedUrl: resolved.url,
                              replaceFormButtons: false,
                            },
                          }));
                          setFormLinkHint(
                            "External form URL attached — shown as iframe on the live site.",
                          );
                        }}
                      >
                        Apply link
                      </button>
                    </div>
                  </label>
                  {formLinkHint ? (
                    <p className="text-[11px] text-muted">{formLinkHint}</p>
                  ) : null}
                  {payload.content.formEmbedUrl &&
                  isSafeEmbedUrl(payload.content.formEmbedUrl) ? (
                    <div className="rounded-lg border border-line bg-white px-3 py-2 text-[12px]">
                      <span className="font-semibold text-ink">External embed · </span>
                      <a
                        href={payload.content.formEmbedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-brand"
                      >
                        {payload.content.formEmbedUrl}
                      </a>
                      <button
                        type="button"
                        className="ml-2 text-[12px] font-semibold text-muted"
                        onClick={() => {
                          setPayload((p) => ({
                            ...p,
                            content: {
                              ...p.content,
                              formEmbedUrl: undefined,
                            },
                          }));
                          setFormLinkDraft("");
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    className={`${input} max-w-xs`}
                    value={formQuery}
                    onChange={(e) => setFormQuery(e.target.value)}
                    placeholder="Search forms…"
                  />
                  <Link
                    href={formsBase as never}
                    className="rounded-lg border border-line bg-white px-3 py-2 text-[12px] font-semibold text-ink"
                  >
                    Open Form Builder
                  </Link>
                  <Link
                    href={`${formsBase}/new` as never}
                    className="rounded-lg border border-line bg-white px-3 py-2 text-[12px] font-semibold text-brand"
                  >
                    Create new form
                  </Link>
                </div>
                <label className="mt-3 block">
                  <span className="text-[12px] font-medium">Select existing form</span>
                  <select
                    className={`${input} mt-1`}
                    value={payload.content.formId ?? ""}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: {
                          ...p.content,
                          formId: e.target.value || undefined,
                          formEmbedUrl: e.target.value
                            ? undefined
                            : p.content.formEmbedUrl,
                        },
                      }))
                    }
                  >
                    <option value="">— No form —</option>
                    {filteredForms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                        {f.formNumber != null ? ` (#${f.formNumber})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {payload.content.formId ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href={`/clients/${clientId}/forms/${payload.content.formId}` as never}
                      className="text-[12px] font-semibold text-brand"
                    >
                      Edit original form →
                    </Link>
                    <button
                      type="button"
                      className="text-[12px] font-semibold text-muted"
                      onClick={() =>
                        setPayload((p) => ({
                          ...p,
                          content: {
                            ...p.content,
                            formId: undefined,
                            formEmbedUrl: undefined,
                          },
                        }))
                      }
                    >
                      Replace / clear
                    </button>
                  </div>
                ) : null}
                <Field label="Form style in popup" className="mt-3">
                  <select
                    className={input}
                    value={payload.content.formStyleMode ?? "inherit"}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: {
                          ...p.content,
                          formStyleMode: e.target.value as "inherit" | "override",
                        },
                      }))
                    }
                  >
                    <option value="inherit">Keep original form style</option>
                    <option value="override">Override to match popup design</option>
                  </select>
                </Field>
                {payload.content.formId ? (
                  <label className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-white px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={Boolean(payload.content.replaceFormButtons)}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          content: {
                            ...p.content,
                            replaceFormButtons: e.target.checked,
                            primaryCta: {
                              label:
                                p.content.primaryCta?.label ||
                                "Send",
                              action: e.target.checked
                                ? "submit_form"
                                : p.content.primaryCta?.action ?? "close_popup",
                              url: p.content.primaryCta?.url,
                            },
                          },
                        }))
                      }
                    />
                    <span>
                      <span className="block text-[12px] font-semibold text-ink">
                        Use popup button instead of form buttons
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted">
                        Hides Form Builder Send / Save draft on the live popup.
                        Your Primary button below submits the form.
                      </span>
                    </span>
                  </label>
                ) : null}
              </div>

              <div className="rounded-xl border border-line bg-white p-3">
                <p className="text-[13px] font-semibold text-ink">Primary button</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Custom popup CTA — label, action, and optional URL.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Button label">
                    <input
                      className={input}
                      value={payload.content.primaryCta?.label ?? ""}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          content: {
                            ...p.content,
                            primaryCta: {
                              label: e.target.value,
                              action:
                                p.content.primaryCta?.action ?? "close_popup",
                              url: p.content.primaryCta?.url,
                            },
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field label="Button action">
                    <select
                      className={input}
                      value={payload.content.primaryCta?.action ?? "close_popup"}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          content: {
                            ...p.content,
                            primaryCta: {
                              label: p.content.primaryCta?.label ?? "Continue",
                              action: e.target.value as NonNullable<
                                PopupPayload["content"]["primaryCta"]
                              >["action"],
                              url: p.content.primaryCta?.url,
                            },
                          },
                        }))
                      }
                    >
                      <option value="submit_form">Submit form</option>
                      <option value="close_popup">Close popup</option>
                      <option value="open_url">Open URL</option>
                      <option value="live_chat">Start chat</option>
                      <option value="copy_coupon">Copy coupon</option>
                      <option value="claim_offer">Claim offer</option>
                    </select>
                  </Field>
                  {(payload.content.primaryCta?.action === "open_url" ||
                    payload.content.primaryCta?.action === "custom_url") && (
                    <Field label="Button URL" className="sm:col-span-2">
                      <input
                        className={input}
                        value={payload.content.primaryCta?.url ?? ""}
                        placeholder="https://"
                        onChange={(e) =>
                          setPayload((p) => ({
                            ...p,
                            content: {
                              ...p.content,
                              primaryCta: {
                                label:
                                  p.content.primaryCta?.label ?? "Continue",
                                action:
                                  p.content.primaryCta?.action ?? "open_url",
                                url: e.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </Field>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-white p-3">
                <p className="text-[13px] font-semibold text-ink">
                  Secondary link
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Underlined dismiss / continue link under the primary button
                  (e.g. “Continue Shopping”, “No Thanks”).
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Link label">
                    <input
                      className={input}
                      value={payload.content.secondaryCta?.label ?? ""}
                      placeholder="Continue Shopping"
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          content: {
                            ...p.content,
                            secondaryCta: {
                              label: e.target.value,
                              action:
                                p.content.secondaryCta?.action ?? "close_popup",
                              url: p.content.secondaryCta?.url,
                            },
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field label="Link action">
                    <select
                      className={input}
                      value={
                        payload.content.secondaryCta?.action ?? "close_popup"
                      }
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          content: {
                            ...p.content,
                            secondaryCta: {
                              label:
                                p.content.secondaryCta?.label ?? "Dismiss",
                              action: e.target.value as NonNullable<
                                PopupPayload["content"]["secondaryCta"]
                              >["action"],
                              url: p.content.secondaryCta?.url,
                            },
                          },
                        }))
                      }
                    >
                      <option value="close_popup">Close popup</option>
                      <option value="open_url">Open URL</option>
                      <option value="claim_offer">Claim offer</option>
                    </select>
                  </Field>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Coupon code">
                  <input
                    className={input}
                    value={payload.content.couponCode ?? ""}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: { ...p.content, couponCode: e.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Logo URL">
                  <input
                    className={input}
                    value={payload.content.logoUrl ?? ""}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: { ...p.content, logoUrl: e.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="Image URL">
                  <input
                    className={input}
                    value={payload.content.imageUrl ?? ""}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: { ...p.content, imageUrl: e.target.value },
                      }))
                    }
                  />
                </Field>
                <Field label="YouTube URL">
                  <input
                    className={input}
                    value={payload.content.youtubeUrl ?? ""}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        content: { ...p.content, youtubeUrl: e.target.value },
                      }))
                    }
                  />
                </Field>
              </div>
            </div>
          )}

          {tab === "design" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-xl border border-line bg-white p-3 space-y-3">
                <p className="text-[13px] font-semibold text-ink">Content grid</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayload((p) => applyCampaignHeaderLook(p));
                      setPreviewOpen(true);
                    }}
                    className="rounded-lg bg-[#1e1b4b] px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-[#312e81]"
                  >
                    Apply campaign look + preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="rounded-lg border border-line px-3 py-2 text-[12.5px] font-semibold text-ink"
                  >
                    Open full preview
                  </button>
                </div>
                <p className="text-[11px] text-muted">
                  Existing popups keep their old stack layout until you apply
                  campaign look (or set Grid mode → Campaign header) and Save.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Grid mode">
                    <select
                      className={input}
                      value={payload.design.grid?.mode ?? "stack"}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          design: {
                            ...p.design,
                            grid: {
                              ...p.design.grid,
                              mode: e.target.value as
                                | "stack"
                                | "header_band"
                                | "media_split"
                                | "banner_split"
                                | "multi_column",
                            },
                          },
                        }))
                      }
                    >
                      <option value="stack">Stack (single column)</option>
                      <option value="header_band">Campaign header (gradient band)</option>
                      <option value="media_split">Media + content (2 columns)</option>
                      <option value="banner_split">Banner split (top / bottom colors)</option>
                      <option value="multi_column">Multi-column body</option>
                    </select>
                  </Field>
                  <Field label="Content align">
                    <select
                      className={input}
                      value={payload.design.grid?.align ?? "left"}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          design: {
                            ...p.design,
                            grid: {
                              ...p.design.grid,
                              align: e.target.value as "left" | "center" | "right",
                            },
                          },
                        }))
                      }
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </Field>
                  {(payload.design.grid?.mode ?? "stack") === "multi_column" ? (
                    <Field label="Body column count">
                      <select
                        className={input}
                        value={payload.design.grid?.columnCount ?? 2}
                        onChange={(e) =>
                          setPayload((p) => ({
                            ...p,
                            design: {
                              ...p.design,
                              grid: {
                                ...p.design.grid,
                                columnCount: Number(e.target.value) as 2 | 3,
                              },
                            },
                          }))
                        }
                      >
                        <option value={2}>2 columns</option>
                        <option value={3}>3 columns</option>
                      </select>
                    </Field>
                  ) : null}
                  {(payload.design.grid?.mode ?? "stack") === "media_split" ? (
                    <>
                      <Field label="Media side">
                        <select
                          className={input}
                          value={payload.design.grid?.mediaSide ?? "left"}
                          onChange={(e) =>
                            setPayload((p) => ({
                              ...p,
                              design: {
                                ...p.design,
                                grid: {
                                  ...p.design.grid,
                                  mediaSide: e.target.value as "left" | "right",
                                },
                              },
                            }))
                          }
                        >
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </Field>
                      <Field label="Media width %">
                        <input
                          className={input}
                          type="number"
                          min={30}
                          max={70}
                          value={payload.design.grid?.mediaWidthPercent ?? 48}
                          onChange={(e) =>
                            setPayload((p) => ({
                              ...p,
                              design: {
                                ...p.design,
                                grid: {
                                  ...p.design.grid,
                                  mediaWidthPercent: Number(e.target.value) || 48,
                                },
                              },
                            }))
                          }
                        />
                      </Field>
                    </>
                  ) : null}
                  <Field label="Block gap (px)">
                    <input
                      className={input}
                      type="number"
                      value={payload.design.grid?.gap ?? 12}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          design: {
                            ...p.design,
                            grid: {
                              ...p.design.grid,
                              gap: Number(e.target.value) || 0,
                            },
                          },
                        }))
                      }
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-[12px] font-medium">
                    <input
                      type="checkbox"
                      checked={payload.design.grid?.stackOnMobile !== false}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          design: {
                            ...p.design,
                            grid: {
                              ...p.design.grid,
                              stackOnMobile: e.target.checked,
                            },
                          },
                        }))
                      }
                    />
                    Stack columns on mobile
                  </label>
                </div>
              </div>

              <div className="sm:col-span-2 rounded-xl border border-line bg-white p-3 space-y-3">
                <p className="text-[13px] font-semibold text-ink">Theme colors</p>
                <p className="text-[11px] text-muted">
                  Header background = title strip only. Body background = form
                  area. Use the color picker or paste a hex code.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["headerBackgroundColor", "Header background"],
                      ["backgroundColor", "Body / form background"],
                      ["splitTopColor", "Header gradient start"],
                      ["splitBottomColor", "Header gradient end"],
                      ["mediaBackgroundColor", "Media panel"],
                      ["buttonBackground", "Button fill"],
                      ["buttonTextColor", "Button text"],
                      ["buttonBorderColor", "Button border"],
                      ["secondaryLinkColor", "Secondary link"],
                      ["textColor", "Default text"],
                    ] as const
                  ).map(([key, label]) => {
                    const raw = payload.design.theme?.[key] ?? "";
                    const hex = /^#[0-9a-fA-F]{6}$/.test(raw)
                      ? raw
                      : key === "headerBackgroundColor"
                        ? "#1e1b4b"
                        : key === "backgroundColor"
                          ? "#ffffff"
                          : "#cccccc";
                    return (
                      <Field key={key} label={label}>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            aria-label={label}
                            className="h-9 w-10 shrink-0 cursor-pointer rounded border border-line bg-white p-0.5"
                            value={hex}
                            onChange={(e) =>
                              setPayload((p) => ({
                                ...p,
                                design: {
                                  ...p.design,
                                  theme: {
                                    ...p.design.theme,
                                    [key]: e.target.value,
                                  },
                                },
                              }))
                            }
                          />
                          <input
                            className={input}
                            type="text"
                            placeholder="#ffffff"
                            value={raw}
                            onChange={(e) =>
                              setPayload((p) => ({
                                ...p,
                                design: {
                                  ...p.design,
                                  theme: {
                                    ...p.design.theme,
                                    [key]: e.target.value || undefined,
                                  },
                                },
                              }))
                            }
                          />
                        </div>
                      </Field>
                    );
                  })}
                  <Field label="Button radius">
                    <input
                      className={input}
                      type="number"
                      value={payload.design.theme?.buttonRadius ?? 10}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          design: {
                            ...p.design,
                            theme: {
                              ...p.design.theme,
                              buttonRadius: Number(e.target.value) || 0,
                            },
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field label="Button height (px)">
                    <input
                      className={input}
                      type="number"
                      min={28}
                      max={72}
                      value={payload.design.theme?.buttonHeight ?? 44}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          design: {
                            ...p.design,
                            theme: {
                              ...p.design.theme,
                              buttonHeight: Number(e.target.value) || 44,
                            },
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field label="Button font size (px)">
                    <input
                      className={input}
                      type="number"
                      min={11}
                      max={22}
                      value={payload.design.theme?.buttonFontSize ?? 14}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          design: {
                            ...p.design,
                            theme: {
                              ...p.design.theme,
                              buttonFontSize: Number(e.target.value) || 14,
                            },
                          },
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>

              <div className="sm:col-span-2 rounded-xl border border-line bg-white p-3 space-y-3">
                <p className="text-[13px] font-semibold text-ink">
                  Close button
                </p>
                <p className="text-[11px] text-muted">
                  Background, icon glyph, and idle / hover animations.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["closeBackground", "Background"],
                      ["closeColor", "Icon color"],
                      ["closeHoverBackground", "Hover background"],
                      ["closeHoverColor", "Hover icon"],
                    ] as const
                  ).map(([key, label]) => {
                    const raw = payload.design.theme?.[key] ?? "";
                    const hex = /^#[0-9a-fA-F]{6}$/.test(raw)
                      ? raw
                      : key.includes("Background")
                        ? "#ef4444"
                        : "#ffffff";
                    return (
                      <Field key={key} label={label}>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            aria-label={label}
                            className="h-9 w-10 shrink-0 cursor-pointer rounded border border-line bg-white p-0.5"
                            value={hex}
                            onChange={(e) =>
                              setPayload((p) => ({
                                ...p,
                                design: {
                                  ...p.design,
                                  theme: {
                                    ...p.design.theme,
                                    [key]: e.target.value,
                                  },
                                },
                              }))
                            }
                          />
                          <input
                            className={input}
                            type="text"
                            placeholder="#ef4444"
                            value={raw}
                            onChange={(e) =>
                              setPayload((p) => ({
                                ...p,
                                design: {
                                  ...p.design,
                                  theme: {
                                    ...p.design.theme,
                                    [key]: e.target.value || undefined,
                                  },
                                },
                              }))
                            }
                          />
                        </div>
                      </Field>
                    );
                  })}
                  <Field label="Size (px)">
                    <input
                      className={input}
                      type="number"
                      min={20}
                      max={56}
                      value={payload.design.theme?.closeSize ?? 30}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          design: {
                            ...p.design,
                            theme: {
                              ...p.design.theme,
                              closeSize: Number(e.target.value) || 30,
                            },
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field label="Icon">
                    <select
                      className={input}
                      value={payload.design.theme?.closeIcon ?? "x"}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          design: {
                            ...p.design,
                            theme: {
                              ...p.design.theme,
                              closeIcon: e.target.value as
                                | "x"
                                | "x_bold"
                                | "plus"
                                | "circle_x",
                            },
                          },
                        }))
                      }
                    >
                      {POPUP_CLOSE_ICONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Icon animation">
                    <select
                      className={input}
                      value={payload.design.theme?.closeAnimation ?? "none"}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          design: {
                            ...p.design,
                            theme: {
                              ...p.design.theme,
                              closeAnimation: e.target.value as
                                | "none"
                                | "spin"
                                | "pulse"
                                | "bounce"
                                | "fade",
                            },
                          },
                        }))
                      }
                    >
                      {POPUP_CLOSE_ANIMATIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Hover animation">
                    <select
                      className={input}
                      value={
                        payload.design.theme?.closeHoverAnimation ?? "scale"
                      }
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          design: {
                            ...p.design,
                            theme: {
                              ...p.design.theme,
                              closeHoverAnimation: e.target.value as
                                | "none"
                                | "spin"
                                | "scale"
                                | "rotate"
                                | "pulse",
                            },
                          },
                        }))
                      }
                    >
                      {POPUP_CLOSE_HOVER_ANIMATIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-[#eef2f7] bg-[#f8fafc] px-3 py-2.5">
                  <span className="text-[12px] text-muted">Preview</span>
                  <span
                    className={`grid place-items-center rounded-full font-semibold leading-none ${
                      payload.design.theme?.closeAnimation === "spin"
                        ? "animate-spin"
                        : payload.design.theme?.closeAnimation === "pulse"
                          ? "animate-pulse"
                          : payload.design.theme?.closeAnimation === "bounce"
                            ? "animate-bounce"
                            : ""
                    }`}
                    style={{
                      width: payload.design.theme?.closeSize ?? 30,
                      height: payload.design.theme?.closeSize ?? 30,
                      background:
                        payload.design.theme?.closeBackground ?? "#ef4444",
                      color: payload.design.theme?.closeColor ?? "#ffffff",
                      fontSize: Math.round(
                        (payload.design.theme?.closeSize ?? 30) * 0.55,
                      ),
                    }}
                  >
                    {popupCloseGlyph(payload.design.theme?.closeIcon)}
                  </span>
                </div>
              </div>

              <div className="sm:col-span-2 rounded-xl border border-line bg-[#f8fafc] p-3 space-y-3">
                <p className="text-[13px] font-semibold text-ink">Fonts</p>
                <GoogleFontPicker
                  label="Popup body font"
                  value={payload.design.googleFont || "system"}
                  onChange={(family) =>
                    setPayload((p) => ({
                      ...p,
                      design: {
                        ...p.design,
                        googleFont: family === "system" ? undefined : family,
                      },
                    }))
                  }
                />
                <GoogleFontPicker
                  label="Popup heading font"
                  value={
                    payload.design.headingFont ||
                    payload.design.googleFont ||
                    "system"
                  }
                  onChange={(family) =>
                    setPayload((p) => ({
                      ...p,
                      design: {
                        ...p.design,
                        headingFont: family === "system" ? undefined : family,
                      },
                    }))
                  }
                />
              </div>
              <Field label="Size">
                <select
                  className={input}
                  value={payload.design.size}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      design: {
                        ...p.design,
                        size: e.target.value as PopupPayload["design"]["size"],
                      },
                    }))
                  }
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                  <option value="fullscreen">Fullscreen</option>
                </select>
              </Field>
              <Field label="Max width (px)">
                <input
                  className={input}
                  type="number"
                  value={payload.design.maxWidth ?? 550}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      design: {
                        ...p.design,
                        maxWidth: Number(e.target.value) || 550,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Min height (px)">
                <input
                  className={input}
                  type="number"
                  value={payload.design.minHeight ?? ""}
                  placeholder="optional"
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      design: {
                        ...p.design,
                        minHeight: e.target.value
                          ? Number(e.target.value) || undefined
                          : undefined,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Padding">
                <input
                  className={input}
                  type="number"
                  value={payload.design.padding ?? 24}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      design: {
                        ...p.design,
                        padding: Number(e.target.value) || 0,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Radius">
                <input
                  className={input}
                  type="number"
                  value={payload.design.radius ?? 16}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      design: {
                        ...p.design,
                        radius: Number(e.target.value) || 0,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Overlay">
                <select
                  className={input}
                  value={payload.design.overlay ?? "dark"}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      design: {
                        ...p.design,
                        overlay: e.target
                          .value as NonNullable<PopupPayload["design"]["overlay"]>,
                      },
                    }))
                  }
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="blur">Blur</option>
                  <option value="glass">Glass</option>
                  <option value="gradient">Gradient</option>
                  <option value="none">None</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-[12px] font-medium sm:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(payload.design.shadow)}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      design: { ...p.design, shadow: e.target.checked },
                    }))
                  }
                />
                Shadow
              </label>
            </div>
          )}

          {tab === "animation" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Open animation">
                <select
                  className={input}
                  value={payload.design.animation ?? "fade"}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      design: {
                        ...p.design,
                        animation: e.target
                          .value as NonNullable<PopupPayload["design"]["animation"]>,
                      },
                    }))
                  }
                >
                  {["fade", "scale", "zoom", "slide", "bounce", "spring", "flip"].map(
                    (a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Close animation">
                <select
                  className={input}
                  value={payload.design.closeAnimation ?? "fade"}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      design: {
                        ...p.design,
                        closeAnimation: e.target
                          .value as NonNullable<
                          PopupPayload["design"]["closeAnimation"]
                        >,
                      },
                    }))
                  }
                >
                  {["fade", "slide", "shrink", "scale", "rotate"].map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Duration (ms)">
                <input
                  className={input}
                  type="number"
                  value={payload.design.animationDurationMs ?? 280}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      design: {
                        ...p.design,
                        animationDurationMs: Number(e.target.value) || 280,
                      },
                    }))
                  }
                />
              </Field>
            </div>
          )}

          {tab === "triggers" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["onLoad", "On page load"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-[12px]">
                  <input
                    type="checkbox"
                    checked={Boolean(payload.triggers.onLoad)}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        triggers: { ...p.triggers, onLoad: e.target.checked },
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={Boolean(payload.triggers.exitIntent?.desktop)}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      triggers: {
                        ...p.triggers,
                        exitIntent: {
                          ...p.triggers.exitIntent,
                          desktop: e.target.checked,
                        },
                      },
                    }))
                  }
                />
                Exit intent (desktop)
              </label>
              <Field label="Time delay (ms)">
                <input
                  className={input}
                  type="number"
                  value={payload.triggers.delayMs?.[0] ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      triggers: {
                        ...p.triggers,
                        delayMs: e.target.value
                          ? [Number(e.target.value)]
                          : undefined,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Scroll %">
                <input
                  className={input}
                  type="number"
                  min={1}
                  max={100}
                  value={payload.triggers.scrollPercent?.[0] ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      triggers: {
                        ...p.triggers,
                        scrollPercent: e.target.value
                          ? [Number(e.target.value)]
                          : undefined,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Inactivity (ms)">
                <input
                  className={input}
                  type="number"
                  value={payload.triggers.inactivityMs?.[0] ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      triggers: {
                        ...p.triggers,
                        inactivityMs: e.target.value
                          ? [Number(e.target.value)]
                          : undefined,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Click selector">
                <input
                  className={input}
                  value={payload.triggers.clickSelectors?.[0] ?? ""}
                  placeholder=".cta-button"
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      triggers: {
                        ...p.triggers,
                        clickSelectors: e.target.value
                          ? [e.target.value]
                          : undefined,
                      },
                    }))
                  }
                />
              </Field>
            </div>
          )}

          {(tab === "targeting" || tab === "conditions") && (
            <div className="space-y-3">
              <Field label="Show on">
                <select
                  className={input}
                  value={payload.audience.pageTarget.mode}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      audience: {
                        ...p.audience,
                        pageTarget: {
                          ...p.audience.pageTarget,
                          mode: e.target.value as
                            | "everywhere"
                            | "include"
                            | "exclude",
                        },
                      },
                    }))
                  }
                >
                  <option value="everywhere">Everywhere (minus excludes)</option>
                  <option value="include">Only matching pages / links</option>
                  <option value="exclude">Everywhere except matches</option>
                </select>
              </Field>
              <Field label="Custom page links">
                <textarea
                  className={`${input} min-h-[80px] font-mono text-[12px]`}
                  value={customLinks}
                  placeholder={"/services\n/pricing"}
                  onChange={(e) => applyCustomLinks(e.target.value)}
                />
              </Field>
              <Field label="Always exclude paths">
                <input
                  className={input}
                  value={(
                    payload.audience.pageTarget.excludePaths ??
                    DEFAULT_POPUP_EXCLUDE_PATHS
                  ).join(", ")}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      audience: {
                        ...p.audience,
                        pageTarget: {
                          ...p.audience.pageTarget,
                          excludePaths: e.target.value
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean),
                        },
                      },
                    }))
                  }
                />
              </Field>

              <div>
                <p className="text-[12px] font-semibold text-ink">
                  AND conditions · Devices
                </p>
                <div className="mt-1.5 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                  {(["desktop", "tablet", "mobile"] as const).map((d) => {
                    const on = (payload.devices ?? []).includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          setPayload((p) => {
                            const cur = new Set(p.devices ?? []);
                            if (cur.has(d)) cur.delete(d);
                            else cur.add(d);
                            return { ...p, devices: [...cur] };
                          })
                        }
                        className={`rounded-md border px-2.5 py-2 text-[12px] font-semibold capitalize sm:py-1 sm:text-[11px] ${
                          on
                            ? "border-brand bg-brand text-white"
                            : "border-line text-muted"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[12px] font-semibold text-ink">
                  AND · Visitor type
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {(
                    [
                      "new",
                      "returning",
                      "logged_in",
                      "guest",
                    ] as const
                  ).map((v) => {
                    const on = (payload.audience.visitorTypes ?? []).includes(v);
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() =>
                          setPayload((p) => {
                            const cur = new Set(p.audience.visitorTypes ?? []);
                            if (cur.has(v)) cur.delete(v);
                            else cur.add(v);
                            return {
                              ...p,
                              audience: {
                                ...p.audience,
                                visitorTypes: [...cur],
                              },
                            };
                          })
                        }
                        className={`rounded-md border px-2.5 py-2 text-[12px] font-semibold capitalize sm:py-1 sm:text-[11px] ${
                          on
                            ? "border-brand bg-brand text-white"
                            : "border-line text-muted"
                        }`}
                      >
                        {v.replace(/_/g, " ")}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="UTM source">
                  <input
                    className={input}
                    value={payload.audience.utm?.source ?? ""}
                    placeholder="google"
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        audience: {
                          ...p.audience,
                          utm: { ...p.audience.utm, source: e.target.value },
                        },
                      }))
                    }
                  />
                </Field>
                <Field label="UTM campaign">
                  <input
                    className={input}
                    value={payload.audience.utm?.campaign ?? ""}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        audience: {
                          ...p.audience,
                          utm: { ...p.audience.utm, campaign: e.target.value },
                        },
                      }))
                    }
                  />
                </Field>
              </div>

              <p className="rounded-lg bg-[#f4f6f9] px-3 py-2 text-[11px] text-muted">
                Rule preview:{" "}
                <span className="font-semibold text-ink">
                  {summarizePageTarget(payload.audience.pageTarget)}
                </span>
                {(payload.devices?.length ?? 0) > 0
                  ? ` AND device ∈ [${payload.devices?.join(", ")}]`
                  : ""}
                {(payload.audience.visitorTypes?.length ?? 0) > 0
                  ? ` AND visitor ∈ [${payload.audience.visitorTypes?.join(", ")}]`
                  : ""}
                {payload.audience.utm?.source
                  ? ` AND utm_source=${payload.audience.utm.source}`
                  : ""}
              </p>
            </div>
          )}

          {tab === "behavior" && (
            <div className="space-y-3">
              <p className="text-[12px] font-semibold">Close rules</p>
              {(
                [
                  ["showCloseButton", "Close button"],
                  ["esc", "ESC key"],
                  ["clickOutside", "Click outside"],
                  ["neverClose", "Never close"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-[12px]">
                  <input
                    type="checkbox"
                    checked={Boolean(payload.close[key])}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        close: { ...p.close, [key]: e.target.checked },
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
              <Field label="Auto close (ms)">
                <input
                  className={input}
                  type="number"
                  value={payload.close.autoCloseMs ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      close: {
                        ...p.close,
                        autoCloseMs: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      },
                    }))
                  }
                />
              </Field>
              <p className="pt-2 text-[12px] font-semibold">After form submit</p>
              <Field label="Success message">
                <input
                  className={input}
                  value={payload.behavior?.successMessage ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      behavior: {
                        ...p.behavior,
                        successMessage: e.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Redirect URL">
                <input
                  className={input}
                  value={payload.behavior?.redirectUrl ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      behavior: {
                        ...p.behavior,
                        redirectUrl: e.target.value,
                      },
                    }))
                  }
                />
              </Field>
            </div>
          )}

          {tab === "frequency" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Frequency">
                <select
                  className={input}
                  value={payload.frequency.mode}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      frequency: {
                        ...p.frequency,
                        mode: e.target
                          .value as PopupPayload["frequency"]["mode"],
                      },
                    }))
                  }
                >
                  <option value="once">Show once</option>
                  <option value="every_session">Every session</option>
                  <option value="once_daily">Once daily</option>
                  <option value="once_weekly">Once weekly</option>
                  <option value="once_monthly">Once monthly</option>
                  <option value="always">Every visit (testing)</option>
                  <option value="never_repeat">Never repeat</option>
                </select>
              </Field>
              <Field label="Max per day">
                <input
                  className={input}
                  type="number"
                  value={payload.frequency.maxPerDay ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      frequency: {
                        ...p.frequency,
                        maxPerDay: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Schedule start">
                <input
                  className={input}
                  type="datetime-local"
                  value={payload.schedule?.startAt?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      schedule: {
                        ...p.schedule,
                        startAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Schedule end">
                <input
                  className={input}
                  type="datetime-local"
                  value={payload.schedule?.endAt?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      schedule: {
                        ...p.schedule,
                        endAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined,
                      },
                    }))
                  }
                />
              </Field>
            </div>
          )}

          {tab === "components" && (
            <PopupComponentsCanvas
              components={payload.components ?? []}
              selectedId={canvasBlockId}
              onSelect={setCanvasBlockId}
              onChange={(components) =>
                setPayload((p) => ({ ...p, components }))
              }
            />
          )}

          {tab === "automation" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Webhook URL (on submit / CTA)">
                <input
                  className={input}
                  value={payload.automation?.webhookUrl ?? ""}
                  placeholder="https://hooks.zapier.com/…"
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      automation: {
                        ...p.automation,
                        webhookUrl: e.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Notify email">
                <input
                  className={input}
                  type="email"
                  value={payload.automation?.notifyEmail ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      automation: {
                        ...p.automation,
                        notifyEmail: e.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Tags (comma)">
                <input
                  className={input}
                  value={(payload.automation?.tags ?? []).join(", ")}
                  placeholder="popup-lead, warm"
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      automation: {
                        ...p.automation,
                        tags: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                />
              </Field>
              <label className="flex items-center gap-2 text-[12px] font-medium sm:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(payload.automation?.onSubmitZapier)}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      automation: {
                        ...p.automation,
                        onSubmitZapier: e.target.checked,
                      },
                    }))
                  }
                />
                Fire webhook when form submits / primary CTA clicks
              </label>
              <p className="sm:col-span-2 text-[11px] text-muted">
                On-site, Avonix dispatches <code>avonix:popup-automation</code>{" "}
                and POSTs the webhook when configured. CRM/pipeline routing uses
                the same Form Builder submission path.
              </p>
            </div>
          )}

          {tab === "analytics" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Views", "—"],
                  ["CTR", "—"],
                  ["Conversions", "—"],
                  ["Dismiss", "—"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-xl border border-line bg-[#f8fafc] px-3 py-3"
                  >
                    <p className="text-[10px] font-semibold tracking-wide text-faint uppercase">
                      {k}
                    </p>
                    <p className="mt-1 text-[18px] font-semibold">
                      {v === "—" ? (
                        <SetupBadge kind="demo" size="lg" />
                      ) : (
                        v
                      )}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-muted">
                Live counters appear as the connector reports{" "}
                <code>type: popup</code> events (view / click / convert /
                dismiss). Use Reports for site-wide funnels; A/B winners land in
                a later variant table.
              </p>
              <Field label="Analytics ID (optional)">
                <input
                  className={input}
                  value={payload.analyticsId ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      analyticsId: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
          )}

          {tab === "advanced" && (
            <div className="space-y-3">
              <Field label="Custom CSS">
                <textarea
                  className={`${input} min-h-[100px] font-mono text-[11px]`}
                  value={payload.design.customCss ?? ""}
                  placeholder=".avonix-popup-card { }"
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      design: { ...p.design, customCss: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="A/B test key">
                <input
                  className={input}
                  value={payload.abTestKey ?? ""}
                  placeholder="headline-v2"
                  onChange={(e) =>
                    setPayload((p) => ({ ...p, abTestKey: e.target.value }))
                  }
                />
              </Field>
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={Boolean(payload.conflicts.suppressIfChatOpen)}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      conflicts: {
                        ...p.conflicts,
                        suppressIfChatOpen: e.target.checked,
                      },
                    }))
                  }
                />
                Suppress if chat is open
              </label>
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={Boolean(payload.conflicts.suppressIfFormOpen)}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      conflicts: {
                        ...p.conflicts,
                        suppressIfFormOpen: e.target.checked,
                      },
                    }))
                  }
                />
                Suppress if another form is open
              </label>
              <Field label="If another popup active">
                <select
                  className={input}
                  value={payload.conflicts.ifOtherActive ?? "skip"}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      conflicts: {
                        ...p.conflicts,
                        ifOtherActive: e.target.value as
                          | "queue"
                          | "replace"
                          | "skip",
                      },
                    }))
                  }
                >
                  <option value="skip">Skip</option>
                  <option value="queue">Queue</option>
                  <option value="replace">Replace</option>
                </select>
              </Field>
              <p className="text-[11px] text-muted">
                Export/import JSON, version history, and reusable blocks are
                available via Duplicate + payload clone today.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-[#edf0f5] pt-3">
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white"
            >
              Save experience
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!selected || !confirm("Permanently delete this popup from the database? This cannot be undone.")) return;
                startTransition(async () => {
                  await actionDeletePopup({
                    id: selected.id,
                    clientId,
                    websiteId,
                  });
                  window.location.reload();
                });
              }}
              className="rounded-lg px-3 py-2 text-[13px] font-semibold text-bad hover:bg-red-50"
            >
              Delete
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                saveAsTemplate({
                  id: selected?.id,
                  name: name || selected?.name || "Popup",
                  type,
                  payload,
                })
              }
              className="rounded-lg border border-line px-3 py-2 text-[13px] font-semibold text-ink"
            >
              Save as template
            </button>
          </div>
        </section>

        <aside className="min-w-0 rounded-xl border border-line bg-[#0f172a] p-3 shadow-lg sm:p-4 xl:sticky xl:top-4 xl:self-start">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold tracking-wide text-white/50 uppercase">
              Live preview
            </p>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
            >
              Full screen
            </button>
          </div>
          <div className="flex justify-center overflow-x-auto rounded-xl bg-[rgba(15,23,42,0.35)] p-2 sm:p-3">
            <div className="w-full max-w-[min(100%,550px)] origin-top sm:scale-[0.92]">
              <PopupLivePreview
                payload={payload}
                formOptions={formOptions}
                clientId={clientId}
                websiteId={websiteId}
                onClose={() => setPreviewOpen(false)}
              />
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-snug text-white/55">
            {summarizePageTarget(payload.audience.pageTarget)} ·{" "}
            {payload.priority.replace(/_/g, " ")} · {payload.frequency.mode}
            {(payload.design.grid?.mode && payload.design.grid.mode !== "stack")
              ? ` · ${payload.design.grid.mode.replace(/_/g, " ")}`
              : " · stack"}
          </p>
          <p className="mt-2 text-[11px] text-white/40">
            This preview updates instantly. Publish + Save to show it on the
            live website.
          </p>
        </aside>
      </div>
    </div>
    {previewOpen ? (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Popup preview"
      >
        <button
          type="button"
          className="absolute inset-0 bg-[#0f172a]/70 backdrop-blur-[6px]"
          aria-label="Close preview"
          onClick={() => setPreviewOpen(false)}
        />
        <div className="relative z-10 w-full max-w-[550px]">
          <PopupLivePreview
            payload={payload}
            formOptions={formOptions}
            clientId={clientId}
            websiteId={websiteId}
            onClose={() => setPreviewOpen(false)}
          />
          <div className="mt-3 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-ink shadow"
            >
              Close preview
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setPreviewOpen(false);
                save();
              }}
              className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white shadow"
            >
              Save & close
            </button>
          </div>
        </div>
      </div>
    ) : null}
    {templateDialog ? (
      <SavePopupTemplateDialog
        open
        onClose={() => setTemplateDialog(null)}
        role={memberRole}
        clientId={clientId}
        websiteId={websiteId}
        snapshot={templateDialog}
        onSaved={(id, meta) => {
          setTemplates((prev) => [
            {
              id,
              name: meta.name,
              type: meta.type,
              description: null,
              updatedAt: new Date().toISOString(),
            },
            ...prev,
          ]);
          setSaved(true);
          setTimeout(() => setSaved(false), 1600);
        }}
      />
    ) : null}
    </>
  );
}

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
      <span className="text-[12px] font-medium text-ink">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function CreateTypePicker({
  pending,
  templates,
  onCancel,
  onPick,
  onPickTemplate,
  onDeleteTemplate,
}: {
  pending: boolean;
  templates: PopupTemplateOption[];
  onCancel: () => void;
  onPick: (t: PopupType) => void;
  onPickTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
}) {
  return (
    <div className="mb-4 rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-ink">Choose experience type</p>
        <button
          type="button"
          className="text-[12px] font-semibold text-muted"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>

      {templates.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] font-semibold tracking-wide text-faint uppercase">
            Saved templates
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex flex-col rounded-xl border border-brand/25 bg-brand/5 px-3 py-3"
              >
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onPickTemplate(t.id)}
                  className="text-left"
                >
                  <span className="block text-[13px] font-semibold text-ink">
                    {t.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] capitalize text-muted">
                    {t.type.replace(/_/g, " ")}
                    {t.scope ? ` · ${t.scope}` : ""}
                    {t.status === "draft" ? " · draft" : ""}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onDeleteTemplate(t.id)}
                  className="mt-2 self-start text-[11px] font-semibold text-bad"
                >
                  Delete template
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-[11px] font-semibold tracking-wide text-faint uppercase">
        Blank types
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {POPUP_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            disabled={pending}
            onClick={() => onPick(t.value)}
            className="rounded-xl border border-line px-3 py-3 text-left hover:border-brand/40 hover:bg-brand/5"
          >
            <span className="block text-[13px] font-semibold">{t.label}</span>
            <span className="mt-0.5 block text-[11px] text-muted">{t.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
