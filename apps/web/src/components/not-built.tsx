import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { SetupBadge } from "@/components/ui/setup-badge";

/**
 * A screen that exists in the menu but not yet in the product.
 *
 * One component rather than four near-identical pages, and it says plainly what
 * is missing and why. The alternative — a screen of invented numbers — is how
 * a demo becomes a lie the moment someone trusts it.
 */
export function NotBuilt({
  title,
  subtitle,
  lead,
  body,
  planned,
  backHref = "/dashboard",
  backLabel = "← Back to dashboard",
}: {
  title: string;
  subtitle: string;
  lead: string;
  body: string;
  planned?: string[];
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="max-w-xl">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="rounded-xl border border-line bg-white p-5">
        <div className="mb-2 flex items-center gap-2">
          <SetupBadge kind="demo" />
          <p className="text-[13.5px] font-semibold">{lead}</p>
        </div>
        <p className="text-[13px] leading-[1.6] text-muted">{body}</p>

        {planned && planned.length > 0 && (
          <ul className="mt-3.5 space-y-1.5 border-t border-[#f1f4f8] pt-3.5">
            {planned.map((p) => (
              <li key={p} className="flex gap-2 text-[12.5px] text-muted">
                <span className="text-faint">·</span>
                {p}
              </li>
            ))}
          </ul>
        )}

        <Link
          href={backHref as never}
          className="mt-4 inline-block text-[13px] font-semibold text-brand hover:underline"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
