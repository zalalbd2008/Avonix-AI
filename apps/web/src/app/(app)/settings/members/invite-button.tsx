"use client";

/** Header CTA — opens the invite panel on the Team page. */
export function TeamInviteButton() {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new CustomEvent("avonix:team-invite"));
      }}
      className="rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
    >
      + Invite
    </button>
  );
}
