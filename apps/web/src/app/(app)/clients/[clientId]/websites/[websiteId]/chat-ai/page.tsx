import { notFound } from "next/navigation";
import { and, count, eq, gte, isNull, sql, asc } from "drizzle-orm";
import { CepWidgetStudio } from "@/components/cep/cep-widget-studio";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import {
  agencies,
  aiUsageDaily,
  conversations,
  forms,
  knowledgeChunks,
  websites,
} from "@/lib/db/schema";
import { limitsFor } from "@/lib/plans";
import { configuredAiProviders } from "@/lib/ai/router";
import { ensureDefaultBubbleWidget } from "@/lib/cep/cep-service";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/chat-ai
 * CEP design studio — full-width builder aligned with Popup / Button studios.
 */
export default async function ChatAiPage({
  params,
}: {
  params: Promise<{ clientId: string; websiteId: string }>;
}) {
  const { clientId, websiteId } = await params;
  const ctx = await requireAgency();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthDay = monthStart.toISOString().slice(0, 10);

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [site] = await tx
      .select({
        id: websites.id,
        name: websites.name,
        url: websites.url,
        status: websites.status,
      })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    if (!site) return null;

    const [[agency], [chunks], [threads], [used], formRows] = await Promise.all([
      tx
        .select({ plan: agencies.plan })
        .from(agencies)
        .where(eq(agencies.id, ctx.agencyId))
        .limit(1),
      tx
        .select({ n: count() })
        .from(knowledgeChunks)
        .where(eq(knowledgeChunks.websiteId, websiteId)),
      tx
        .select({ n: count() })
        .from(conversations)
        .where(
          and(
            eq(conversations.websiteId, websiteId),
            eq(conversations.channel, "chat"),
          ),
        ),
      tx
        .select({
          n: sql<number>`coalesce(sum(${aiUsageDaily.requests}), 0)`.mapWith(
            Number,
          ),
        })
        .from(aiUsageDaily)
        .where(gte(aiUsageDaily.day, monthDay)),
      tx
        .select({
          id: forms.id,
          name: forms.name,
          formNumber: forms.formNumber,
        })
        .from(forms)
        .where(
          and(
            eq(forms.websiteId, websiteId),
            eq(forms.clientId, clientId),
            isNull(forms.deletedAt),
          ),
        )
        .orderBy(asc(forms.name))
        .limit(100),
    ]);

    return {
      site,
      plan: agency.plan,
      chunks: chunks.n,
      threads: threads.n,
      used: used.n,
      forms: formRows,
    };
  });

  if (!data) notFound();
  const { site } = data;

  const widget = await ensureDefaultBubbleWidget({
    agencyId: ctx.agencyId,
    clientId,
    websiteId,
    websiteName: site.name,
  });

  const limits = limitsFor(data.plan);
  const providers = configuredAiProviders();
  const modelReady = providers.length > 0;
  const embeddingsReady = Boolean(process.env.VOYAGE_API_KEY);
  const indexed = data.chunks > 0;
  const live = modelReady && indexed;

  return (
    <CepWidgetStudio
      clientId={clientId}
      websiteId={websiteId}
      websiteName={site.name}
      initial={{
        ...widget,
        createdAt: widget.createdAt.toISOString() as unknown as Date,
        updatedAt: widget.updatedAt.toISOString() as unknown as Date,
        deletedAt: (widget.deletedAt?.toISOString() ??
          null) as unknown as Date | null,
      }}
      configuredProviders={providers}
      forms={data.forms}
      health={{
        live,
        modelReady,
        indexed,
        embeddingsReady,
        pluginConnected: site.status === "connected",
        chunks: data.chunks,
        threads: data.threads,
        used: data.used,
        limit: limits.maxAiMessagesPerMonth,
        planLabel: limits.label,
        providers,
        knowledgeHref: `/clients/${clientId}/websites/${websiteId}/knowledge`,
        websiteHref: `/clients/${clientId}/websites/${websiteId}`,
      }}
    />
  );
}
