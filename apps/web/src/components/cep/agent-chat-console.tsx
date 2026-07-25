"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  closeConversation,
  releaseChatToAi,
  sendReply,
  takeOverChat,
} from "@/lib/crm/actions";

/**
 * Live agent console for CEP chat threads (P1).
 * Polls the conversation page via router.refresh while open.
 */
export function AgentChatConsole({
  clientId,
  conversationId,
  status,
  handoffStatus,
  channel,
  deliversTo,
}: {
  clientId: string;
  conversationId: string;
  status: string;
  handoffStatus: "ai" | "queued" | "agent";
  channel: string;
  deliversTo: string | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busy, startTransition] = useTransition();
  const live = channel === "chat";
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!live) return;
    timer.current = setInterval(() => {
      router.refresh();
    }, 2500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [live, router]);

  return (
    <div className="rounded-xl border border-line bg-white p-3.5">
      {live ? (
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              handoffStatus === "agent"
                ? "bg-brand/10 text-brand"
                : handoffStatus === "queued"
                  ? "bg-[#fff4e5] text-[#b45309]"
                  : "bg-[#f0fdf9] text-[#0f766e]"
            }`}
          >
            {handoffStatus === "agent"
              ? "You own this chat"
              : handoffStatus === "queued"
                ? "Visitor waiting for human"
                : "AI handling"}
          </span>
          <span className="text-[11px] text-faint">Live · refreshes every 2.5s</span>
          <div className="ml-auto flex gap-2">
            {handoffStatus !== "agent" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  startTransition(async () => {
                    await takeOverChat(clientId, conversationId);
                    router.refresh();
                  })
                }
                className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-ink hover:bg-[#f7f8fb]"
              >
                Take over
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  startTransition(async () => {
                    await releaseChatToAi(clientId, conversationId);
                    router.refresh();
                  })
                }
                className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-ink hover:bg-[#f7f8fb]"
              >
                Release to AI
              </button>
            )}
          </div>
        </div>
      ) : null}

      {error && (
        <p className="mb-2 rounded-lg bg-[#fef2f2] px-3 py-2 text-[12.5px] text-bad">
          {error}
        </p>
      )}
      {note && (
        <p className="mb-2 rounded-lg bg-[#fef6e7] px-3 py-2 text-[12.5px] text-warn">
          Saved to the thread
          {live ? " — visitor will see it in the widget" : `, but not delivered: ${note}`}
        </p>
      )}

      {!deliversTo && !live && (
        <p className="mb-2 rounded-lg bg-[#f1f4f8] px-3 py-2 text-[12.5px] text-muted">
          This contact left no email address, so a reply is recorded here only —
          it will not reach them.
        </p>
      )}

      {live && (
        <p className="mb-2 rounded-lg bg-[#f0f7ff] px-3 py-2 text-[12.5px] text-muted">
          Replies appear in the site chat widget within a few seconds (visitor
          poll).
        </p>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={
          live
            ? "Reply in live chat…"
            : deliversTo
              ? `Reply to ${deliversTo}…`
              : "Write an internal note…"
        }
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
            if (!result.delivered && !live) {
              setNote(result.deliveryNote ?? "unknown reason");
            } else if (live) {
              setNote("ok");
              setTimeout(() => setNote(null), 1600);
            }
            router.refresh();
          }}
          className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Sending…" : live ? "Send to visitor" : deliversTo ? "Send reply" : "Save note"}
        </button>

        <button
          onClick={async () => {
            await closeConversation(
              clientId,
              conversationId,
              status === "closed" ? "open" : "closed",
            );
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
