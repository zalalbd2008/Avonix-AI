"use client";

import { useEffect, useState } from "react";
import type { SwitchableClient } from "@/lib/clients/switcher";
import { PlatformAccessBanner } from "@/components/platform/platform-access-banner";
import { AppSidebar } from "./app-sidebar";
import { CommandSearch } from "./command-search";
import { DocumentLocale } from "./document-locale";
import { PlatformI18nProvider } from "@/components/i18n/platform-i18n-provider";
import { ToastHost } from "./toast";
import { Topbar } from "./topbar";

/**
 * The app frame, in the prototype's arrangement: a 50px bar across the full
 * width, and below it a 225px navy column beside the scrolling main area.
 *
 * Search state lives here because two things open it — the top bar button and
 * the sidebar's ⌘K box — and the keyboard shortcut belongs to neither.
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
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ToastHost>
      <PlatformI18nProvider locale={locale}>
        <DocumentLocale />
        <div className="flex h-screen flex-col overflow-hidden text-sm">
        {platformAccess ? (
          <PlatformAccessBanner agencyName={agencyName} />
        ) : null}
        <Topbar
          agencyName={agencyName}
          role={platformAccess ? "Platform access" : role}
          clients={clients}
          organizationCount={platformAccess ? 1 : organizationCount}
          onSearch={() => setSearchOpen(true)}
          signOutDisabled={platformAccess}
        />

        <div className="flex min-h-0 flex-1">
          <AppSidebar
            clients={clients}
            truncated={truncated}
            permissions={permissions}
            onSearch={() => setSearchOpen(true)}
          />
          {/*
            Equal left/right padding — content fills the main pane so the
            left and right gaps stay matched (no left-aligned 1060px cap).
          */}
          <main className="min-w-0 flex-1 overflow-y-auto px-6 py-[26px]">
            <div className="w-full">{children}</div>
          </main>
        </div>

        <CommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
      </PlatformI18nProvider>
    </ToastHost>
  );
}
