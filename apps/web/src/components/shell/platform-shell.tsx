"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PlatformSidebar } from "@/components/shell/platform-sidebar";
import { PlatformUserMenu } from "@/components/shell/platform-user-menu";

/**
 * Platform Owner chrome — mirrors agency shell: drawer nav below `lg`.
 */
export function PlatformShell({
  ownerName,
  ownerEmail,
  ownerImage,
  children,
}: {
  ownerName: string | null;
  ownerEmail: string;
  ownerImage: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setNavOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface text-ink text-sm">
      <header className="relative z-30 flex h-[50px] shrink-0 items-center gap-2 border-b border-line bg-white px-3 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
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
        <Link href={"/platform" as never} className="flex items-center gap-2">
          <span className="grid size-[26px] place-items-center rounded-[7px] bg-brand text-sm font-bold text-white">
            A
          </span>
          <span className="hidden text-[14px] font-bold tracking-tight sm:inline">
            Avonix Platform
          </span>
        </Link>
        <span className="hidden rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand sm:inline">
          Platform Owner
        </span>
        <PlatformUserMenu
          name={ownerName}
          email={ownerEmail}
          image={ownerImage}
        />
      </header>
      <div className="relative flex min-h-0 flex-1">
        {navOpen ? (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
            onClick={() => setNavOpen(false)}
          />
        ) : null}
        <PlatformSidebar mobileOpen={navOpen} />
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-[26px]">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
