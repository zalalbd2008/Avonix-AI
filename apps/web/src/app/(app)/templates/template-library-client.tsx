"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormIcon, iconForFieldType } from "@/components/forms/icons";
import type { FormFieldType } from "@/lib/db/schema";
import {
  actionAddToCollection,
  actionArchiveCloudTemplate,
  actionCreateTemplateCollection,
  actionDeleteCloudTemplate,
  actionDeleteTemplateCollection,
  actionDuplicateCloudTemplate,
  actionListCollectionTemplateIds,
  actionListTemplateShares,
  actionRemoveFromCollection,
  actionRemoveTemplateShare,
  actionReviewTemplateApproval,
  actionSetTemplateLocked,
  actionShareTemplate,
  actionSubmitTemplateForApproval,
  actionToggleTemplateFavorite,
  actionUseCloudTemplate,
} from "@/lib/forms/template-actions";
import { actionPublishTemplateToMarketplace } from "@/lib/forms/marketplace-actions";
import { TemplateVersionHistory } from "@/components/forms/template-version-history";
import { formatTemplateVersion } from "@/lib/forms/template-version";
import {
  PREVIEW_BREAKPOINTS,
  TEMPLATE_SHARE_PERMISSIONS,
  type PreviewBreakpoint,
  type TemplateLibrarySort,
  type TemplateQuickFilter,
} from "@/lib/forms/template-library";
import type {
  FormTemplateSharePermission,
  FormTemplateShareTarget,
} from "@/lib/db/schema";

type FieldPreview = { key: string; label: string; type: string };

type Tpl = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  scope: string;
  status: string;
  visibility: string;
  version: number;
  usageCount: number;
  fieldCount: number;
  tags: string[];
  updatedAt: string;
  createdAt: string;
  isLocked: boolean;
  createdBy: string | null;
  reviewNote: string | null;
  fields: FieldPreview[];
};

type Collection = {
  id: string;
  name: string;
  description: string | null;
  visibility: "personal" | "organization";
  createdBy: string | null;
  itemCount: number;
};

type Member = {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
};

type ShareRow = {
  id: string;
  targetType: FormTemplateShareTarget;
  targetUserId: string | null;
  targetRole: "owner" | "admin" | "member" | null;
  teamId: string | null;
  permissions: FormTemplateSharePermission[];
  targetLabel: string;
  createdAt: string;
};

type Props = {
  templates: Tpl[];
  favoriteIds: string[];
  collections: Collection[];
  categories: { id: string; label: string }[];
  scopes: { id: string; label: string }[];
  statuses: { id: string; label: string }[];
  sorts: { id: TemplateLibrarySort; label: string }[];
  quickFilters: { id: TemplateQuickFilter; label: string }[];
  clients: { id: string; name: string }[];
  websites: { id: string; name: string; clientId: string }[];
  members: Member[];
  currentUserId: string;
  currentRole: "owner" | "admin" | "member";
  initialQuery: string;
};

/**
 * Org template library — search, filters, favorites, collections, share & approval.
 */
export function TemplateLibraryClient({
  templates,
  favoriteIds: initialFavorites,
  collections,
  categories,
  scopes,
  statuses,
  sorts,
  quickFilters,
  clients,
  websites,
  members,
  currentUserId,
  currentRole,
  initialQuery,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState("all");
  const [scope, setScope] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<TemplateLibrarySort>("updated");
  const [quick, setQuick] = useState<TemplateQuickFilter>("all");
  const [tag, setTag] = useState("");
  const [favorites, setFavorites] = useState(() => new Set(initialFavorites));
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [collectionIds, setCollectionIds] = useState<string[] | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewBp, setPreviewBp] = useState<PreviewBreakpoint>("desktop");
  const [useId, setUseId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [shareTarget, setShareTarget] =
    useState<FormTemplateShareTarget>("user");
  const [shareUserId, setShareUserId] = useState(members[0]?.userId ?? "");
  const [shareRole, setShareRole] = useState<"owner" | "admin" | "member">(
    "member",
  );
  const [sharePerms, setSharePerms] = useState<FormTemplateSharePermission[]>([
    "view",
    "duplicate",
  ]);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [addToId, setAddToId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [websiteId, setWebsiteId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isAdmin = currentRole === "owner" || currentRole === "admin";

  useEffect(() => {
    setFavorites(new Set(initialFavorites));
  }, [initialFavorites]);

  useEffect(() => {
    if (!collectionId) {
      setCollectionIds(null);
      return;
    }
    startTransition(async () => {
      const ids = await actionListCollectionTemplateIds(collectionId);
      setCollectionIds(ids);
    });
  }, [collectionId]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) for (const x of t.tags) set.add(x);
    return [...set].sort();
  }, [templates]);

  const filtered = useMemo(() => {
    let list = [...templates];

    if (collectionIds) {
      const allow = new Set(collectionIds);
      list = list.filter((t) => allow.has(t.id));
    }

    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((t) => {
        const hay = [t.name, t.description ?? "", t.category ?? "", ...t.tags]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
    }

    if (category !== "all") list = list.filter((t) => t.category === category);
    if (scope !== "all") list = list.filter((t) => t.scope === scope);
    if (status !== "all") list = list.filter((t) => t.status === status);
    if (tag) list = list.filter((t) => t.tags.includes(tag));

    if (quick === "favorites") {
      list = list.filter((t) => favorites.has(t.id));
    } else if (quick === "mine") {
      list = list.filter((t) => t.createdBy === currentUserId);
    } else if (quick === "shared") {
      list = list.filter(
        (t) =>
          t.createdBy !== currentUserId &&
          (t.scope === "organization" ||
            t.scope === "global" ||
            t.scope === "team"),
      );
    }

    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "used") return b.usageCount - a.usageCount;
      if (sort === "created") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return list;
  }, [
    templates,
    collectionIds,
    q,
    category,
    scope,
    status,
    tag,
    quick,
    favorites,
    currentUserId,
    sort,
  ]);

  const preview = templates.find((t) => t.id === previewId) ?? null;
  const historyTpl = templates.find((t) => t.id === historyId) ?? null;
  const shareTpl = templates.find((t) => t.id === shareId) ?? null;
  const reviewTpl = templates.find((t) => t.id === reviewId) ?? null;
  const siteOptions = websites.filter((w) => w.clientId === clientId);
  const frameMax =
    PREVIEW_BREAKPOINTS.find((b) => b.id === previewBp)?.frameMax ?? "100%";

  useEffect(() => {
    if (!shareId) {
      setShares([]);
      return;
    }
    startTransition(async () => {
      const rows = await actionListTemplateShares(shareId);
      setShares(rows);
    });
  }, [shareId]);

  function run(
    fn: () => Promise<{ ok: boolean; error?: string; formId?: string }>,
    okMsg: string,
  ) {
    setMsg(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setMsg(result.error ?? "Something went wrong.");
        return;
      }
      setMsg(okMsg);
      setUseId(null);
      setAddToId(null);
      setReviewId(null);
      if (shareId) {
        const rows = await actionListTemplateShares(shareId);
        setShares(rows);
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Collections sidebar */}
      <aside className="rounded-xl border border-[#edf0f5] bg-white p-3">
        <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
          Collections
        </p>
        <button
          type="button"
          onClick={() => setCollectionId(null)}
          className={`mb-1 w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-semibold ${
            !collectionId
              ? "bg-[#fff8f3] text-brand"
              : "text-muted hover:bg-[#f8fafc]"
          }`}
        >
          All templates
        </button>
        <ul className="mb-3 space-y-0.5">
          {collections.map((c) => (
            <li key={c.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCollectionId(c.id)}
                className={`min-w-0 flex-1 truncate rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-semibold ${
                  collectionId === c.id
                    ? "bg-[#fff8f3] text-brand"
                    : "text-muted hover:bg-[#f8fafc]"
                }`}
              >
                {c.name}
                <span className="ml-1 text-[11px] font-medium text-faint">
                  {c.itemCount}
                </span>
              </button>
              <button
                type="button"
                title="Delete collection"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(`Delete collection “${c.name}”?`)) return;
                  run(
                    () => actionDeleteTemplateCollection(c.id),
                    "Collection deleted.",
                  );
                  if (collectionId === c.id) setCollectionId(null);
                }}
                className="hidden rounded px-1 text-[11px] text-faint group-hover:inline hover:text-bad"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-1">
          <input
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="New collection"
            className="min-w-0 flex-1 rounded-md border border-[#dbe1ea] px-2 py-1.5 text-[12px] outline-none focus:border-brand"
          />
          <button
            type="button"
            disabled={pending || !newCollectionName.trim()}
            onClick={() => {
              const name = newCollectionName.trim();
              run(
                () => actionCreateTemplateCollection({ name }),
                `Created “${name}”.`,
              );
              setNewCollectionName("");
            }}
            className="rounded-md bg-brand px-2 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Search + filters */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, tag, category…"
            className="min-w-[14rem] flex-1 rounded-lg border border-[#dbe1ea] bg-white px-3 py-2 text-[13px] outline-none focus:border-brand"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[12.5px]"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[12.5px]"
          >
            {scopes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[12.5px]"
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[12.5px]"
          >
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as TemplateLibrarySort)}
            className="rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[12.5px]"
          >
            {sorts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {quickFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setQuick(f.id)}
              className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                quick === f.id
                  ? "bg-brand text-white"
                  : "bg-[#f1f4f8] text-muted hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto self-center text-[12px] text-faint">
            {filtered.length} template{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        {msg ? (
          <p className="mb-3 rounded-lg border border-brand/25 bg-[#fff8f3] px-3 py-2 text-[12.5px] text-brand">
            {msg}
          </p>
        ) : null}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dbe1ea] bg-white px-6 py-16 text-center">
            <FormIcon name="pack" size="lg" className="mx-auto text-faint" />
            <p className="mt-3 text-[14px] font-semibold text-[#13233c]">
              No templates match
            </p>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-muted">
              Clear filters or save a form from the builder with Save as
              Template.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => {
              const catLabel =
                categories.find((c) => c.id === t.category)?.label ?? t.category;
              const starred = favorites.has(t.id);
              return (
                <article
                  key={t.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#dbe1ea] bg-white shadow-[0_6px_18px_rgba(11,30,58,.05)]"
                >
                  <div className="border-b border-[#edf0f5] px-4 py-3.5">
                    <div className="flex items-start gap-2">
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#fff8f3] text-brand">
                        <FormIcon name="pack" size="sm" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[14px] font-semibold text-[#13233c]">
                          {t.name}
                        </h3>
                        <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">
                          {t.description || "No description"}
                        </p>
                      </div>
                      <button
                        type="button"
                        title={starred ? "Unfavorite" : "Favorite"}
                        disabled={pending}
                        onClick={() => {
                          setFavorites((prev) => {
                            const next = new Set(prev);
                            if (next.has(t.id)) next.delete(t.id);
                            else next.add(t.id);
                            return next;
                          });
                          startTransition(async () => {
                            const r = await actionToggleTemplateFavorite(t.id);
                            if (!r.ok) {
                              setMsg(r.error);
                              router.refresh();
                            }
                          });
                        }}
                        className={`shrink-0 rounded-md p-1 ${
                          starred ? "text-brand" : "text-faint hover:text-brand"
                        }`}
                      >
                        <FormIcon name={starred ? "pin" : "rating"} size="sm" />
                      </button>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <Badge>{t.scope}</Badge>
                      <Badge>{t.status}</Badge>
                      {t.isLocked ? <Badge>Locked</Badge> : null}
                      {catLabel ? <Badge>{catLabel}</Badge> : null}
                      <Badge>
                        {formatTemplateVersion(t.version)} · {t.fieldCount}{" "}
                        fields
                      </Badge>
                      {t.tags.slice(0, 3).map((x) => (
                        <Badge key={x}>#{x}</Badge>
                      ))}
                    </div>
                    {t.status === "rejected" && t.reviewNote ? (
                      <p className="mt-2 text-[11.5px] text-bad">
                        Rejected: {t.reviewNote}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-1.5 px-4 py-3">
                    <ActionBtn onClick={() => setPreviewId(t.id)}>
                      Preview
                    </ActionBtn>
                    <ActionBtn onClick={() => setHistoryId(t.id)}>
                      History
                    </ActionBtn>
                    <ActionBtn onClick={() => setAddToId(t.id)}>
                      Collect
                    </ActionBtn>
                    {isAdmin ? (
                      <ActionBtn onClick={() => setShareId(t.id)}>
                        Share
                      </ActionBtn>
                    ) : null}
                    {isAdmin ? (
                      <ActionBtn
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              actionSetTemplateLocked({
                                templateId: t.id,
                                locked: !t.isLocked,
                              }),
                            t.isLocked ? "Unlocked." : "Locked.",
                          )
                        }
                      >
                        {t.isLocked ? "Unlock" : "Lock"}
                      </ActionBtn>
                    ) : null}
                    {(t.status === "draft" || t.status === "rejected") &&
                    (t.createdBy === currentUserId || isAdmin) ? (
                      <ActionBtn
                        disabled={pending || t.isLocked}
                        onClick={() =>
                          run(
                            () => actionSubmitTemplateForApproval(t.id),
                            "Submitted for approval.",
                          )
                        }
                      >
                        Submit
                      </ActionBtn>
                    ) : null}
                    {t.status === "pending_approval" && isAdmin ? (
                      <ActionBtn primary onClick={() => setReviewId(t.id)}>
                        Review
                      </ActionBtn>
                    ) : null}
                    {isAdmin ? (
                      <ActionBtn
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              actionPublishTemplateToMarketplace({
                                templateId: t.id,
                                publish: true,
                              }),
                            "Published to marketplace.",
                          )
                        }
                      >
                        Publish
                      </ActionBtn>
                    ) : null}
                    <ActionBtn primary onClick={() => setUseId(t.id)}>
                      Use
                    </ActionBtn>
                    <ActionBtn
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => actionDuplicateCloudTemplate(t.id),
                          "Duplicated as a personal draft.",
                        )
                      }
                    >
                      Duplicate
                    </ActionBtn>
                    <a
                      href={`/api/templates/export?ids=${encodeURIComponent(t.id)}`}
                      className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand"
                    >
                      Export
                    </a>
                    <ActionBtn
                      disabled={pending || t.isLocked}
                      onClick={() =>
                        run(
                          () => actionArchiveCloudTemplate(t.id),
                          "Archived.",
                        )
                      }
                    >
                      Archive
                    </ActionBtn>
                    <ActionBtn
                      danger
                      disabled={pending || (t.isLocked && !isAdmin)}
                      onClick={() => {
                        if (!window.confirm(`Delete “${t.name}”?`)) return;
                        run(
                          () => actionDeleteCloudTemplate(t.id),
                          "Deleted.",
                        );
                      }}
                    >
                      Delete
                    </ActionBtn>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Responsive preview */}
      {preview ? (
        <Modal
          title={`Preview · ${preview.name}`}
          wide
          onClose={() => setPreviewId(null)}
        >
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PREVIEW_BREAKPOINTS.map((bp) => (
              <button
                key={bp.id}
                type="button"
                onClick={() => setPreviewBp(bp.id)}
                className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold ${
                  previewBp === bp.id
                    ? "border-brand bg-[rgba(255,102,0,.12)] text-brand"
                    : "border-[#dbe1ea] text-muted"
                }`}
              >
                {bp.label}
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-[#f4f6f9] p-3">
            <div
              className="mx-auto rounded-xl border border-[#dbe1ea] bg-white p-3 shadow-sm transition-[max-width]"
              style={{ maxWidth: frameMax, width: "100%" }}
            >
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-faint uppercase">
                {preview.fieldCount} fields ·{" "}
                {formatTemplateVersion(preview.version)}
              </p>
              <ul className="space-y-1.5">
                {preview.fields.map((f) => (
                  <li
                    key={f.key}
                    className="flex items-center gap-2 rounded-lg bg-[#f8fafc] px-2.5 py-2"
                  >
                    <FormIcon
                      name={iconForFieldType(
                        (f.type as FormFieldType) || "text",
                      )}
                      size="xs"
                      className="shrink-0 text-muted"
                    />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#13233c]">
                      {f.label}
                    </span>
                    <span className="shrink-0 text-[10.5px] text-faint">
                      {f.type}
                    </span>
                  </li>
                ))}
                {preview.fieldCount > preview.fields.length ? (
                  <li className="px-1 text-[11.5px] text-faint">
                    +{preview.fieldCount - preview.fields.length} more
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPreviewId(null);
              setUseId(preview.id);
            }}
            className="mt-3 w-full rounded-lg bg-brand py-2 text-[13px] font-semibold text-white"
          >
            Use this template
          </button>
        </Modal>
      ) : null}

      {useId ? (
        <Modal title="Use template" onClose={() => setUseId(null)}>
          <p className="mb-3 text-[13px] text-muted">
            Create a new form on a client / website from this template.
          </p>
          <label className="mb-2 block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Client
            </span>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setWebsiteId("");
              }}
              className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px]"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Website (optional)
            </span>
            <select
              value={websiteId}
              onChange={(e) => setWebsiteId(e.target.value)}
              className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px]"
            >
              <option value="">Client-level form</option>
              {siteOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending || !clientId}
            onClick={() =>
              run(async () => {
                const r = await actionUseCloudTemplate({
                  templateId: useId,
                  clientId,
                  websiteId: websiteId || undefined,
                });
                if (r.ok && "formId" in r && r.formId && websiteId) {
                  router.push(
                    `/clients/${clientId}/websites/${websiteId}/forms/${r.formId}/edit`,
                  );
                }
                return r;
              }, "Form created from template.")
            }
            className="w-full rounded-lg bg-brand py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            {pending ? "Creating…" : "Create form"}
          </button>
        </Modal>
      ) : null}

      {addToId ? (
        <Modal title="Add to collection" onClose={() => setAddToId(null)}>
          {collections.length === 0 ? (
            <p className="text-[13px] text-muted">
              Create a collection in the left sidebar first.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {collections.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () =>
                          actionAddToCollection({
                            collectionId: c.id,
                            templateId: addToId,
                          }),
                        `Added to “${c.name}”.`,
                      )
                    }
                    className="w-full rounded-lg border border-[#dbe1ea] px-3 py-2 text-left text-[13px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-40"
                  >
                    {c.name}
                    <span className="ml-2 text-[11px] font-medium text-faint">
                      {c.visibility} · {c.itemCount}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {collectionId && addToId ? (
            <button
              type="button"
              className="mt-3 text-[12px] font-semibold text-bad hover:underline"
              onClick={() =>
                run(
                  () =>
                    actionRemoveFromCollection({
                      collectionId,
                      templateId: addToId,
                    }),
                  "Removed from collection.",
                )
              }
            >
              Remove from current collection
            </button>
          ) : null}
        </Modal>
      ) : null}

      {historyTpl ? (
        <TemplateVersionHistory
          open
          templateId={historyTpl.id}
          templateName={historyTpl.name}
          onClose={() => setHistoryId(null)}
          onChanged={(m) => {
            setMsg(m);
            setHistoryId(null);
            router.refresh();
          }}
        />
      ) : null}

      {shareTpl ? (
        <Modal
          title={`Share · ${shareTpl.name}`}
          onClose={() => setShareId(null)}
        >
          <p className="mb-3 text-[13px] text-muted">
            Grant access inside this organization to a user, role, or team.
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(["user", "role", "team"] as FormTemplateShareTarget[]).map(
              (t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setShareTarget(t)}
                  className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold capitalize ${
                    shareTarget === t
                      ? "border-brand bg-[rgba(255,102,0,.12)] text-brand"
                      : "border-[#dbe1ea] text-muted"
                  }`}
                >
                  {t}
                </button>
              ),
            )}
          </div>
          {shareTarget === "user" ? (
            <label className="mb-2 block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Teammate
              </span>
              <select
                value={shareUserId}
                onChange={(e) => setShareUserId(e.target.value)}
                className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px]"
              >
                {members
                  .filter((m) => m.userId !== currentUserId)
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} ({m.role})
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          {shareTarget === "role" ? (
            <label className="mb-2 block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Role
              </span>
              <select
                value={shareRole}
                onChange={(e) =>
                  setShareRole(e.target.value as "owner" | "admin" | "member")
                }
                className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px]"
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
                <option value="owner">owner</option>
              </select>
            </label>
          ) : null}
          {shareTarget === "team" ? (
            <p className="mb-2 text-[12.5px] text-muted">
              Shares with the default org team label until dedicated teams ship.
            </p>
          ) : null}
          <div className="mb-3">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Permissions
            </span>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_SHARE_PERMISSIONS.map((p) => {
                const on = sharePerms.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="inline-flex items-center gap-1.5 text-[12.5px] text-muted"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        setSharePerms((prev) =>
                          on
                            ? prev.filter((x) => x !== p.id)
                            : [...prev, p.id],
                        );
                      }}
                    />
                    {p.label}
                  </label>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            disabled={pending || (shareTarget === "user" && !shareUserId)}
            onClick={() =>
              run(
                () =>
                  actionShareTemplate({
                    templateId: shareTpl.id,
                    targetType: shareTarget,
                    targetUserId:
                      shareTarget === "user" ? shareUserId : undefined,
                    targetRole: shareTarget === "role" ? shareRole : undefined,
                    teamId: shareTarget === "team" ? "default" : undefined,
                    permissions: sharePerms,
                  }),
                "Shared.",
              )
            }
            className="mb-4 w-full rounded-lg bg-brand py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            {pending ? "Sharing…" : "Add share"}
          </button>
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-faint uppercase">
            Current shares
          </p>
          {shares.length === 0 ? (
            <p className="text-[12.5px] text-muted">No shares yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {shares.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-[#edf0f5] px-2.5 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-[#13233c]">
                      {s.targetLabel}
                    </p>
                    <p className="text-[11px] text-faint">
                      {s.permissions.join(", ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => actionRemoveTemplateShare(s.id),
                        "Share removed.",
                      )
                    }
                    className="text-[11.5px] font-semibold text-bad hover:underline disabled:opacity-40"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      ) : null}

      {reviewTpl ? (
        <Modal
          title={`Review · ${reviewTpl.name}`}
          onClose={() => {
            setReviewId(null);
            setReviewNote("");
          }}
        >
          <p className="mb-3 text-[13px] text-muted">
            Approve to publish into the org library, or reject with a note so
            the author can revise.
          </p>
          <label className="mb-3 block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Note (optional)
            </span>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px]"
              placeholder="Looks good / please fix the phone field…"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    actionReviewTemplateApproval({
                      templateId: reviewTpl.id,
                      decision: "approve",
                      note: reviewNote,
                    }),
                  "Approved & published.",
                )
              }
              className="flex-1 rounded-lg bg-brand py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    actionReviewTemplateApproval({
                      templateId: reviewTpl.id,
                      decision: "reject",
                      note: reviewNote,
                    }),
                  "Rejected.",
                )
              }
              className="flex-1 rounded-lg border border-[#fecdca] py-2.5 text-[13px] font-semibold text-bad hover:bg-[#fef2f2] disabled:opacity-40"
            >
              Reject
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#f1f4f8] px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-muted uppercase">
      {children}
    </span>
  );
}

function ActionBtn({
  children,
  onClick,
  primary,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-[11.5px] font-semibold disabled:opacity-40 ${
        primary
          ? "border-brand bg-brand text-white"
          : danger
            ? "border-[#fecdca] text-bad hover:bg-[#fef2f2]"
            : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,30,58,.45)] p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`max-h-[min(92vh,860px)] w-full overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-xl ${
          wide ? "max-w-2xl" : "max-w-md"
        }`}
      >
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
