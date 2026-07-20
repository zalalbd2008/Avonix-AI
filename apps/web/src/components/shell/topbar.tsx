import Link from "next/link";

export function Topbar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex h-[50px] shrink-0 items-center gap-3.5 border-b border-line bg-white px-4.5">
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="grid size-6.5 place-items-center rounded-md bg-brand text-sm font-bold text-white">
          A
        </span>
        <span className="text-[14.5px] font-bold tracking-tight">Avonix AI</span>
      </Link>
      <div className="h-5 w-px bg-line" />
      {children}
    </header>
  );
}
