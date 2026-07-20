"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { moveCard } from "@/lib/crm/actions";

type Card = {
  contactId: string;
  name: string | null;
  email: string | null;
  status: string;
};

type Stage = { id: string; name: string; cards: Card[] };

/**
 * Kanban board using the native HTML5 drag events.
 *
 * No drag-and-drop library: this is one interaction on one screen, and the
 * browser already does it. A dependency here would be more code to keep current
 * than the feature is worth.
 */
export function PipelineBoard({
  clientId,
  stages,
  unplaced,
}: {
  clientId: string;
  stages: Stage[];
  unplaced: { id: string; name: string | null; email: string | null; status: string }[];
}) {
  const router = useRouter();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function drop(stageId: string) {
    const contactId = dragging;
    setDragging(null);
    setOver(null);
    if (!contactId || busy) return;

    setBusy(true);
    await moveCard(clientId, contactId, stageId);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {unplaced.length > 0 && (
        <Column
          title="Not placed"
          count={unplaced.length}
          muted
          onDragOver={(e) => e.preventDefault()}
        >
          {unplaced.map((c) => (
            <CardTile
              key={c.id}
              clientId={clientId}
              card={{ contactId: c.id, name: c.name, email: c.email, status: c.status }}
              onDragStart={() => setDragging(c.id)}
            />
          ))}
        </Column>
      )}

      {stages.map((s) => (
        <Column
          key={s.id}
          title={s.name}
          count={s.cards.length}
          highlighted={over === s.id}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(s.id);
          }}
          onDragLeave={() => setOver((v) => (v === s.id ? null : v))}
          onDrop={() => drop(s.id)}
        >
          {s.cards.map((c) => (
            <CardTile
              key={c.contactId}
              clientId={clientId}
              card={c}
              onDragStart={() => setDragging(c.contactId)}
            />
          ))}
          {s.cards.length === 0 && (
            <p className="px-1 py-6 text-center text-[12px] text-faint">
              Drag someone here
            </p>
          )}
        </Column>
      ))}
    </div>
  );
}

function Column({
  title,
  count,
  children,
  muted,
  highlighted,
  ...handlers
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  muted?: boolean;
  highlighted?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...handlers}
      className={`flex w-64 shrink-0 flex-col gap-2 rounded-xl border p-2.5 transition-colors ${
        highlighted ? "border-brand bg-[#fff8f3]" : "border-line bg-[#fbfcfd]"
      }`}
    >
      <div className="flex items-center gap-2 px-1">
        <span className={`text-[12.5px] font-bold ${muted ? "text-faint" : ""}`}>{title}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-muted">
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

function CardTile({
  clientId,
  card,
  onDragStart,
}: {
  clientId: string;
  card: Card;
  onDragStart: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="cursor-grab rounded-lg border border-line bg-white p-2.5 active:cursor-grabbing"
    >
      <Link
        href={`/clients/${clientId}/contacts/${card.contactId}` as never}
        className="text-[13px] font-semibold hover:text-brand"
      >
        {card.name ?? card.email ?? "Unnamed"}
      </Link>
      {card.email && card.name && (
        <div className="truncate text-[11.5px] text-faint">{card.email}</div>
      )}
    </div>
  );
}
