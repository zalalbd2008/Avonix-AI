import type { SwitchableClient, SwitchableWebsite } from "@/lib/clients/switcher";

/**
 * Which level of the tree a path is in.
 *
 * The prototype keeps this in component state (`level: 'platform' | 'client' |
 * 'website'`). Here the URL is the state, so this derives the same thing from
 * the path — one function, used by the sidebar and the breadcrumbs, so the two
 * can never disagree about where you are.
 */
export type Scope =
  | { kind: "agency" }
  | { kind: "client"; clientId: string }
  | { kind: "website"; clientId: string; websiteId: string };

/**
 * `/clients/new` is deliberately agency scope: there is no client yet, and a
 * client menu for one that does not exist is a menu of dead links.
 */
export function scopeOf(pathname: string): Scope {
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] !== "clients" || !parts[1] || parts[1] === "new") {
    return { kind: "agency" };
  }
  if (parts[2] === "websites" && parts[3] && parts[3] !== "new") {
    return { kind: "website", clientId: parts[1], websiteId: parts[3] };
  }
  return { kind: "client", clientId: parts[1] };
}

export type Named = {
  client?: SwitchableClient;
  website?: SwitchableWebsite;
};

/** Turn the ids in a scope into the names the shell displays. */
export function namesFor(scope: Scope, clients: SwitchableClient[]): Named {
  if (scope.kind === "agency") return {};

  const client = clients.find((c) => c.id === scope.clientId);
  if (scope.kind === "client") return { client };

  return { client, website: client?.websites.find((w) => w.id === scope.websiteId) };
}
