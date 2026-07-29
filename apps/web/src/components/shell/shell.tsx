"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { SwitchableClient } from "@/lib/clients/switcher";
import { PlatformAccessBanner } from "@/components/platform/platform-access-banner";
import { AppSidebar } from "./app-sidebar";
import { CommandSearch } from "./command-search";
import { DocumentLocale } from "./document-locale";
import { PlatformI18nProvider } from "@/components/i18n/platform-i18n-provider";
import { ToastHost } from "./toast";
import { Topbar } from "./topbar";

/**
 * The app frame: 50px topbar + 225px navy sidebar beside the scrolling main.
 * Below `lg`, the sidebar becomes an overlay drawer so the main pane stays fluid.
 */
export function Shell({
  agencyName,
  role,
  locale,
  permissions,
  clients,
  truncated,
  organizationCount,
  platformAccess,
  children,
}: {
  agencyName: string;
  role: string;
  locale: string;
  permissions: string[] | "*";
  clients: SwitchableClient[];
  truncated: boolean;
  organizationCount: number;
  platformAccess?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setNavOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  return (
    <ToastHost>
      <PlatformI18nProvider locale={locale}>
        <DocumentLocale />
        <div className="flex h-dvh flex-col overflow-hidden text-sm">
          {platformAccess ? (
            <PlatformAccessBanner agencyName={agencyName} />
          ) : null}
          <Topbar
            agencyName={agencyName}
            role={platformAccess ? "Platform access" : role}
            clients={clients}
            organizationCount={platformAccess ? 1 : organizationCount}
            onSearch={() => setSearchOpen(true)}
            onMenu={() => setNavOpen(true)}
            signOutDisabled={platformAccess}
          />

          <div className="relative flex min-h-0 flex-1">
            {navOpen ? (
              <button
                type="button"
                aria-label="Close navigation"
                className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
                onClick={() => setNavOpen(false)}
              />
            ) : null}
            <AppSidebar
              clients={clients}
              truncated={truncated}
              permissions={permissions}
              onSearch={() => setSearchOpen(true)}
              mobileOpen={navOpen}
              onNavigate={() => setNavOpen(false)}
            />
            <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-[26px]">
              <div className="mx-auto w-full max-w-[1600px]">{children}</div>
            </main>
          </div>

          <CommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
      </PlatformI18nProvider>
    </ToastHost>
  );
}
