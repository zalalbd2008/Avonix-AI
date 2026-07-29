/**
 * Wraps wide table/grid layouts so they scroll horizontally on narrow
 * viewports instead of crushing columns or overlapping.
 */
export function ScrollTable({
  children,
  minWidth = 640,
  className = "",
}: {
  children: React.ReactNode;
  minWidth?: number;
  className?: string;
}) {
  return (
    <div
      className={`overflow-x-auto rounded-xl border border-line bg-white [-webkit-overflow-scrolling:touch] ${className}`}
    >
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}
