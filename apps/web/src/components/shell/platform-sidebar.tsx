"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  flattenNavHrefs,
  platformNav,
  type NavItem,
  type NavSection,
} from "@/lib/nav";
import { NavChevron } from "./nav-chevron";
import { NavIcon } from "./nav-icons";

/**
 * Platform Owner sidebar — Accounts + Operations (ADR-012).
 * Settings sits at the bottom after a divider.
 */
export function PlatformSidebar() {
  const pathname = usePathname();
  const sections = platformNav;
  const allHrefs = flattenNavHrefs(sections);
  const bodySections = sections.filter((s) => Boolean(s.title));
  const footerSections = sections.filter((s) => !s.title);

  return (
    <nav className="flex w-[225px] shrink-0 flex-col overflow-y-auto bg-navy p-[12px_10px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Link
        href={"/platform" as never}
        className="mb-1 px-3 pt-1 text-[13px] font-bold tracking-tight text-white"
      >
        Avonix AI
      </Link>
      <p className="mb-3 px-3 text-[10.5px] font-semibold tracking-[0.08em] text-white/35 uppercase">
        Platform Owner
      </p>

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
  return (
    <div className="flex flex-col gap-0.5">
      {showDividerAbove ? <div className="mx-2 my-2.5 border-t border-white/10" /> : null}
      {section.title ? (
        <div className="px-3 pt-1 pb-1.5 text-[11px] font-semibold tracking-[0.04em] text-white/40">
          {section.title}
        </div>
      ) : null}
      {section.items.map((item) => (
        <PlatformBranch
          key={item.href + item.label}
          item={item}
          pathname={pathname}
          allHrefs={allHrefs}
          depth={0}
        />
      ))}
    </div>
  );
}

function PlatformBranch({
  item,
  pathname,
  allHrefs,
  depth,
}: {
  item: NavItem;
  pathname: string;
  allHrefs: string[];
  depth: number;
}) {
  const descendantActive = hasActiveDescendant(item, pathname, allHrefs);
  const selfActive = pathActive(pathname, item.href, allHrefs) && !descendantActive;
  const [open, setOpen] = useState(false);

  if (!item.children?.length) {
    return (
      <SideLink
        item={item}
        active={pathActive(pathname, item.href, allHrefs)}
        depth={depth}
      />
    );
  }

  const rowActive = selfActive || descendantActive;

  return (
    <div>
      <div
        className={`flex items-center gap-0.5 rounded-md ${
          rowActive ? "bg-brand" : "hover:bg-white/[.06]"
        }`}
      >
        <Link
          href={item.href as never}
          className={`flex min-w-0 flex-1 items-center gap-2.5 py-[8px] text-[13.5px] ${
            depth > 0 ? "pl-2.5" : "px-2.5"
          } ${
            rowActive
              ? "font-semibold text-white"
              : "font-medium text-white/[.62] hover:text-white"
          }`}
        >
          <span className={rowActive ? "text-white" : "text-white/50"}>
            <NavIcon name={item.icon} />
          </span>
          <span className="truncate">{item.label}</span>
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Collapse" : "Expand"}
          onClick={() => setOpen((v) => !v)}
          className={`mr-0.5 grid size-7 shrink-0 place-items-center rounded-md transition-colors ${
            rowActive
              ? "text-white/80 hover:bg-white/15 hover:text-white"
              : "text-white/40 hover:bg-white/10 hover:text-white"
          }`}
        >
          <NavChevron open={open} />
        </button>
      </div>
      {open ? (
        <div
          className={`mt-0.5 flex flex-col gap-0.5 border-l border-white/10 ${
            depth === 0 ? "ml-3 pl-2" : "ml-4 pl-2"
          }`}
        >
          {item.label === "Websites" ? (
            <div className="px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-white/35 uppercase">
              Website Workspace
            </div>
          ) : null}
          {item.children.map((child) => (
            <PlatformBranch
              key={child.href + child.label}
              item={child}
              pathname={pathname}
              allHrefs={allHrefs}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SideLink({
  item,
  active,
  depth,
}: {
  item: NavItem;
  active: boolean;
  depth: number;
}) {
  const nested = depth > 0;
  return (
    <Link
      href={item.href as never}
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
      <span className="truncate">{item.label}</span>
      {item.status === "v2" && (
        <span className="ml-auto rounded-full border border-white/20 px-1.5 text-[9.5px] text-white/40">
          v2
        </span>
      )}
    </Link>
  );
}

function hasActiveDescendant(
  item: NavItem,
  pathname: string,
  allHrefs: string[],
): boolean {
  for (const child of item.children ?? []) {
    if (pathActive(pathname, child.href, allHrefs)) return true;
    if (hasActiveDescendant(child, pathname, allHrefs)) return true;
  }
  return false;
}

function pathActive(pathname: string, href: string, allHrefs: string[]) {
  if (pathname === href) return true;
  if (href === "/platform") return false;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !allHrefs.some(
    (h) =>
      h !== href &&
      h.length > href.length &&
      (pathname === h || pathname.startsWith(`${h}/`)),
  );
}
