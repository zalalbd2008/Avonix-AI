/**
 * The screen header, in the prototype's proportions: 20px title at -0.02em, a
 * 13px muted subtitle 2px below it, the action on the right, 18px of space
 * under the lot.
 *
 * Every screen uses this, so it is the one place those numbers live — changing
 * a heading style here changes it everywhere rather than in twenty files.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-[18px] flex items-center gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-[-0.02em]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </header>
  );
}
