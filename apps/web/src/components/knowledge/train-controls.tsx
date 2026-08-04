"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  actionAddCustomTextKnowledge,
  actionClearKnowledge,
  reindexWebsite,
} from "@/lib/ai/actions";

type Status = { ok: boolean; message: string } | null;

export function TrainControls({
  clientId,
  websiteId,
  faqPaste,
  onFaqIndexed,
}: {
  clientId: string;
  websiteId: string;
  /** Optional FAQ Q:/A: text — indexed alongside crawl on Train Now. */
  faqPaste?: string;
  onFaqIndexed?: () => void;
}) {
  const router = useRouter();
  const [training, setTraining] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function trainNow() {
    setTraining(true);
    setStatus(null);

    const faq = (faqPaste ?? "").trim();
    if (faq.length >= 20) {
      const faqResult = await actionAddCustomTextKnowledge({
        clientId,
        websiteId,
        label: "FAQ",
        text: faq,
      });
      if (!faqResult.ok) {
        setTraining(false);
        setStatus({ ok: false, message: faqResult.error });
        return;
      }
      onFaqIndexed?.();
    }

    const result = await reindexWebsite(clientId, websiteId);
    setTraining(false);
    if (result.ok) {
      setStatus({
        ok: true,
        message: `Trained ${result.pages} pages into ${result.chunks} passages${result.embedded ? "" : " (text only)"}.`,
      });
      router.refresh();
    } else {
      setStatus({ ok: false, message: result.error });
    }
  }

  async function clearMemory() {
    if (
      !confirm(
        "Clear all knowledge for this website? Crawl and custom passages will be removed.",
      )
    ) {
      return;
    }
    setClearing(true);
    setStatus(null);
    const result = await actionClearKnowledge(clientId, websiteId);
    setClearing(false);
    if (result.ok) {
      setStatus({
        ok: true,
        message: `Cleared ${result.removed} passages from memory.`,
      });
      router.refresh();
    } else {
      setStatus({ ok: false, message: result.error });
    }
  }

  const busy = training || clearing;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={trainNow}
          className="cursor-pointer rounded-xl bg-brand px-4 py-2.5 text-[13px] font-bold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {training ? "Training…" : "Train Now"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={clearMemory}
          className="cursor-pointer rounded-xl border-[1.5px] border-[#dbe1ea] px-4 py-2.5 text-[13px] font-bold text-muted hover:border-brand hover:text-brand disabled:opacity-60"
        >
          {clearing ? "Clearing…" : "Clear Memory"}
        </button>
      </div>
      {status ? (
        <div
          className={`mt-3 flex items-start gap-2 rounded-xl border px-4 py-3 text-[12px] font-semibold ${
            status.ok
              ? "border-ok/25 bg-ok/5 text-ok"
              : "border-bad/25 bg-[#fef2f2] text-bad"
          }`}
        >
          {status.message}
        </div>
      ) : null}
    </div>
  );
}
