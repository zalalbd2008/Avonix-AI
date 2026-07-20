"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { closeConversation, sendReply } from "@/lib/crm/actions";

export function ReplyBox({
  clientId,
  conversationId,
  status,
  deliversTo,
}: {
  clientId: string;
  conversationId: string;
  status: string;
  /** The address a reply will reach, or null when there is nowhere to send. */
  deliversTo: string | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="rounded-xl border border-line bg-white p-3.5">
      {error && (
        <p className="mb-2 rounded-lg bg-[#fef2f2] px-3 py-2 text-[12.5px] text-bad">{error}</p>
      )}
      {note && (
        <p className="mb-2 rounded-lg bg-[#fef6e7] px-3 py-2 text-[12.5px] text-warn">
          Saved to the thread, but not delivered: {note}
        </p>
      )}

      {/* Said before they write, not after they send. */}
      {!deliversTo && (
        <p className="mb-2 rounded-lg bg-[#f1f4f8] px-3 py-2 text-[12.5px] text-muted">
          This contact left no email address, so a reply is recorded here only —
          it will not reach them.
        </p>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={deliversTo ? `Reply to ${deliversTo}…` : "Write an internal note…"}
        className="w-full resize-y rounded-lg border border-[#dbe1ea] px-3 py-2.5 text-sm outline-none focus:border-brand"
      />

      <div className="mt-2.5 flex items-center gap-3">
        <button
          disabled={pending || !body.trim()}
          onClick={async () => {
            setPending(true);
            setError(null);
            setNote(null);
            const result = await sendReply(clientId, conversationId, body);
            setPending(false);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setBody("");
            if (!result.delivered) setNote(result.deliveryNote ?? "unknown reason");
            router.refresh();
          }}
          className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Sending…" : deliversTo ? "Send reply" : "Save note"}
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
      </div>
    </div>
  );
}
