"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SwitchableClient } from "@/lib/clients/switcher";
import { usePlatformT } from "@/components/i18n/platform-i18n-provider";
import { timeAgo } from "@/components/ui/status-pill";
import { SignOutButton } from "./sign-out-button";
import { namesFor, scopeOf } from "./scope";

/**
 * The bar across the top — 50px, white, full width.
 * On small screens: menu toggle, compact brand, truncated crumbs, icon search.
 */
export function Topbar({
  agencyName,
  role,
  clients,
  organizationCount,
  onSearch,
  onMenu,
  signOutDisabled,
}: {
  agencyName: string;
  role: string;
  clients: SwitchableClient[];
  organizationCount: number;
  onSearch: () => void;
  onMenu: () => void;
  /** Platform Owner managing a customer org — use Back to Platform instead. */
  signOutDisabled?: boolean;
}) {
  const { t } = usePlatformT();
  const pathname = usePathname();
  const scope = scopeOf(pathname);
  const { client, website } = namesFor(scope, clients);

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
    <header className="relative z-30 flex h-[50px] shrink-0 items-center gap-2 border-b border-line bg-white px-3 sm:gap-3.5 sm:px-[18px]">
      <button
        type="button"
        onClick={onMenu}
        className="grid size-9 shrink-0 place-items-center rounded-lg text-ink hover:bg-surface lg:hidden"
        aria-label="Open navigation"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path
            d="M2.5 4.5h13M2.5 9h13M2.5 13.5h13"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
        <span className="grid size-[26px] place-items-center rounded-[7px] bg-brand text-sm font-bold text-white">
          A
        </span>
        <span className="hidden text-[14.5px] font-bold tracking-[-0.01em] sm:inline">
          Avonix AI
        </span>
      </Link>

      <div className="hidden h-5 w-px bg-line sm:block" />

      <nav className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-[13px] sm:gap-2">
        {crumbs.map((c, i) => (
          <span
            key={i}
            className={`flex min-w-0 items-center gap-1.5 sm:gap-2 ${
              i < crumbs.length - 1 ? "hidden md:flex" : "flex"
            }`}
          >
            {i > 0 && (
              <span className="hidden text-[#c3ccd9] md:inline">›</span>
            )}
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

        <span className="ml-1 hidden shrink-0 rounded-full bg-[rgba(13,148,136,.1)] px-2.5 py-[3px] text-[11.5px] font-semibold text-ok capitalize sm:inline">
          {role}
        </span>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3.5">
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
          className="flex cursor-pointer items-center gap-2 rounded-[7px] border border-line bg-[#f8fafc] px-2 py-1.5 text-[12.5px] text-faint hover:border-[#c3ccd9] hover:text-muted sm:px-2.5"
          aria-label={t("shell.search")}
        >
          <span className="hidden sm:inline">{t("shell.search")}</span>
          <kbd className="rounded border border-line bg-white px-1.5 text-[11px]">⌘K</kbd>
        </button>

        <SignOutButton disabled={signOutDisabled} />
      </div>
    </header>
  );
}
