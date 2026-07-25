import Link from "next/link";
import type { Route } from "next";

type Tab = "templates" | "pieces";

/**
 * Top-level switch between full-form templates and reusable pieces/assets.
 */
export function TemplatesLibraryTabs({
  active,
  templatesCount,
  piecesCount,
  q,
  scope,
}: {
  active: Tab;
  templatesCount: number;
  piecesCount: number;
  q?: string;
  scope?: string;
}) {
  function hrefFor(tab: Tab): Route {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (scope) params.set("scope", scope);
    if (tab === "pieces") params.set("tab", "pieces");
    const qs = params.toString();
    return (qs ? `/templates?${qs}` : "/templates") as Route;
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Link
        href={hrefFor("templates")}
        className={`rounded-lg border px-3.5 py-2 text-[13px] font-semibold ${
          active === "templates"
            ? "border-brand bg-[rgba(255,102,0,.12)] text-brand"
            : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
        }`}
      >
        Form templates
        <span className="ml-1.5 text-[11px] font-medium text-faint">
          {templatesCount}
        </span>
      </Link>
      <Link
        href={hrefFor("pieces")}
        className={`rounded-lg border px-3.5 py-2 text-[13px] font-semibold ${
          active === "pieces"
            ? "border-brand bg-[rgba(255,102,0,.12)] text-brand"
            : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
        }`}
      >
        Components · Sections · Assets
        <span className="ml-1.5 text-[11px] font-medium text-faint">
          {piecesCount}
        </span>
      </Link>
    </div>
  );
}
