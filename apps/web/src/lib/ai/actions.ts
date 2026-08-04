"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import {
  knowledgeChunks,
  knowledgeSources,
  websites,
} from "@/lib/db/schema";
import { chunkText, contentHash, fetchPage, chunkPage } from "./crawl";
import { embeddings } from "./embeddings";
import { indexWebsite } from "./index-site";

function canEdit(permissions: string[] | "*") {
  if (permissions === "*") return true;
  return (
    permissions.includes("websites.edit") ||
    permissions.includes("settings.edit")
  );
}

function revalidateKnowledge(clientId: string, websiteId: string) {
  revalidatePath(`/clients/${clientId}/websites/${websiteId}/knowledge`);
  revalidatePath(`/clients/${clientId}/websites/${websiteId}/chat-ai`);
}

export async function reindexWebsite(clientId: string, websiteId: string) {
  const ctx = await requireAgency();
  if (!canEdit(ctx.permissions)) {
    return { ok: false as const, error: "Permission denied." };
  }
  try {
    const result = await indexWebsite(ctx.agencyId, websiteId, "manual");
    if (result.ok) revalidateKnowledge(clientId, websiteId);
    return result;
  } catch (e) {
    console.error("reindexWebsite failed", e);
    return { ok: false as const, error: "Indexing failed. Try again." };
  }
}

/** Paste custom text into the website knowledge base (never wiped by crawl). */
export async function actionAddCustomTextKnowledge(input: {
  clientId: string;
  websiteId: string;
  label: string;
  text: string;
}): Promise<
  { ok: true; chunks: number } | { ok: false; error: string }
> {
  const ctx = await requireAgency();
  if (!canEdit(ctx.permissions)) {
    return { ok: false, error: "Permission denied." };
  }
  const text = input.text.trim();
  const label = input.label.trim() || "Custom note";
  if (text.length < 20) {
    return { ok: false, error: "Add at least a short paragraph of text." };
  }

  const siteOk = await assertWebsite(ctx.agencyId, input.websiteId);
  if (!siteOk) return { ok: false, error: "Website not found." };

  const sourceUrl = `custom://text/${Date.now()}`;
  const chunks = chunkText({ url: sourceUrl, title: label, text });
  if (chunks.length === 0) {
    return { ok: false, error: "Could not turn that text into knowledge chunks." };
  }

  const vectors = await embedOptional(chunks.map((c) => c.content));

  await withAgency(ctx.agencyId, async (tx) => {
    const [source] = await tx
      .insert(knowledgeSources)
      .values({
        agencyId: ctx.agencyId,
        websiteId: input.websiteId,
        sourceType: "text",
        label,
        sourceUrl,
        rawContent: text.slice(0, 200_000),
        contentHash: contentHash(text),
        status: "active",
      })
      .returning({ id: knowledgeSources.id });

    await tx.insert(knowledgeChunks).values(
      chunks.map((chunk, i) => ({
        agencyId: ctx.agencyId,
        websiteId: input.websiteId,
        sourceUrl: chunk.url,
        title: chunk.title,
        content: chunk.content,
        tokenCount: Math.ceil(chunk.content.length / 4),
        sourceType: "text" as const,
        sourceId: source.id,
        contentHash: chunk.contentHash,
        embedding: vectors ? vectors[i] : null,
      })),
    );
  });

  revalidateKnowledge(input.clientId, input.websiteId);
  return { ok: true, chunks: chunks.length };
}

/** Index one extra URL into this website's knowledge (survives site re-crawl). */
export async function actionAddCustomUrlKnowledge(input: {
  clientId: string;
  websiteId: string;
  url: string;
  label?: string;
}): Promise<
  { ok: true; chunks: number } | { ok: false; error: string }
> {
  const ctx = await requireAgency();
  if (!canEdit(ctx.permissions)) {
    return { ok: false, error: "Permission denied." };
  }

  let parsed: URL;
  try {
    parsed = new URL(input.url.trim());
  } catch {
    return { ok: false, error: "Enter a valid URL." };
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return { ok: false, error: "Only http(s) URLs are supported." };
  }

  const siteOk = await assertWebsite(ctx.agencyId, input.websiteId);
  if (!siteOk) return { ok: false, error: "Website not found." };

  const page = await fetchPage(parsed.toString());
  if (!page) {
    return { ok: false, error: "Could not fetch readable text from that URL." };
  }

  const label = (input.label || page.title || parsed.hostname).trim();
  const chunks = chunkPage(page);
  if (chunks.length === 0) {
    return { ok: false, error: "That URL had no indexable text." };
  }

  const vectors = await embedOptional(chunks.map((c) => c.content));

  await withAgency(ctx.agencyId, async (tx) => {
    // Replace prior custom-url chunks / sources for the same URL on this site.
    await tx
      .delete(knowledgeChunks)
      .where(
        and(
          eq(knowledgeChunks.websiteId, input.websiteId),
          eq(knowledgeChunks.sourceType, "url"),
          eq(knowledgeChunks.sourceUrl, page.url),
        ),
      );
    await tx
      .update(knowledgeSources)
      .set({ deletedAt: new Date(), status: "deleted", updatedAt: new Date() })
      .where(
        and(
          eq(knowledgeSources.websiteId, input.websiteId),
          eq(knowledgeSources.sourceType, "url"),
          eq(knowledgeSources.sourceUrl, page.url),
          isNull(knowledgeSources.deletedAt),
        ),
      );

    const [source] = await tx
      .insert(knowledgeSources)
      .values({
        agencyId: ctx.agencyId,
        websiteId: input.websiteId,
        sourceType: "url",
        label,
        sourceUrl: page.url,
        contentHash: page.contentHash,
        status: "active",
      })
      .returning({ id: knowledgeSources.id });

    await tx.insert(knowledgeChunks).values(
      chunks.map((chunk, i) => ({
        agencyId: ctx.agencyId,
        websiteId: input.websiteId,
        sourceUrl: chunk.url,
        title: chunk.title ?? label,
        content: chunk.content,
        tokenCount: Math.ceil(chunk.content.length / 4),
        sourceType: "url" as const,
        sourceId: source.id,
        contentHash: chunk.contentHash,
        embedding: vectors ? vectors[i] : null,
      })),
    );
  });

  revalidateKnowledge(input.clientId, input.websiteId);
  return { ok: true, chunks: chunks.length };
}

export async function actionDeleteCustomSource(input: {
  clientId: string;
  websiteId: string;
  sourceId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEdit(ctx.permissions)) {
    return { ok: false, error: "Permission denied." };
  }

  await withAgency(ctx.agencyId, async (tx) => {
    await tx
      .delete(knowledgeChunks)
      .where(
        and(
          eq(knowledgeChunks.websiteId, input.websiteId),
          eq(knowledgeChunks.sourceId, input.sourceId),
        ),
      );
    await tx
      .update(knowledgeSources)
      .set({ deletedAt: new Date(), status: "deleted", updatedAt: new Date() })
      .where(
        and(
          eq(knowledgeSources.id, input.sourceId),
          eq(knowledgeSources.websiteId, input.websiteId),
        ),
      );
  });

  revalidateKnowledge(input.clientId, input.websiteId);
  return { ok: true };
}

async function assertWebsite(agencyId: string, websiteId: string) {
  const [site] = await withAgency(agencyId, (tx) =>
    tx
      .select({ id: websites.id })
      .from(websites)
      .where(and(eq(websites.id, websiteId), isNull(websites.deletedAt)))
      .limit(1),
  );
  return Boolean(site);
}

async function embedOptional(texts: string[]): Promise<number[][] | null> {
  const provider = embeddings();
  if (!provider || texts.length === 0) return null;
  try {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 64) {
      out.push(...(await provider.embedDocuments(texts.slice(i, i + 64))));
    }
    return out;
  } catch {
    return null;
  }
}
