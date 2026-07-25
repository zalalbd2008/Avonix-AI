import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { FormIcon } from "@/components/forms/icons";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { clients, websites } from "@/lib/db/schema";
import { listCloudTemplates } from "@/lib/forms/template-service";
import {
  listFavoriteTemplateIds,
  listTemplateCollections,
} from "@/lib/forms/template-collections";
import { listOrgMembersForSharing } from "@/lib/forms/template-sharing";
import {
  listFormAssets,
  listFormComponents,
  listFormSections,
} from "@/lib/forms/org-asset-service";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_QUICK_FILTERS,
  TEMPLATE_SCOPE_FILTERS,
  TEMPLATE_SORT_OPTIONS,
  TEMPLATE_STATUS_FILTERS,
} from "@/lib/forms/template-library";
import { TemplateLibraryClient } from "./template-library-client";
import { OrgAssetsLibraryClient } from "./org-assets-library-client";
import { TemplatesLibraryTabs } from "./templates-library-tabs";
import { LibraryTransferPanel } from "./library-transfer-panel";
import { asc, isNull } from "drizzle-orm";

/**
 * Route: /templates
 *
 * Organization Cloud Form Template Library (ADR-007 Steps 1–6).
 */
export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string; tab?: string }>;
}) {
  const ctx = await requireAgency();
  const sp = await searchParams;
  const tab =
    sp.tab === "pieces"
      ? "pieces"
      : ("templates" as "templates" | "pieces");

  const [templates, favoriteIds, collections, sites, members, components, sections, assets] =
    await Promise.all([
      listCloudTemplates(
        ctx.agencyId,
        ctx.userId,
        {
          q: sp.q,
          scope: sp.scope as
            | "website"
            | "organization"
            | "personal"
            | "team"
            | "global"
            | undefined,
        },
        ctx.role,
      ),
      listFavoriteTemplateIds(ctx.agencyId, ctx.userId),
      listTemplateCollections(ctx.agencyId, ctx.userId),
      withAgency(ctx.agencyId, async (tx) => {
        const clientRows = await tx
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(isNull(clients.deletedAt))
          .orderBy(asc(clients.name))
          .limit(100);
        const siteRows = await tx
          .select({
            id: websites.id,
            name: websites.name,
            clientId: websites.clientId,
          })
          .from(websites)
          .where(isNull(websites.deletedAt))
          .orderBy(asc(websites.name))
          .limit(200);
        return { clients: clientRows, websites: siteRows };
      }),
      listOrgMembersForSharing(ctx.agencyId),
      listFormComponents(ctx.agencyId, ctx.userId),
      listFormSections(ctx.agencyId, ctx.userId),
      listFormAssets(ctx.agencyId, ctx.userId),
    ]);

  return (
    <div>
      <PageHeader
        title="Templates"
        subtitle={`${ctx.agencyName} · cloud library · import / export`}
        action={
          <Link
            href="/clients"
            className="rounded-lg border border-[#dbe1ea] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            Build a form first
          </Link>
        }
      />

      <div className="mb-4 rounded-xl border border-[#edf0f5] bg-[#f8fafc] px-4 py-3 text-[13px] text-muted">
        <p className="flex items-start gap-2">
          <FormIcon name="pack" size="sm" className="mt-0.5 shrink-0 text-brand" />
          <span>
            Full form templates live beside reusable components, sections, and
            registered media assets — export ZIP backups or import packages with
            conflict-aware sync.
          </span>
        </p>
      </div>

      <LibraryTransferPanel currentRole={ctx.role} />

      <TemplatesLibraryTabs
        active={tab}
        templatesCount={templates.length}
        piecesCount={components.length + sections.length + assets.length}
        q={sp.q}
        scope={sp.scope}
      />

      {tab === "pieces" ? (
        <OrgAssetsLibraryClient
          components={components.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            category: c.category,
            scope: c.scope,
            status: c.status,
            fieldCount: c.fields?.length ?? 0,
            tags: c.tags ?? [],
            usageCount: c.usageCount,
            updatedAt: c.updatedAt?.toISOString?.() ?? String(c.updatedAt),
            fields: (c.fields ?? []).slice(0, 16).map((f) => ({
              key: f.key,
              label: f.label,
              type: f.type,
            })),
          }))}
          sections={sections.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            category: s.category,
            scope: s.scope,
            status: s.status,
            fieldCount: s.fields?.length ?? 0,
            tags: s.tags ?? [],
            usageCount: s.usageCount,
            updatedAt: s.updatedAt?.toISOString?.() ?? String(s.updatedAt),
            fields: (s.fields ?? []).slice(0, 16).map((f) => ({
              key: f.key,
              label: f.label,
              type: f.type,
            })),
          }))}
          assets={assets.map((a) => ({
            id: a.id,
            name: a.name,
            description: a.description,
            kind: a.kind,
            url: a.url,
            mimeType: a.mimeType,
            folder: a.folder,
            tags: a.tags ?? [],
            usageCount: a.usageCount,
            updatedAt: a.updatedAt?.toISOString?.() ?? String(a.updatedAt),
          }))}
        />
      ) : (
        <TemplateLibraryClient
          templates={templates.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            category: t.category,
            scope: t.scope,
            status: t.status,
            visibility: t.visibility,
            version: t.version,
            usageCount: t.usageCount,
            fieldCount: t.fields?.length ?? 0,
            tags: t.tags ?? [],
            updatedAt: t.updatedAt?.toISOString?.() ?? String(t.updatedAt),
            createdAt: t.createdAt?.toISOString?.() ?? String(t.createdAt),
            isLocked: t.isLocked,
            createdBy: t.createdBy,
            reviewNote: t.reviewNote,
            fields: (t.fields ?? []).slice(0, 16).map((f) => ({
              key: f.key,
              label: f.label,
              type: f.type,
            })),
          }))}
          favoriteIds={favoriteIds}
          collections={collections}
          categories={TEMPLATE_CATEGORIES}
          scopes={TEMPLATE_SCOPE_FILTERS}
          statuses={TEMPLATE_STATUS_FILTERS}
          sorts={TEMPLATE_SORT_OPTIONS}
          quickFilters={TEMPLATE_QUICK_FILTERS}
          clients={sites.clients}
          websites={sites.websites}
          members={members}
          currentUserId={ctx.userId}
          currentRole={ctx.role}
          initialQuery={sp.q ?? ""}
        />
      )}
    </div>
  );
}
