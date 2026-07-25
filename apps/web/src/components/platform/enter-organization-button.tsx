"use client";

import { useTransition } from "react";
import { enterOrganizationAsPlatformOwner } from "@/lib/platform/actions";

/**
 * Opens the customer org workspace as Platform Owner (full manage access).
 */
export function EnterOrganizationButton({
  agencyId,
  label = "Open workspace",
  className,
}: {
  agencyId: string;
  label?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await enterOrganizationAsPlatformOwner(agencyId);
        })
      }
      className={
        className ??
        "rounded-lg bg-navy px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#162a45] disabled:opacity-60"
      }
    >
      {pending ? "Opening…" : label}
    </button>
  );
}
