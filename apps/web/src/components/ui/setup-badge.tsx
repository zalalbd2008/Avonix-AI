export type SetupBadgeKind = "connect" | "demo" | "setup" | "incomplete";

const LABELS: Record<SetupBadgeKind, string> = {
  connect: "CONNECT",
  demo: "DEMO",
  setup: "SETUP",
  incomplete: "INCOMPLETE",
};

export function SetupBadge({
  kind,
  size = "sm",
  className = "",
}: {
  kind: SetupBadgeKind;
  size?: "sm" | "lg";
  className?: string;
}) {
  const sizeCls =
    size === "lg"
      ? "text-2xl font-bold tracking-[-0.02em]"
      : "text-[10px] font-bold uppercase tracking-wide";

  return (
    <span className={`${sizeCls} text-bad ${className}`.trim()}>
      {LABELS[kind]}
    </span>
  );
}
