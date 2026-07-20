"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { closeConversation, sendReply } from "@/lib/crm/actions";

export function ReplyBox({
  clientId,
  conversationId,
  status,
}: {
  clientId: string;
  conversationId: string;
  status: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="rounded-xl border border-line bg-white p-3.5">
      {error && (
        <p className="mb-2 rounded-lg bg-[#fef2f2] px-3 py-2 text-[12.5px] text-bad">{error}</p>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Write a reply…"
        className="w-full resize-y rounded-lg border border-[#dbe1ea] px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
      <div className="mt-2.5 flex items-center gap-3">
        <button
          disabled={pending || !body.trim()}
          onClick={async () => {
            setPending(true);
            setError(null);
            const result = await sendReply(clientId, conversationId, body);
            setPending(false);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setBody("");
            router.refresh();
          }}
          className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send reply"}
        </button>

        <button
          onClick={async () => {
            await closeConversation(clientId, conversationId, status === "closed" ? "open" : "closed");
            router.refresh();
          }}
          className="cursor-pointer text-[13px] font-medium text-muted hover:text-ink"
        >
          {status === "closed" ? "Reopen" : "Mark as closed"}
        </button>

        {/*
          Replies are stored but not yet delivered anywhere — there is no email
          send or chat socket on this path. Saying so beats letting someone think
          the visitor received it.
        */}
        <span className="ml-auto text-[11.5px] text-faint">
          Saved to the thread — outbound delivery is not wired up yet
        </span>
      </div>
    </div>
  );
}
