import { MarketingHeader } from "@/components/marketing/marketing-header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <MarketingHeader />
      <main className="w-full">{children}</main>
      <footer className="border-t border-line px-4 py-6 text-center text-[12.5px] text-faint">
        Avonix AI — one dashboard for every client&apos;s leads
      </footer>
    </div>
  );
}
