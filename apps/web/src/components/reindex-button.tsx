"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reindexWebsite } from "@/lib/ai/actions";

export function ReindexButton({
  clientId,
  websiteId,
}: {
  clientId: string;
  websiteId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="text-right">
      <button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setNote(null);
          const result = await reindexWebsite(clientId, websiteId);
          setPending(false);
          setNote(
            result.ok
              ? `Indexed ${result.pages} pages into ${result.chunks} passages${result.embedded ? "" : " (text only)"}.`
              : result.error,
          );
          router.refresh();
        }}
        className="cursor-pointer rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {/* Crawling is synchronous and can take a while on a 30-page site. */}
        {pending ? "Reading the site…" : "Re-index site"}
      </button>
      {note && <p className="mt-1.5 text-[12px] text-muted">{note}</p>}
    </div>
  );
}
