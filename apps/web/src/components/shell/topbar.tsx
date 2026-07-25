"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SwitchableClient } from "@/lib/clients/switcher";
import { usePlatformT } from "@/components/i18n/platform-i18n-provider";
import { timeAgo } from "@/components/ui/status-pill";
import { SignOutButton } from "./sign-out-button";
import { namesFor, scopeOf } from "./scope";

/**
 * The bar across the top — 50px, white, full width, exactly as the prototype
 * lays it out: logo, divider, breadcrumbs, then status and search on the right.
 *
 * The crumbs come from the path rather than from each page passing them down,
 * which is what stops a page being added later that quietly shows the wrong
 * trail. Ids become names via the same tree the switcher uses.
 */
export function Topbar({
  agencyName,
  role,
  clients,
  organizationCount,
  onSearch,
  signOutDisabled,
}: {
  agencyName: string;
  role: string;
  clients: SwitchableClient[];
  organizationCount: number;
  onSearch: () => void;
  /** Platform Owner managing a customer org — use Back to Platform instead. */
  signOutDisabled?: boolean;
}) {
  const { t } = usePlatformT();
  const pathname = usePathname();
  const scope = scopeOf(pathname);
  const { client, website } = namesFor(scope, clients);

  // Hierarchy: Organization › Clients › Client › Website.
  // With more than one organization the name switches tenant; with one, Clients
  // is the useful next step after the org label.
  const crumbs: { label: string; href?: string }[] = [
    {
      label: agencyName,
      href: organizationCount > 1 ? "/organizations" : "/clients",
    },
  ];

  const onOrganizations =
    pathname === "/organizations" || pathname.startsWith("/organizations/");
  const onClientsList = pathname === "/clients" || pathname.startsWith("/clients/new");

  if (onOrganizations) {
    crumbs.push({ label: t("topbar.organizations") });
  } else if (onClientsList || client) {
    crumbs.push({
      label: t("topbar.clients"),
      href: client ? "/clients" : undefined,
    });
  }
  if (client) {
    crumbs.push({
      label: client.name,
      href: scope.kind === "website" ? `/clients/${scope.clientId}` : undefined,
    });
  }
  if (website) crumbs.push({ label: `${website.name} ${t("topbar.website")}` });

  return (
    <header className="relative z-30 flex h-[50px] shrink-0 items-center gap-3.5 border-b border-line bg-white px-[18px]">
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="grid size-[26px] place-items-center rounded-[7px] bg-brand text-sm font-bold text-white">
          A
        </span>
        <span className="text-[14.5px] font-bold tracking-[-0.01em]">Avonix AI</span>
      </Link>

      <div className="h-5 w-px bg-line" />

      <nav className="flex min-w-0 items-center gap-2 text-[13px]">
        {/*
          Keyed by position, not by label: an agency and one of its clients can
          share a name, and two crumbs with the same key make React drop one.
          A breadcrumb trail is positional and never reordered, so the index is
          the honest key here.
        */}
        {crumbs.map((c, i) => (
          <span key={i} className="flex min-w-0 items-center gap-2">
            {i > 0 && <span className="text-[#c3ccd9]">›</span>}
            {c.href ? (
              <Link
                href={c.href as never}
                className="truncate font-medium text-muted hover:text-ink"
              >
                {c.label}
              </Link>
            ) : (
              <span className="truncate font-medium text-muted">{c.label}</span>
            )}
          </span>
        ))}

        {/*
          The prototype shows a "Production" pill here. We have no staging
          environment, so the honest equivalent is the role you are signed in
          with — a real fact rather than a decorative one.
        */}
        <span className="ml-1 shrink-0 rounded-full bg-[rgba(13,148,136,.1)] px-2.5 py-[3px] text-[11.5px] font-semibold text-ok capitalize">
          {role}
        </span>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-3.5">
        {website && (
          <div className="hidden items-center gap-3.5 text-[12.5px] lg:flex">
            <span
              className={`flex items-center gap-1.5 font-semibold ${
                website.status === "connected" ? "text-ok" : "text-warn"
              }`}
            >
              <span className="size-[7px] rounded-full bg-current" />
              {website.status}
            </span>
            <span className="text-faint">
              {website.lastSeenAt ? `last sync ${timeAgo(website.lastSeenAt)}` : "never synced"}
            </span>
          </div>
        )}

        <button
          onClick={onSearch}
          className="flex cursor-pointer items-center gap-2 rounded-[7px] border border-line bg-[#f8fafc] px-2.5 py-1.5 text-[12.5px] text-faint hover:border-[#c3ccd9] hover:text-muted"
        >
          <span>{t("shell.search")}</span>
          <kbd className="rounded border border-line bg-white px-1.5 text-[11px]">⌘K</kbd>
        </button>

        <SignOutButton disabled={signOutDisabled} />
      </div>
    </header>
  );
}
