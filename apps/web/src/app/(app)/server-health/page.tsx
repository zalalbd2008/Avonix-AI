import { NotBuilt } from "@/components/not-built";

/**
 * Route: /server-health
 *
 * The prototype showed CPU, memory, disk and per-region response times. None of
 * that exists: we do not host our clients' sites, and ADR-001 put site
 * monitoring out of scope for v1.
 */
export default function ServerHealthPage() {
  return (
    <NotBuilt
      title="Server health"
      subtitle="Uptime and infrastructure monitoring"
      lead="Not built yet"
      body="This would ping each connected site on a schedule and tell you when one
        stops answering. ADR-001 kept it out of v1 deliberately — monitoring is a
        product of its own, and a half-built uptime monitor that misses an outage
        is worse than none, because you stop checking yourself."
      planned={[
        "A ping every few minutes from more than one region",
        "SSL expiry warnings before the certificate lapses",
        "An alert when a site stops responding, not a dashboard you must watch",
      ]}
    />
  );
}
