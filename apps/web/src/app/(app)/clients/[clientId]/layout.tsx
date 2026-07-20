import { Sidebar } from "@/components/shell/sidebar";
import { clientNav } from "@/lib/nav";
import Link from "next/link";

/**
 * Client scope. Replaces the agency sidebar with this client's menu, so a
 * conversation is never ambiguous about which client it belongs to.
 */
export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  return (
    <div className="-m-6 flex h-full min-h-0">
      <Sidebar sections={clientNav(clientId)}>
        <Link
          href="/clients"
          className="px-3 pt-0.5 pb-2 text-xs text-white/50 hover:text-white"
        >
          ← All clients
        </Link>
      </Sidebar>
      <div className="min-w-0 flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}
