/**
 * The screen header used across the app.
 * On narrow viewports, title and action stack so neither truncates or overlaps.
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
    <header className="mb-[18px] flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold tracking-[-0.02em] break-words">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex w-full shrink-0 flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end [&>a]:w-full [&>a]:text-center sm:[&>a]:w-auto [&>button]:w-full sm:[&>button]:w-auto">
          {action}
        </div>
      ) : null}
    </header>
  );
}
