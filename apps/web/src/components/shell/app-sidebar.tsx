"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { SwitchableClient } from "@/lib/clients/switcher";
import { usePlatformT } from "@/components/i18n/platform-i18n-provider";
import {
  translateNavLabel,
  translateSectionTitle,
} from "@/lib/i18n/nav-labels";
import {
  agencyNav,
  filterNavByPermissions,
  flattenNavHrefs,
  websiteNav,
  type NavItem,
  type NavSection,
} from "@/lib/nav";
import { NavChevron } from "./nav-chevron";
import { NavIcon } from "./nav-icons";
import { ScopeSwitcher, type SwitchItem } from "./scope-switcher";
import { namesFor, scopeOf } from "./scope";

/**
 * The one sidebar — 225px of navy.
 *
 * Accounts (+ Operations dropdown) with Settings pinned at the bottom.
 * Website Workspace when a site is open.
 */
export function AppSidebar({
  clients,
  truncated: _truncated,
  permissions,
  onSearch,
}: {
  clients: SwitchableClient[];
  truncated: boolean;
  permissions: string[] | "*";
  onSearch: () => void;
}) {
  const { t } = usePlatformT();
  const pathname = usePathname();
  const scope = scopeOf(pathname);
  const { client, website } = namesFor(scope, clients);

  const onWebsite = scope.kind === "website";
  const sections: NavSection[] = onWebsite
    ? websiteNav(scope.clientId, scope.websiteId)
    : filterNavByPermissions(agencyNav, permissions);

  const allHrefs = flattenNavHrefs(sections);
  const bodySections = sections.filter((s) => Boolean(s.title));
  const footerSections = onWebsite ? [] : sections.filter((s) => !s.title);

  return (
    <nav className="flex w-[225px] shrink-0 flex-col overflow-y-auto bg-navy p-[12px_10px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {onWebsite && (
        <Link
          href="/websites"
          className="px-3 pt-0.5 pb-2 text-xs text-white/50 hover:text-white"
        >
          {t("shell.backWebsites")}
        </Link>
      )}

      {onWebsite ? (
        <ScopeSwitcher
          icon="🌐"
          title={website?.name ?? "Website"}
          subtitle={website?.status ?? "—"}
          items={(client?.websites ?? []).map<SwitchItem>((w) => ({
            id: w.id,
            label: w.name,
            href: `/clients/${scope.clientId}/websites/${w.id}`,
            ok: w.status === "connected",
          }))}
          currentId={scope.websiteId}
          newLabel={t("shell.newWebsite")}
          newHref={`/clients/${scope.clientId}/websites/new`}
        />
      ) : (
        <button
          onClick={onSearch}
          className="mb-3 flex cursor-pointer items-center gap-2 rounded-[7px] border border-white/10 bg-white/[.07] px-2.5 py-[7px] text-[13px] text-white/55 hover:bg-white/12"
        >
          <span className="font-semibold">⌘</span>
          <span>{t("shell.search")}</span>
          <span className="ml-auto rounded border border-white/20 px-[5px] py-px text-[11px]">
            K
          </span>
        </button>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        {bodySections.map((section, i) => (
          <SectionBlock
            key={section.title ?? i}
            section={section}
            pathname={pathname}
            allHrefs={allHrefs}
            showDividerAbove={i > 0}
          />
        ))}

        {footerSections.length > 0 ? (
          <div className="mt-auto pt-2">
            <div className="mx-2 mb-2 border-t border-white/10" />
            {footerSections.map((section, i) => (
              <SectionBlock
                key={`footer-${i}`}
                section={section}
                pathname={pathname}
                allHrefs={allHrefs}
              />
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}

function SectionBlock({
  section,
  pathname,
  allHrefs,
  showDividerAbove,
}: {
  section: NavSection;
  pathname: string;
  allHrefs: string[];
  showDividerAbove?: boolean;
}) {
  const { t } = usePlatformT();

  return (
    <div className="flex flex-col gap-0.5">
      {showDividerAbove ? <div className="mx-2 my-2.5 border-t border-white/10" /> : null}
      {section.title ? (
        <div className="px-3 pt-1 pb-1.5 text-[11px] font-semibold tracking-[0.04em] text-white/40">
          {translateSectionTitle(section.title, t)}
        </div>
      ) : null}
      {section.items.map((item) => (
        <NavBranch
          key={item.href + item.label}
          item={item}
          pathname={pathname}
          allHrefs={allHrefs}
        />
      ))}
    </div>
  );
}

function NavBranch({
  item,
  pathname,
  allHrefs,
}: {
  item: NavItem;
  pathname: string;
  allHrefs: string[];
}) {
  const { t } = usePlatformT();
  const childActive = (item.children ?? []).some((c) =>
    isActive(pathname, c.href, allHrefs),
  );
  const selfActive = isActive(pathname, item.href, allHrefs) && !childActive;
  const [open, setOpen] = useState(false);
  const expanded = open || childActive;

  if (!item.children?.length) {
    return (
      <NavLink item={item} active={selfActive || isActive(pathname, item.href, allHrefs)} />
    );
  }

  const rowActive = selfActive || childActive;

  return (
    <div>
      <div
        className={`flex items-center gap-0.5 rounded-md ${
          rowActive ? "bg-brand" : "hover:bg-white/[.06]"
        }`}
      >
        <Link
          href={item.href}
          className={`flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-[8px] text-[13.5px] ${
            rowActive
              ? "font-semibold text-white"
              : "font-medium text-white/[.62] hover:text-white"
          }`}
        >
          <span className={rowActive ? "text-white" : "text-white/50"}>
            <NavIcon name={item.icon} />
          </span>
          <span className="truncate">{translateNavLabel(item.label, t)}</span>
          {item.status === "v2" && (
            <span className="rounded-full border border-white/20 px-1.5 text-[9.5px] text-white/40">
              v2
            </span>
          )}
        </Link>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? t("a11y.collapse") : t("a11y.expand")}
          onClick={() => setOpen((v) => !v)}
          className={`mr-0.5 grid size-7 shrink-0 place-items-center rounded-md transition-colors ${
            rowActive
              ? "text-white/80 hover:bg-white/15 hover:text-white"
              : "text-white/40 hover:bg-white/10 hover:text-white"
          }`}
        >
          <NavChevron open={expanded} />
        </button>
      </div>
      {expanded ? (
        <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-2">
          {item.children.map((child) => (
            <NavLink
              key={child.href + child.label}
              item={child}
              active={isActive(pathname, child.href, allHrefs)}
              nested
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NavLink({
  item,
  active,
  nested,
}: {
  item: NavItem;
  active: boolean;
  nested?: boolean;
}) {
  const { t } = usePlatformT();

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-[8px] ${
        nested ? "text-[12.5px]" : "text-[13.5px]"
      } ${
        active
          ? nested
            ? "bg-white/15 font-semibold text-white"
            : "bg-brand font-semibold text-white"
          : "font-medium text-white/[.62] hover:bg-white/[.06] hover:text-white"
      }`}
    >
      <span className={active ? "text-white" : "text-white/50"}>
        <NavIcon name={item.icon} />
      </span>
      <span className="truncate">{translateNavLabel(item.label, t)}</span>
      {item.status === "v2" && (
        <span className="ml-auto rounded-full border border-white/20 px-1.5 text-[9.5px] text-white/40">
          v2
        </span>
      )}
    </Link>
  );
}

function isActive(pathname: string, href: string, allHrefs: string[]) {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !allHrefs.some(
    (h) =>
      h !== href &&
      h.length > href.length &&
      (pathname === h || pathname.startsWith(`${h}/`)),
  );
}
