import Link from "next/link";
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { timeAgo } from "@/components/ui/status-pill";
import { requireAgency } from "@/lib/auth/session";
import { db, withAgency } from "@/lib/db";
import {
  agencies,
  clients,
  connectorKeys,
  contacts,
  conversations,
  memberships,
  user,
  websites,
} from "@/lib/db/schema";
import { limitsFor } from "@/lib/plans";
import { isPlatformOwner } from "@/lib/platform/owner";
import { listAiKeyStatuses } from "@/lib/platform/ai-keys";

/**
 * Route: /super-admin — Organization overview (Operations → Overview).
 * Tenant-scoped snapshot + entity list. Not Platform Owner.
 */
export default async function SuperAdminPage() {
  const ctx = await requireAgency();
  const platformOwner = await isPlatformOwner(ctx.userId);
  const aiStatuses = platformOwner ? await listAiKeyStatuses() : [];
  const chatReady = aiStatuses.some(
    (s) =>
      (s.provider === "openrouter" ||
        s.provider === "anthropic" ||
        s.provider === "openai") &&
      s.source !== "none",
  );

  const [me] = await db
    .select({
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1);

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [
      [agency],
      clientRows,
      siteRows,
      [keyCount],
      [contactCount],
      [conversationCount],
      [memberCount],
    ] = await Promise.all([
      tx
        .select({
          name: agencies.name,
          slug: agencies.slug,
          plan: agencies.plan,
          status: agencies.status,
          createdAt: agencies.createdAt,
        })
        .from(agencies)
        .where(and(eq(agencies.id, ctx.agencyId), isNull(agencies.deletedAt)))
        .limit(1),
      tx
        .select({ id: clients.id, name: clients.name, createdAt: clients.createdAt })
        .from(clients)
        .where(isNull(clients.deletedAt))
        .orderBy(asc(clients.name)),
      tx
        .select({
          id: websites.id,
          clientId: websites.clientId,
          name: websites.name,
          url: websites.url,
          status: websites.status,
          lastSeenAt: websites.lastSeenAt,
        })
        .from(websites)
        .where(isNull(websites.deletedAt))
        .orderBy(desc(websites.createdAt)),
      tx
        .select({ n: count() })
        .from(connectorKeys)
        .where(isNull(connectorKeys.revokedAt)),
      tx.select({ n: count() }).from(contacts),
      tx.select({ n: count() }).from(conversations),
      tx.select({ n: count() }).from(memberships),
    ]);

    return {
      agency,
      clientRows,
      siteRows,
      keys: keyCount.n,
      contacts: contactCount.n,
      conversations: conversationCount.n,
      members: memberCount.n,
    };
  });

  const plan = limitsFor(data.agency.plan);

  const rows: { type: string; tone: string; name: string; meta: string; href: string }[] = [
    {
      type: "Organization",
      tone: "bg-[rgba(255,102,0,.1)] text-brand",
      name: data.agency.name,
      meta: `${data.clientRows.length} clients · ${data.siteRows.length} websites · ${plan.label} · ${data.agency.status}`,
      href: "/settings",
    },
    ...data.clientRows.map((c) => ({
      type: "Client",
      tone: "bg-[rgba(13,148,136,.1)] text-ok",
      name: c.name,
      meta: `added ${timeAgo(c.createdAt)}`,
      href: `/clients/${c.id}`,
    })),
    ...data.siteRows.map((s) => ({
      type: "Website",
      tone: "bg-[#f1f4f8] text-muted",
      name: s.name,
      meta: `${s.url} · ${s.status}${s.lastSeenAt ? ` · seen ${timeAgo(s.lastSeenAt)}` : ""}`,
      href: `/clients/${s.clientId}/websites/${s.id}`,
    })),
  ];

  return (
    <div>
      <PageHeader
        title="Organization overview"
        subtitle="Account, workspace snapshot, and every record in this agency"
      />

      {platformOwner ? (
        <section className="mb-4 rounded-xl border border-brand/25 bg-[rgba(255,102,0,.05)] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11.5px] font-semibold tracking-[0.07em] text-brand uppercase">
                Platform Super Admin
              </p>
              <h2 className="mt-1 text-[16px] font-semibold text-ink">
                API Configuration
              </h2>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">
                {chatReady
                  ? "Provider keys are set. Live Chat can answer on all connected sites."
                  : "Add an OpenRouter (or Anthropic) API key once — every website Live Chat uses it."}
              </p>
            </div>
            <Link
              href={"/platform/ai" as never}
              className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
            >
              {chatReady ? "Manage API keys" : "Configure API keys"}
            </Link>
          </div>
        </section>
      ) : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <p className="text-[11.5px] font-semibold tracking-[0.07em] text-faint uppercase">
            Account overview
          </p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Meta
              label="Email status"
              value={me?.emailVerified ? "Verified" : "Unverified"}
              tone={me?.emailVerified ? "ok" : "warn"}
            />
            <Meta label="Member since" value={formatDate(me?.createdAt)} />
            <Meta label="Your role" value={capitalize(ctx.role)} />
            <Meta label="Signed in as" value={ctx.userEmail} />
            <Meta label="Plan" value={plan.label} />
            <Meta label="Agency status" value={capitalize(data.agency.status)} />
            <Meta label="Organizations" value={String(ctx.organizationCount)} />
            <Meta label="Identifier" value={data.agency.slug} mono />
          </dl>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <p className="text-[11.5px] font-semibold tracking-[0.07em] text-faint uppercase">
            Quick links
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <QuickLink href="/settings" label="Settings" hint="Agency data & security" />
            <QuickLink href="/settings/members" label="Role Management" hint="Team & permissions" />
            <QuickLink href="/organizations" label="Organizations" hint="Switch or create" />
            <QuickLink href="/billing" label="Plan & billing" hint="Subscription & invoices" />
            <QuickLink href="/websites" label="Websites" hint="All connected sites" />
            <QuickLink href="/settings/branding" label="Branding" hint="White-label (v2)" />
          </div>
        </section>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { value: data.clientRows.length, label: "Clients" },
          { value: data.siteRows.length, label: "Websites" },
          { value: data.members, label: "Members" },
          { value: data.keys, label: "Active keys" },
          { value: data.contacts, label: "Contacts" },
          { value: data.conversations, label: "Conversations" },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-[10px] border border-line bg-white px-4 pt-4 pb-3.5"
          >
            <div className="text-2xl font-bold tracking-[-0.02em]">{m.value}</div>
            <div className="mt-[3px] text-[12.5px] text-muted">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-[rgba(220,38,38,.25)] bg-[rgba(220,38,38,.06)] px-3.5 py-[11px] text-[13px]">
        <span className="mt-1 size-2 shrink-0 rounded-full bg-bad" />
        <span>
          This page is scoped to <b>your agency</b> only (RLS). Avonix{" "}
          <b>Platform Owner</b> control is separate at{" "}
          <Link href={"/platform" as never} className="font-semibold text-brand hover:underline">
            /platform
          </Link>{" "}
          — bootstrapped with{" "}
          <code className="text-ink">npm run platform:bootstrap</code>, never via
          public signup (ADR-012).
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="border-b border-[#edf0f5] px-4 py-[13px] text-sm font-semibold">
          Entities
        </div>
        {rows.map((r) => (
          <Link
            key={`${r.type}-${r.href}-${r.name}`}
            href={r.href as never}
            className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-3 last:border-0 hover:bg-[#f8fafc]"
          >
            <span
              className={`w-[92px] shrink-0 rounded-full px-2 py-[3px] text-center text-[10.5px] font-bold tracking-[0.05em] uppercase ${r.tone}`}
            >
              {r.type}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-semibold">{r.name}</span>
              <span className="block truncate text-[12px] text-muted">{r.meta}</span>
            </span>
            <span className="ml-auto shrink-0 text-[#c3ccd9]">›</span>
          </Link>
        ))}
      </div>

      <p className="mt-3 text-[12px] text-faint">
        Editing and deleting from this list are not wired up. Deleting a client
        cascades through every contact and conversation under it, so it waits on
        a confirmation step worth trusting.
      </p>
    </div>
  );
}

function Meta({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11.5px] font-medium text-faint">{label}</dt>
      <dd
        className={`mt-0.5 text-[13.5px] font-semibold break-all ${
          mono ? "font-mono text-[12.5px]" : ""
        } ${
          tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function QuickLink({
  href,
  label,
  hint,
}: {
  href: string;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href as never}
      className="flex items-center justify-between gap-2 rounded-lg border border-[#e6ebf3] bg-[#f8fafc] px-3.5 py-2.5 hover:border-[#c7d2fe] hover:bg-white"
    >
      <span>
        <span className="block text-[13px] font-semibold text-ink">{label}</span>
        <span className="block text-[11.5px] text-faint">{hint}</span>
      </span>
      <span className="text-[12px] text-faint">→</span>
    </Link>
  );
}

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
