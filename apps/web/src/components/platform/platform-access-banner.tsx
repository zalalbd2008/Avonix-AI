"use client";

import { useTransition } from "react";
import { exitPlatformOrganizationAccess } from "@/lib/platform/actions";

/**
 * Banner shown while a Platform Owner is inside a customer org workspace.
 */
export function PlatformAccessBanner({ agencyName }: { agencyName: string }) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f3d9a8] bg-[#fff8eb] px-4 py-2 text-[12.5px]">
      <p className="min-w-0 font-medium text-[#8a5a00]">
        Platform Owner access — managing{" "}
        <span className="font-bold">{agencyName}</span>
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => exitPlatformOrganizationAccess())}
        className="shrink-0 rounded-md border border-[#e8c47a] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#8a5a00] hover:bg-[#fff3d6] disabled:opacity-60"
      >
        {pending ? "Leaving…" : "Back to Platform"}
      </button>
    </div>
  );
}
