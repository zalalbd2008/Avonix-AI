"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavSection } from "@/lib/nav";

export function Sidebar({
  sections,
  heading,
  children,
}: {
  sections: NavSection[];
  heading?: string;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-0.5 overflow-y-auto bg-navy p-2.5">
      {children}
      {heading && (
        <div className="px-3 pt-1 pb-1.5 text-[10.5px] font-semibold tracking-[0.09em] text-brand uppercase">
          {heading}
        </div>
      )}
      {sections.map((section, i) => (
        <div key={i} className="mb-1">
          {section.title && (
            <div className="px-3 pt-3 pb-1.5 text-[10.5px] font-semibold tracking-[0.09em] text-brand uppercase">
              {section.title}
            </div>
          )}
          {section.items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13.5px] transition-colors ${
                  active
                    ? "bg-brand font-semibold text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {item.label}
                {item.status === "v2" && (
                  <span className="ml-auto rounded-full border border-white/20 px-1.5 text-[9.5px] text-white/40">
                    v2
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
