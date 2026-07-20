import Link from "next/link";
import { marketingNav } from "@/lib/nav";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex h-[58px] items-center gap-6 border-b border-line bg-white px-7">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-brand font-bold text-white">
            A
          </span>
          <span className="text-[15.5px] font-bold tracking-tight">Avonix AI</span>
        </Link>
        <nav className="flex items-center gap-5">
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
        <div className="ml-auto flex items-center gap-3.5">
          <Link href="/sign-in" className="text-[13.5px] font-semibold text-muted hover:text-navy">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            Sign up
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-line py-6 text-center text-[12.5px] text-faint">
        Avonix AI — one dashboard for every client&apos;s leads
      </footer>
    </div>
  );
}
