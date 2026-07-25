"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormIcon, iconForFieldType } from "@/components/forms/icons";
import type { FormAssetKind, FormFieldType } from "@/lib/db/schema";
import {
  actionDeleteFormAsset,
  actionDeleteFormComponent,
  actionDeleteFormSection,
  actionRegisterFormAsset,
} from "@/lib/forms/org-asset-actions";

type FieldPreview = { key: string; label: string; type: string };

export type ComponentCard = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  scope: string;
  status: string;
  fieldCount: number;
  tags: string[];
  usageCount: number;
  updatedAt: string;
  fields: FieldPreview[];
};

export type SectionCard = ComponentCard;

export type AssetCard = {
  id: string;
  name: string;
  description: string | null;
  kind: FormAssetKind;
  url: string;
  mimeType: string | null;
  folder: string | null;
  tags: string[];
  usageCount: number;
  updatedAt: string;
};

type Props = {
  components: ComponentCard[];
  sections: SectionCard[];
  assets: AssetCard[];
};

type Tab = "components" | "sections" | "assets";

const ASSET_KINDS: { id: FormAssetKind | "all"; label: string }[] = [
  { id: "all", label: "All kinds" },
  { id: "image", label: "Images" },
  { id: "document", label: "Documents" },
  { id: "video", label: "Video" },
  { id: "font", label: "Fonts" },
  { id: "icon", label: "Icons" },
  { id: "other", label: "Other" },
];

/**
 * Components / Sections / Assets panes for the org cloud library.
 */
export function OrgAssetsLibraryClient({
  components,
  sections,
  assets,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("components");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<FormAssetKind | "all">("all");
  const [preview, setPreview] = useState<ComponentCard | SectionCard | null>(
    null,
  );
  const [assetOpen, setAssetOpen] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [assetUrl, setAssetUrl] = useState("");
  const [assetFolder, setAssetFolder] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredComponents = useMemo(
    () => filterCards(components, q),
    [components, q],
  );
  const filteredSections = useMemo(
    () => filterCards(sections, q),
    [sections, q],
  );
  const filteredAssets = useMemo(() => {
    let list = [...assets];
    if (kind !== "all") list = list.filter((a) => a.kind === kind);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((a) =>
        [a.name, a.description ?? "", a.folder ?? "", a.url, ...a.tags]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }
    return list;
  }, [assets, kind, q]);

  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) {
    setMsg(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        setMsg(r.error ?? "Something went wrong.");
        return;
      }
      setMsg(okMsg);
      setAssetOpen(false);
      setAssetName("");
      setAssetUrl("");
      setAssetFolder("");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          [
            ["components", "Components", components.length],
            ["sections", "Sections", sections.length],
            ["assets", "Assets", assets.length],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold ${
              tab === id
                ? "border-brand bg-[rgba(255,102,0,.12)] text-brand"
                : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
            }`}
          >
            {label}
            <span className="ml-1.5 text-[11px] font-medium text-faint">
              {count}
            </span>
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${tab}…`}
          className="ml-auto min-w-[180px] flex-1 rounded-lg border border-[#dbe1ea] px-2.5 py-1.5 text-[13px] sm:max-w-xs"
        />
        {tab === "assets" ? (
          <>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as FormAssetKind | "all")}
              className="rounded-lg border border-[#dbe1ea] px-2.5 py-1.5 text-[12.5px]"
            >
              {ASSET_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setAssetOpen(true)}
              className="rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white"
            >
              Register URL
            </button>
          </>
        ) : null}
      </div>

      {msg ? (
        <p className="mb-3 rounded-lg border border-[#edf0f5] bg-[#f8fafc] px-3 py-2 text-[12.5px] text-muted">
          {msg}
        </p>
      ) : null}

      {tab === "components" ? (
        <CardGrid
          empty="No components yet. Save a field group from the builder (Enterprise → Save as Component)."
          items={filteredComponents}
          onPreview={setPreview}
          onDelete={(id, name) => {
            if (!window.confirm(`Delete component “${name}”?`)) return;
            run(() => actionDeleteFormComponent(id), "Component deleted.");
          }}
          pending={pending}
        />
      ) : null}

      {tab === "sections" ? (
        <CardGrid
          empty="No sections yet. Save a section block from the builder (Enterprise → Save as Section)."
          items={filteredSections}
          onPreview={setPreview}
          onDelete={(id, name) => {
            if (!window.confirm(`Delete section “${name}”?`)) return;
            run(() => actionDeleteFormSection(id), "Section deleted.");
          }}
          pending={pending}
        />
      ) : null}

      {tab === "assets" ? (
        filteredAssets.length === 0 ? (
          <Empty hint="No assets registered. Add a public URL (upload/ZIP lands in Step 6)." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredAssets.map((a) => (
              <article
                key={a.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-[#dbe1ea] bg-white shadow-[0_6px_18px_rgba(11,30,58,.05)]"
              >
                <div className="border-b border-[#edf0f5] px-4 py-3.5">
                  <div className="flex items-start gap-2">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#fff8f3] text-brand">
                      <FormIcon name="pack" size="sm" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[14px] font-semibold text-[#13233c]">
                        {a.name}
                      </h3>
                      <p className="mt-0.5 truncate text-[12px] text-muted">
                        {a.description || a.url}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Pill>{a.kind}</Pill>
                    {a.folder ? <Pill>{a.folder}</Pill> : null}
                    <Pill>used {a.usageCount}×</Pill>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5 px-4 py-3">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm(`Delete asset “${a.name}”?`)) return;
                      run(() => actionDeleteFormAsset(a.id), "Asset deleted.");
                    }}
                    className="rounded-md border border-[#fecdca] px-2 py-1 text-[11.5px] font-semibold text-bad hover:bg-[#fef2f2] disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}

      {preview ? (
        <Modal title={`Preview · ${preview.name}`} onClose={() => setPreview(null)}>
          <p className="mb-2 text-[12px] text-muted">
            {preview.fieldCount} fields · {preview.scope} · {preview.status}
          </p>
          <ul className="space-y-1.5">
            {preview.fields.map((f) => (
              <li
                key={f.key}
                className="flex items-center gap-2 rounded-lg bg-[#f8fafc] px-2.5 py-2"
              >
                <FormIcon
                  name={iconForFieldType((f.type as FormFieldType) || "text")}
                  size="xs"
                  className="shrink-0 text-muted"
                />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#13233c]">
                  {f.label}
                </span>
                <span className="shrink-0 text-[10.5px] text-faint">{f.type}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-muted">
            Insert into a form from the builder Enterprise panel → Cloud library
            pieces.
          </p>
        </Modal>
      ) : null}

      {assetOpen ? (
        <Modal title="Register asset URL" onClose={() => setAssetOpen(false)}>
          <label className="mb-2 block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Name
            </span>
            <input
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px]"
              placeholder="Brand logo"
            />
          </label>
          <label className="mb-2 block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              URL
            </span>
            <input
              value={assetUrl}
              onChange={(e) => setAssetUrl(e.target.value)}
              className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px]"
              placeholder="https://…"
            />
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Folder (optional)
            </span>
            <input
              value={assetFolder}
              onChange={(e) => setAssetFolder(e.target.value)}
              className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px]"
              placeholder="branding"
            />
          </label>
          <button
            type="button"
            disabled={pending || !assetName.trim() || !assetUrl.trim()}
            onClick={() =>
              run(
                () =>
                  actionRegisterFormAsset({
                    name: assetName,
                    url: assetUrl,
                    folder: assetFolder || undefined,
                  }),
                "Asset registered.",
              )
            }
            className="w-full rounded-lg bg-brand py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            {pending ? "Saving…" : "Register"}
          </button>
        </Modal>
      ) : null}
    </div>
  );
}

function filterCards(items: ComponentCard[], q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((t) =>
    [t.name, t.description ?? "", t.category ?? "", ...t.tags]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
}

function CardGrid({
  items,
  empty,
  onPreview,
  onDelete,
  pending,
}: {
  items: ComponentCard[];
  empty: string;
  onPreview: (item: ComponentCard) => void;
  onDelete: (id: string, name: string) => void;
  pending: boolean;
}) {
  if (items.length === 0) return <Empty hint={empty} />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((t) => (
        <article
          key={t.id}
          className="flex flex-col overflow-hidden rounded-2xl border border-[#dbe1ea] bg-white shadow-[0_6px_18px_rgba(11,30,58,.05)]"
        >
          <div className="border-b border-[#edf0f5] px-4 py-3.5">
            <h3 className="truncate text-[14px] font-semibold text-[#13233c]">
              {t.name}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">
              {t.description || "No description"}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Pill>{t.scope}</Pill>
              <Pill>{t.status}</Pill>
              <Pill>
                {t.fieldCount} fields · used {t.usageCount}×
              </Pill>
              {t.tags.slice(0, 2).map((x) => (
                <Pill key={x}>#{x}</Pill>
              ))}
            </div>
          </div>
          <div className="mt-auto flex flex-wrap gap-1.5 px-4 py-3">
            <button
              type="button"
              onClick={() => onPreview(t)}
              className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand"
            >
              Preview
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => onDelete(t.id, t.name)}
              className="rounded-md border border-[#fecdca] px-2 py-1 text-[11.5px] font-semibold text-bad hover:bg-[#fef2f2] disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function Empty({ hint }: { hint: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#dbe1ea] bg-[#f8fafc] px-6 py-10 text-center">
      <p className="text-[13px] text-muted">{hint}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#f1f4f8] px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-muted uppercase">
      {children}
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,30,58,.45)] p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[min(92vh,860px)] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[#13233c]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-[12px] font-semibold text-muted hover:text-brand"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
