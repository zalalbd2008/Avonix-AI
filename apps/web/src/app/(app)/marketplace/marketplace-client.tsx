"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormIcon, iconForFieldType } from "@/components/forms/icons";
import type { FormFieldType } from "@/lib/db/schema";
import {
  actionConfirmMarketplacePurchase,
  actionInstallMarketplaceListing,
  actionPurchaseMarketplaceListing,
} from "@/lib/forms/marketplace-actions";
import { formatListingPrice } from "@/lib/forms/marketplace-pricing";
import type { MarketplaceCard } from "@/lib/forms/marketplace-service";

type Props = {
  cards: MarketplaceCard[];
  installedIds: string[];
  purchasedIds: string[];
  currentRole: "owner" | "admin" | "member";
  agencyId: string;
  agencyName: string;
  initialQuery?: string;
  purchasedFlash?: boolean;
  canceledFlash?: boolean;
  sessionId?: string;
};

/**
 * Platform + community template marketplace (ADR-008) with paid checkout.
 */
export function MarketplaceClient({
  cards,
  installedIds: initialInstalled,
  purchasedIds: initialPurchased,
  currentRole,
  agencyId,
  agencyName,
  initialQuery = "",
  purchasedFlash = false,
  canceledFlash = false,
  sessionId,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [tab, setTab] = useState<"all" | "official" | "community" | "premium">(
    "all",
  );
  const [preview, setPreview] = useState<MarketplaceCard | null>(null);
  const [installed, setInstalled] = useState(() => new Set(initialInstalled));
  const [purchased, setPurchased] = useState(() => new Set(initialPurchased));
  const [msg, setMsg] = useState<string | null>(
    canceledFlash
      ? "Checkout canceled — nothing was charged."
      : purchasedFlash
        ? "Payment received — unlocking your template…"
        : null,
  );
  const [pending, startTransition] = useTransition();
  const canPublish = currentRole === "owner" || currentRole === "admin";

  useEffect(() => {
    if (!sessionId || !purchasedFlash) return;
    let cancelled = false;
    startTransition(async () => {
      const r = await actionConfirmMarketplacePurchase(sessionId);
      if (cancelled) return;
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setMsg("Purchase complete — template installed in your library.");
      router.replace("/marketplace");
      router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, purchasedFlash, router]);

  const filtered = useMemo(() => {
    let list = [...cards];
    if (tab === "official") list = list.filter((c) => c.source === "official");
    if (tab === "community") list = list.filter((c) => c.source === "community");
    if (tab === "premium")
      list = list.filter((c) => c.isPremium && c.priceCents > 0);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((c) =>
        [c.name, c.description ?? "", c.category ?? "", ...c.tags]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      );
    }
    return list;
  }, [cards, tab, q]);

  function canInstallFree(card: MarketplaceCard) {
    if (card.source === "official") return true;
    if (!card.isPremium || card.priceCents <= 0) return true;
    if (card.publisherAgencyId === agencyId) return true;
    return purchased.has(card.id);
  }

  function install(card: MarketplaceCard) {
    setMsg(null);
    startTransition(async () => {
      const r = await actionInstallMarketplaceListing(card.id);
      if (!r.ok) {
        if (r.code === "needs_purchase") {
          setMsg(
            `Purchase required (${formatListingPrice(r.priceCents ?? card.priceCents, r.currency ?? card.currency)}).`,
          );
          return;
        }
        setMsg(r.error);
        return;
      }
      setInstalled((prev) => new Set(prev).add(card.id));
      setMsg(`Installed “${r.name}” into ${agencyName} library as a draft.`);
      setPreview(null);
      router.refresh();
    });
  }

  function buy(card: MarketplaceCard) {
    setMsg(null);
    startTransition(async () => {
      const r = await actionPurchaseMarketplaceListing(card.id);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      window.location.href = r.url;
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "All"],
            ["official", "Official"],
            ["community", "Community"],
            ["premium", "Paid"],
          ] as const
        ).map(([id, label]) => (
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
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search marketplace…"
          className="ml-auto min-w-[180px] flex-1 rounded-lg border border-[#dbe1ea] px-2.5 py-1.5 text-[13px] sm:max-w-xs"
        />
        {canPublish ? (
          <Link
            href="/templates"
            className="rounded-lg border border-brand/30 bg-[#fff8f3] px-3 py-1.5 text-[12.5px] font-semibold text-brand hover:border-brand"
          >
            Publish from library…
          </Link>
        ) : null}
      </div>

      {msg ? (
        <p className="mb-3 rounded-lg border border-[#edf0f5] bg-[#f8fafc] px-3 py-2 text-[12.5px] text-brand">
          {msg}{" "}
          <Link href="/templates" className="font-semibold underline">
            Open templates
          </Link>
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#dbe1ea] bg-[#f8fafc] px-6 py-12 text-center">
          <p className="text-[13px] text-muted">
            No listings match. Official Avonix packs are free. Admins can publish
            free or paid org templates from the library.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const already = installed.has(c.id);
            const owned = purchased.has(c.id);
            const freePath = canInstallFree(c);
            const priceLabel = formatListingPrice(c.priceCents, c.currency);
            return (
              <article
                key={c.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-[#dbe1ea] bg-white shadow-[0_6px_18px_rgba(11,30,58,.05)]"
              >
                <div className="border-b border-[#edf0f5] px-4 py-3.5">
                  <div className="flex items-start gap-2">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#fff8f3] text-brand">
                      <FormIcon name="pack" size="sm" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-[14px] font-semibold text-[#13233c]">
                          {c.name}
                        </h3>
                        <span className="shrink-0 text-[12.5px] font-bold text-brand">
                          {priceLabel}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">
                        {c.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Pill>{c.source}</Pill>
                    {c.isOfficial ? <Pill>Avonix</Pill> : null}
                    {c.isPremium && c.priceCents > 0 ? (
                      <Pill>Premium</Pill>
                    ) : (
                      <Pill>Free</Pill>
                    )}
                    {owned ? <Pill>Owned</Pill> : null}
                    <Pill>
                      {c.fieldCount} fields
                      {c.source === "community"
                        ? ` · ${c.installCount} installs`
                        : ""}
                    </Pill>
                    {c.tags.slice(0, 2).map((t) => (
                      <Pill key={t}>#{t}</Pill>
                    ))}
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setPreview(c)}
                    className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand"
                  >
                    Preview
                  </button>
                  {freePath ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => install(c)}
                      className="rounded-md border border-brand bg-brand px-2 py-1 text-[11.5px] font-semibold text-white disabled:opacity-40"
                    >
                      {already ? "Install again" : "Install"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => buy(c)}
                      className="rounded-md border border-brand bg-brand px-2 py-1 text-[11.5px] font-semibold text-white disabled:opacity-40"
                    >
                      Buy {priceLabel}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,30,58,.45)] p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreview(null);
          }}
        >
          <div className="max-h-[min(92vh,860px)] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#13233c]">
                {preview.name}
              </h2>
              <span className="text-[13px] font-bold text-brand">
                {formatListingPrice(preview.priceCents, preview.currency)}
              </span>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="ml-auto text-[12px] font-semibold text-muted hover:text-brand"
              >
                Close
              </button>
            </div>
            <p className="mb-3 text-[12.5px] text-muted">
              {preview.description || "No description"}
            </p>
            <ul className="mb-3 space-y-1.5">
              {preview.fieldsPreview.map((f) => (
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
                  <span className="text-[10.5px] text-faint">{f.type}</span>
                </li>
              ))}
            </ul>
            {canInstallFree(preview) ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => install(preview)}
                className="w-full rounded-lg bg-brand py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
              >
                Install into {agencyName}
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => buy(preview)}
                className="w-full rounded-lg bg-brand py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
              >
                Buy & install —{" "}
                {formatListingPrice(preview.priceCents, preview.currency)}
              </button>
            )}
          </div>
        </div>
      ) : null}
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
