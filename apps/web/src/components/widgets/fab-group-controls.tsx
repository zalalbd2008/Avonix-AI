"use client";

import type { FabId, FloatingFabGroupSettings } from "@/lib/widgets/fab-group";
import { mergeFloatingFabGroup } from "@/lib/widgets/fab-group";

const LABELS: Record<FabId, string> = {
  accessibility: "Accessibility",
  languages: "Languages",
  chat: "Live Chat",
};

/**
 * Shared controls: stack Live Chat + Accessibility + Languages with a 1px gap,
 * or unlink any member for solo placement.
 */
export function FabGroupControls({
  value,
  onChange,
  currentId,
}: {
  value: FloatingFabGroupSettings;
  onChange: (next: FloatingFabGroupSettings) => void;
  /** Which studio is editing — used for helper copy. */
  currentId: FabId;
}) {
  const g = mergeFloatingFabGroup(value);
  const linkedHere = g.enabled && g.members[currentId]?.linked !== false;

  function patch(partial: Partial<FloatingFabGroupSettings>) {
    onChange(mergeFloatingFabGroup({ ...g, ...partial }));
  }

  function setMemberLinked(id: FabId, linked: boolean) {
    onChange(
      mergeFloatingFabGroup({
        ...g,
        members: {
          ...g.members,
          [id]: { linked },
        },
      }),
    );
  }

  return (
    <div className="rounded-xl border border-line bg-[#f8fafc] px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-ink">Floating button stack</p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted">
            Keep Live Chat, Accessibility, and Languages in one column with a{" "}
            <span className="font-medium text-ink">1px</span> gap. Unlink any
            button to place it alone.
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[12px] font-medium text-ink">
          <input
            type="checkbox"
            className="size-4 rounded border-line"
            checked={g.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
          />
          Stack
        </label>
      </div>

      {g.enabled ? (
        <div className="mt-3 space-y-2 border-t border-line/80 pt-3">
          {(Object.keys(LABELS) as FabId[]).map((id) => (
            <label
              key={id}
              className="flex cursor-pointer items-center justify-between gap-2 text-[12.5px] text-ink"
            >
              <span>
                {LABELS[id]}
                {id === currentId ? (
                  <span className="ml-1 text-muted">(this)</span>
                ) : null}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                {g.members[id]?.linked !== false ? "In stack" : "Solo"}
                <input
                  type="checkbox"
                  className="size-3.5 rounded border-line"
                  checked={g.members[id]?.linked !== false}
                  onChange={(e) => setMemberLinked(id, e.target.checked)}
                />
              </span>
            </label>
          ))}
          <p className="pt-1 text-[11px] leading-snug text-muted">
            {linkedHere
              ? "Drag moves the whole stack. Gap stays 1px on phone, tablet, and desktop."
              : `${LABELS[currentId]} is solo — drag places only this button.`}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[11px] leading-snug text-muted">
          Stack off — each button uses its own position.
        </p>
      )}
    </div>
  );
}
