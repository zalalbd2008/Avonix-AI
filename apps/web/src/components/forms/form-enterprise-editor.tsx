"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type {
  FormEnterpriseConfig,
  FormField,
  FormSettings,
  FormVersionSnapshot,
} from "@/lib/db/schema";
import {
  DEFAULT_ENTERPRISE,
  buildExportBundle,
  normalizeEnterprise,
  parseImportBundle,
  parseVersionPayload,
} from "@/lib/forms/enterprise-config";
import {
  BUILT_IN_FORM_TEMPLATES,
  deleteSavedTemplate,
  listSavedTemplates,
  type SavedFormTemplate,
} from "@/lib/forms/form-templates";
import { SaveTemplateDialog } from "@/components/forms/save-template-dialog";
import { SaveLibraryPieceDialog } from "@/components/forms/save-library-piece-dialog";
import {
  actionListFormComponents,
  actionListFormSections,
  actionLoadComponentFields,
  actionLoadSectionFields,
} from "@/lib/forms/org-asset-actions";
import Link from "next/link";

type LibraryPiece = {
  id: string;
  name: string;
  fieldCount: number;
};

type Props = {
  value: FormEnterpriseConfig;
  onChange: (next: FormEnterpriseConfig) => void;
  /** Live form snapshot for export / save-as-template / restore. */
  formSnapshot: {
    name: string;
    fields: FormField[];
    settings: FormSettings;
    submitLabel?: string;
    successMessage?: string;
    sourceFormId?: string;
  };
  clientId?: string;
  websiteId?: string;
  memberRole?: "owner" | "admin" | "member";
  onApplyTemplate: (tpl: {
    name: string;
    fields: FormField[];
    settings: FormSettings;
    submitLabel?: string;
    successMessage?: string;
  }) => void;
  /** Insert reusable component/section fields into the canvas. */
  onInsertFields?: (fields: FormField[], label: string) => void;
  onRestoreVersion: (payload: {
    fields: FormField[];
    settings: FormSettings;
  }) => void;
};

/**
 * Enterprise: templates, import/export, versioning, white-label, portal, i18n.
 */
export function FormEnterpriseEditor({
  value,
  onChange,
  formSnapshot,
  clientId,
  websiteId,
  memberRole = "member",
  onApplyTemplate,
  onInsertFields,
  onRestoreVersion,
}: Props) {
  const ent = normalizeEnterprise(value);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState<SavedFormTemplate[]>(() => listSavedTemplates());
  const [msg, setMsg] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [pieceKind, setPieceKind] = useState<"component" | "section" | null>(
    null,
  );
  const [cloudComponents, setCloudComponents] = useState<LibraryPiece[]>([]);
  const [cloudSections, setCloudSections] = useState<LibraryPiece[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const [comps, secs] = await Promise.all([
        actionListFormComponents(),
        actionListFormSections(),
      ]);
      setCloudComponents(
        comps.map((c) => ({
          id: c.id,
          name: c.name,
          fieldCount: c.fields?.length ?? 0,
        })),
      );
      setCloudSections(
        secs.map((s) => ({
          id: s.id,
          name: s.name,
          fieldCount: s.fields?.length ?? 0,
        })),
      );
    });
  }, []);

  function patch(partial: Partial<FormEnterpriseConfig>) {
    onChange(normalizeEnterprise({ ...ent, ...partial }));
  }

  function refreshSaved() {
    setSaved(listSavedTemplates());
  }

  function insertPiece(kind: "component" | "section", id: string) {
    if (!onInsertFields) {
      setMsg("Open a form builder canvas to insert library pieces.");
      return;
    }
    startTransition(async () => {
      const result =
        kind === "section"
          ? await actionLoadSectionFields(id)
          : await actionLoadComponentFields(id);
      if (!result.ok) {
        setMsg(result.error);
        return;
      }
      onInsertFields(result.fields, result.name);
      setMsg(`Inserted “${result.name}”.`);
    });
  }

  function exportJson() {
    const bundle = buildExportBundle(formSnapshot);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(formSnapshot.name || "form")}.avonix-form.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Exported form JSON.");
  }

  function onImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const result = parseImportBundle(parsed);
        if (!result.ok) {
          setMsg(result.error);
          return;
        }
        onApplyTemplate({
          name: result.bundle.name,
          fields: result.bundle.fields,
          settings: result.bundle.settings,
          submitLabel: result.bundle.submitLabel,
          successMessage: result.bundle.successMessage,
        });
        setMsg(`Imported “${result.bundle.name}”. Review and save.`);
      } catch {
        setMsg("Could not read that file.");
      }
    };
    reader.readAsText(file);
  }

  function restore(v: FormVersionSnapshot) {
    const parsed = parseVersionPayload(v.payload);
    if (!parsed) {
      setMsg("That version could not be restored.");
      return;
    }
    if (!window.confirm(`Restore version from ${new Date(v.at).toLocaleString()}?`)) {
      return;
    }
    onRestoreVersion(parsed);
    setMsg("Version restored into the builder — save to keep it.");
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        Enterprise
      </p>
      <p className="text-[12px] leading-relaxed text-muted">
        Templates, import/export, version history, white-label, client portal,
        and unique lead scores. Prefer the orange{" "}
        <span className="font-semibold text-brand">Save as Template…</span>{" "}
        button under the canvas, or Form → Cloud template library.
      </p>

      <div className="rounded-lg border border-brand/20 bg-white p-2.5">
        <p className="mb-2 text-[11.5px] font-semibold text-muted">
          Template library
        </p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {BUILT_IN_FORM_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                onApplyTemplate({
                  name: tpl.name,
                  fields: tpl.fields,
                  settings: tpl.settings,
                  submitLabel: tpl.submitLabel,
                  successMessage: tpl.successMessage,
                });
                setMsg(`Applied “${tpl.name}”.`);
              }}
              className="rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
            >
              {tpl.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSaveOpen(true)}
            className="rounded-lg border border-brand/30 bg-[#fff8f3] px-2.5 py-1.5 text-[12px] font-semibold text-brand hover:border-brand"
          >
            Save as Template…
          </button>
          <button
            type="button"
            onClick={() => setPieceKind("component")}
            className="rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            Save as Component…
          </button>
          <button
            type="button"
            onClick={() => setPieceKind("section")}
            className="rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            Save as Section…
          </button>
          <Link
            href="/templates"
            className="rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            Open cloud library
          </Link>
        </div>
      </div>

      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={ent.enabled !== false}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        Enable enterprise features
      </label>

      {ent.enabled !== false ? (
        <>
          {(
            [
              ["uniqueScores", "Unique scores (health / complexity / sales / readiness)", true],
              ["conversationSummary", "Conversation summary on submit", true],
              ["clientPortal", "Client portal link after submit", true],
              ["versioning", "Version history on save", true],
              ["auditLog", "Audit log on save", true],
            ] as const
          ).map(([key, label, defaultOn]) => (
            <label
              key={key}
              className="flex items-center gap-2 text-[12.5px] text-muted"
            >
              <input
                type="checkbox"
                checked={defaultOn ? ent[key] !== false : Boolean(ent[key])}
                onChange={(e) => patch({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}

          <div className="border-t border-[#edf0f5] pt-3">
            <p className="mb-2 text-[11.5px] font-semibold text-muted">White-label</p>
            <label className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
              <input
                type="checkbox"
                checked={Boolean(ent.whiteLabel?.enabled)}
                onChange={(e) =>
                  patch({
                    whiteLabel: { ...ent.whiteLabel, enabled: e.target.checked },
                  })
                }
              />
              Show agency brand on embed
            </label>
            <input
              value={ent.whiteLabel?.brandName ?? ""}
              onChange={(e) =>
                patch({
                  whiteLabel: { ...ent.whiteLabel, brandName: e.target.value },
                })
              }
              placeholder="Brand name"
              className="mb-2 w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
            <input
              value={ent.whiteLabel?.logoUrl ?? ""}
              onChange={(e) =>
                patch({
                  whiteLabel: { ...ent.whiteLabel, logoUrl: e.target.value },
                })
              }
              placeholder="Logo URL"
              className="mb-2 w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
            <label className="flex items-center gap-2 text-[12.5px] text-muted">
              <input
                type="checkbox"
                checked={Boolean(ent.whiteLabel?.hideAvonix)}
                onChange={(e) =>
                  patch({
                    whiteLabel: { ...ent.whiteLabel, hideAvonix: e.target.checked },
                  })
                }
              />
              Hide Avonix credit
            </label>
          </div>

          <div className="border-t border-[#edf0f5] pt-3">
            <p className="mb-2 text-[11.5px] font-semibold text-muted">Localization</p>
            <label className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
              <input
                type="checkbox"
                checked={Boolean(ent.i18n?.enabled)}
                onChange={(e) =>
                  patch({ i18n: { ...ent.i18n, enabled: e.target.checked } })
                }
              />
              Multi-language flag (locales for future strings)
            </label>
            <input
              value={(ent.i18n?.locales ?? []).join(", ")}
              onChange={(e) =>
                patch({
                  i18n: {
                    ...ent.i18n,
                    locales: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  },
                })
              }
              placeholder="en, bn, es"
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>

          <div className="border-t border-[#edf0f5] pt-3">
            <p className="mb-2 text-[11.5px] font-semibold text-muted">Roles</p>
            <label className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
              <input
                type="checkbox"
                checked={Boolean(ent.roles?.requireAdminToPublish)}
                onChange={(e) =>
                  patch({
                    roles: {
                      ...ent.roles,
                      requireAdminToPublish: e.target.checked,
                    },
                  })
                }
              />
              Require admin to publish (soft gate)
            </label>
            <input
              value={(ent.roles?.editorEmails ?? []).join(", ")}
              onChange={(e) =>
                patch({
                  roles: {
                    ...ent.roles,
                    editorEmails: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  },
                })
              }
              placeholder="editor@agency.com, …"
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>

          <div className="border-t border-[#edf0f5] pt-3">
            <p className="mb-2 text-[11.5px] font-semibold text-muted">
              More library tools
            </p>
            {saved.length ? (
              <ul className="mb-2 space-y-1">
                {saved.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 text-[12px] text-muted"
                  >
                    <button
                      type="button"
                      className="font-semibold text-brand hover:underline"
                      onClick={() => {
                        onApplyTemplate(t);
                        setMsg(`Loaded “${t.name}”.`);
                      }}
                    >
                      {t.name}
                    </button>
                    <button
                      type="button"
                      className="text-faint hover:text-red-600"
                      onClick={() => {
                        deleteSavedTemplate(t.id);
                        refreshSaved();
                      }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-2 text-[12px] text-faint">No local browser templates.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportJson}
                className="rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:border-brand"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:border-brand"
              >
                Import JSON
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportFile(f);
                  e.target.value = "";
                }}
              />
            </div>
            {(cloudComponents.length > 0 || cloudSections.length > 0) &&
            onInsertFields ? (
              <div className="mt-3 rounded-lg border border-[#edf0f5] bg-[#f8fafc] p-2.5">
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-faint uppercase">
                  Insert from cloud
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cloudComponents.slice(0, 8).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={pending}
                      onClick={() => insertPiece("component", c.id)}
                      className="rounded-md border border-[#dbe1ea] bg-white px-2 py-1 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-40"
                      title={`${c.fieldCount} fields`}
                    >
                      {c.name}
                    </button>
                  ))}
                  {cloudSections.slice(0, 8).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={pending}
                      onClick={() => insertPiece("section", s.id)}
                      className="rounded-md border border-[#dbe1ea] bg-white px-2 py-1 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-40"
                      title={`Section · ${s.fieldCount} fields`}
                    >
                      ▤ {s.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {(ent.versions?.length ?? 0) > 0 ? (
            <div className="border-t border-[#edf0f5] pt-3">
              <p className="mb-2 text-[11.5px] font-semibold text-muted">
                Version history
              </p>
              <ul className="max-h-40 space-y-1 overflow-auto">
                {(ent.versions ?? []).map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-2 text-[12px] text-muted"
                  >
                    <span>
                      {new Date(v.at).toLocaleString()} · {v.fieldCount} fields
                      {v.label ? ` · ${v.label}` : ""}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 font-semibold text-brand hover:underline"
                      onClick={() => restore(v)}
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(ent.audit?.length ?? 0) > 0 ? (
            <div className="border-t border-[#edf0f5] pt-3">
              <p className="mb-2 text-[11.5px] font-semibold text-muted">Audit log</p>
              <ul className="max-h-32 space-y-1 overflow-auto text-[11.5px] text-faint">
                {(ent.audit ?? []).slice(0, 12).map((a, i) => (
                  <li key={`${a.at}-${i}`}>
                    {new Date(a.at).toLocaleString()} — {a.action}
                    {a.actor ? ` · ${a.actor}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {msg ? <p className="text-[12px] text-brand">{msg}</p> : null}

      <button
        type="button"
        onClick={() => onChange(normalizeEnterprise(DEFAULT_ENTERPRISE))}
        className="self-start text-[11.5px] font-semibold text-muted hover:text-brand"
      >
        Reset enterprise defaults
      </button>

      <SaveTemplateDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        role={memberRole}
        clientId={clientId}
        websiteId={websiteId}
        snapshot={{
          name: formSnapshot.name,
          fields: formSnapshot.fields,
          settings: formSnapshot.settings,
          submitLabel: formSnapshot.submitLabel,
          successMessage: formSnapshot.successMessage,
          sourceFormId: formSnapshot.sourceFormId,
          clientId,
          websiteId,
        }}
        onSaved={() => {
          setMsg("Saved to organization cloud library.");
        }}
      />

      {pieceKind ? (
        <SaveLibraryPieceDialog
          open
          kind={pieceKind}
          onClose={() => setPieceKind(null)}
          fields={formSnapshot.fields}
          defaultName={formSnapshot.name}
          clientId={clientId}
          websiteId={websiteId}
          onSaved={() => {
            setMsg(
              pieceKind === "section"
                ? "Section saved to organization library."
                : "Component saved to organization library.",
            );
            startTransition(async () => {
              const [comps, secs] = await Promise.all([
                actionListFormComponents(),
                actionListFormSections(),
              ]);
              setCloudComponents(
                comps.map((c) => ({
                  id: c.id,
                  name: c.name,
                  fieldCount: c.fields?.length ?? 0,
                })),
              );
              setCloudSections(
                secs.map((s) => ({
                  id: s.id,
                  name: s.name,
                  fieldCount: s.fields?.length ?? 0,
                })),
              );
            });
          }}
        />
      ) : null}
    </div>
  );
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "form"
  );
}
