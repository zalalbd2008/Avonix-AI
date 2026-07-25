"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "@/lib/auth/client";

type Props = {
  name: string | null;
  email: string;
  image: string | null;
};

/**
 * Top-right account control for Platform Owner shell:
 * avatar · dropdown with Dashboard, email, Sign out.
 */
export function PlatformUserMenu({ name, email, image }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const displayName = name?.trim() || email.split("@")[0] || "Owner";
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    setOpen(false);
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative ml-auto">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-transparent px-1.5 py-1 hover:border-line hover:bg-[#f8fafc]"
      >
        <span className="hidden text-right sm:block">
          <span className="block max-w-[140px] truncate text-[12.5px] font-semibold text-ink">
            {displayName}
          </span>
          <span className="block max-w-[140px] truncate text-[11px] text-faint">
            {email}
          </span>
        </span>
        <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-navy text-[13px] font-semibold text-white">
          {image ? (
            <Image
              src={image}
              alt=""
              width={32}
              height={32}
              className="size-8 object-cover"
              unoptimized
            />
          ) : (
            initial
          )}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className={`text-faint transition ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute top-[calc(100%+6px)] right-0 z-50 w-[240px] overflow-hidden rounded-xl border border-line bg-white shadow-[0_8px_28px_rgba(11,30,58,.12)]"
        >
          <div className="border-b border-[#edf0f5] px-3.5 py-3">
            <p className="truncate text-[13px] font-semibold">{displayName}</p>
            <p className="truncate text-[12px] text-muted">{email}</p>
            <p className="mt-1 text-[10.5px] font-semibold tracking-[0.06em] text-brand uppercase">
              Platform Owner
            </p>
          </div>
          <div className="p-1.5">
            <Link
              href={"/platform" as never}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink hover:bg-[#f5f7fa]"
            >
              <DashIcon />
              Dashboard
            </Link>
            <Link
              href={"/platform/settings" as never}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink hover:bg-[#f5f7fa]"
            >
              <GearIcon />
              Profile & settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-bad hover:bg-[#fff5f5]"
            >
              <LogoutIcon />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 7V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M15 12H3m0 0 3-3m-3 3 3 3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
