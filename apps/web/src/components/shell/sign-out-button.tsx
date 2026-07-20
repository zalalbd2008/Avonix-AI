"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/sign-in");
        router.refresh();
      }}
      className="cursor-pointer text-[12.5px] font-medium text-faint hover:text-ink"
    >
      Sign out
    </button>
  );
}
