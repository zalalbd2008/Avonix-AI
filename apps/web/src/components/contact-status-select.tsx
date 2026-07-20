"use client";

import { useState, useTransition } from "react";
import { updateContactStatus } from "@/lib/crm/actions";

const STATUSES = ["new", "working", "qualified", "won", "lost"] as const;

export function ContactStatusSelect({
  clientId,
  contactId,
  value,
}: {
  clientId: string;
  contactId: string;
  value: string;
}) {
  const [current, setCurrent] = useState(value);
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={current}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        const previous = current;
        setCurrent(next); // optimistic
        startTransition(async () => {
          const result = await updateContactStatus(clientId, contactId, next);
          if (!result.ok) setCurrent(previous); // put it back rather than lie
        });
      }}
      className="cursor-pointer rounded-lg border border-[#dbe1ea] bg-white px-3 py-2 text-[13px] font-semibold capitalize outline-none focus:border-brand disabled:opacity-60"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
