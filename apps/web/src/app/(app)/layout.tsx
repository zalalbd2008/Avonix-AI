import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { agencyNav } from "@/lib/nav";

/** Shell for everything inside the agency. Auth guard lands here (ADR-004). */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden text-sm">
      <Topbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar sections={agencyNav} heading="Agency" />
        <main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
