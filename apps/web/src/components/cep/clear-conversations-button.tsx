"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { clearWebsiteConversations } from "@/lib/crm/actions";

export function ClearConversationsButton({
  clientId,
  websiteId,
  count,
}: {
  clientId: string;
  websiteId: string;
  count: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClear() {
    if (count === 0) return;
    const ok = window.confirm(
      `Clear all ${count} conversation${count === 1 ? "" : "s"} for this website?\n\nMessages will be permanently deleted. Contacts are kept.`,
    );
    if (!ok) return;

    startTransition(async () => {
      const res = await clearWebsiteConversations(clientId, websiteId);
      if (!res.ok) {
        window.alert(res.error || "Could not clear conversations.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClear}
      disabled={pending || count === 0}
      className="rounded-lg border border-[#fecaca] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#b91c1c] hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Clearing…" : "Clear conversations"}
    </button>
  );
}
