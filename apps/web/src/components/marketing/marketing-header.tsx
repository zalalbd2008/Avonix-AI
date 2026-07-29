"use client";

import Link from "next/link";
import { useState } from "react";
import { marketingNav } from "@/lib/nav";

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white">
      <div className="mx-auto flex h-[58px] max-w-[1200px] items-center gap-3 px-4 sm:gap-6 sm:px-7">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-brand font-bold text-white">
            A
          </span>
          <span className="text-[15.5px] font-bold tracking-tight">Avonix AI</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-5 md:flex">
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13.5px] font-medium text-muted hover:text-navy"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3.5">
          <Link
            href="/sign-in"
            className="hidden text-[13.5px] font-semibold text-muted hover:text-navy sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-brand px-3 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark sm:px-4"
          >
            Sign up
          </Link>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-lg text-ink hover:bg-surface md:hidden"
            aria-expanded={open}
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              {open ? (
                <path
                  d="M4 4l10 10M14 4L4 14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M2.5 4.5h13M2.5 9h13M2.5 13.5h13"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-line px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {marketingNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-[14px] font-medium text-muted hover:bg-surface hover:text-navy"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-[14px] font-semibold text-muted hover:bg-surface hover:text-navy sm:hidden"
            >
              Sign in
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
