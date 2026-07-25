"use client";

import { useRouter } from "next/navigation";
import { usePlatformT } from "@/components/i18n/platform-i18n-provider";
import { signOut } from "@/lib/auth/client";

export function SignOutButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const { t } = usePlatformT();

  return (
    <button
      type="button"
      disabled={disabled}
      title={
        disabled
          ? "Leave this organization first (Back to Platform), then sign out"
          : undefined
      }
      onClick={async () => {
        if (disabled) return;
        await signOut();
        router.push("/sign-in");
        router.refresh();
      }}
      className={
        disabled
          ? "cursor-not-allowed text-[12.5px] font-medium text-faint/40"
          : "cursor-pointer text-[12.5px] font-medium text-faint hover:text-ink"
      }
    >
      {t("shell.signOut")}
    </button>
  );
}
