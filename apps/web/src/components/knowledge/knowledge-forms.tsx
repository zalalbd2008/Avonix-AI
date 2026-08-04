"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  actionAddCustomTextKnowledge,
  actionAddCustomUrlKnowledge,
  actionDeleteCustomSource,
} from "@/lib/ai/actions";

export function KnowledgeAddTextForm({
  clientId,
  websiteId,
}: {
  clientId: string;
  websiteId: string;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setNote(null);
        const result = await actionAddCustomTextKnowledge({
          clientId,
          websiteId,
          label,
          text,
        });
        setPending(false);
        if (result.ok) {
          setNote(`Added ${result.chunks} passages. Survives site re-index.`);
          setText("");
          setLabel("");
          router.refresh();
        } else {
          setNote(result.error);
        }
      }}
    >
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (e.g. Pricing notes)"
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-brand"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Paste FAQs, policies, hours, or anything the site does not already say clearly…"
        className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-brand"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add text"}
        </button>
        {note && <p className="text-[12px] text-muted">{note}</p>}
      </div>
    </form>
  );
}

export function KnowledgeAddUrlForm({
  clientId,
  websiteId,
}: {
  clientId: string;
  websiteId: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setNote(null);
        const result = await actionAddCustomUrlKnowledge({
          clientId,
          websiteId,
          url,
          label: label || undefined,
        });
        setPending(false);
        if (result.ok) {
          setNote(`Indexed ${result.chunks} passages from that URL.`);
          setUrl("");
          setLabel("");
          router.refresh();
        } else {
          setNote(result.error);
        }
      }}
    >
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/extra-page"
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-brand"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Optional label"
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-brand"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-lg border-[1.5px] border-[#dbe1ea] px-3.5 py-2 text-[13px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-60"
        >
          {pending ? "Fetching…" : "Add URL"}
        </button>
        {note && <p className="text-[12px] text-muted">{note}</p>}
      </div>
    </form>
  );
}

export function KnowledgeDeleteSourceButton({
  clientId,
  websiteId,
  sourceId,
}: {
  clientId: string;
  websiteId: string;
  sourceId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Remove this custom source and its passages?")) return;
        setPending(true);
        await actionDeleteCustomSource({ clientId, websiteId, sourceId });
        setPending(false);
        router.refresh();
      }}
      className="cursor-pointer text-[12px] font-medium text-muted hover:text-bad disabled:opacity-60"
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
