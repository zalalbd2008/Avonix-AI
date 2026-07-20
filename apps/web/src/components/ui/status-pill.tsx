const TONE: Record<string, string> = {
  new: "bg-[#fff3ea] text-brand",
  working: "bg-[#fef6e7] text-warn",
  qualified: "bg-[#eef6ff] text-[#2563eb]",
  won: "bg-[#f0fdf9] text-ok",
  lost: "bg-[#f1f4f8] text-faint",
  open: "bg-[#fff3ea] text-brand",
  snoozed: "bg-[#f1f4f8] text-muted",
  closed: "bg-[#f0fdf9] text-ok",
};

export function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold capitalize ${
        TONE[value] ?? "bg-[#f1f4f8] text-muted"
      }`}
    >
      {value}
    </span>
  );
}

export function timeAgo(d: Date | string | null) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}
