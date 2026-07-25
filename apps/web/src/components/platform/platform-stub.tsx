import { NotBuilt } from "@/components/not-built";

/** Shared stub for Platform Owner sections not yet built. */
export function PlatformStub({
  title,
  subtitle,
  planned,
}: {
  title: string;
  subtitle: string;
  planned?: string[];
}) {
  return (
    <NotBuilt
      title={title}
      subtitle={subtitle}
      lead="Platform module not built yet"
      body="This screen is reserved for Platform Owners. Cross-tenant data will load through the admin database role — never through the tenant app connection."
      planned={planned}
      backHref={"/platform" as never}
      backLabel="← Platform dashboard"
    />
  );
}
