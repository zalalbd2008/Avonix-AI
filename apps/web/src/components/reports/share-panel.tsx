"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shell/toast";
import type { TrackedEventBranding } from "@/lib/db/schema";
import {
  clearBranding,
  createShareLink,
  saveBranding,
  setShareEnabled,
} from "@/lib/reports/actions";

/**
 * The share link and its white-label branding (spec §8, §8.5).
 *
 * Creating and revoking are separate: revoking keeps the slug, so a link turned
 * off and back on is the same URL the client already has. Minting a fresh one
 * would silently break a bookmark they were sent weeks ago.
 */
export function SharePanel({
  clientId,
  websiteId,
  appUrl,
  share,
}: {
  clientId: string;
  websiteId: string;
  appUrl: string;
  share: { slug: string; enabled: boolean; branding: TrackedEventBranding; maskIps: boolean } | null;
}) {
  const router = useRouter();
  const say = useToast();
  const [pending, setPending] = useState(false);
  const [branding, setBranding] = useState<TrackedEventBranding>(
    share?.branding ?? { logoUrl: null, footerCredit: "", phone: "", email: "" },
  );
  const [maskIps, setMaskIps] = useState(share?.maskIps ?? true);

  const url = share ? `${appUrl}/r/${share.slug}` : null;

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setPending(true);
    const result = await fn();
    setPending(false);
    say(result.ok ? done : (result.error ?? "That did not work."));
    if (result.ok) router.refresh();
  }

  if (!share) {
    return (
      <section className="mb-3.5 rounded-xl border border-line bg-white p-[18px]">
        <p className="mb-1.5 text-sm font-bold">Share this report</p>
        <p className="mb-3.5 text-[12.5px] leading-[1.5] text-muted">
          Creates a link your client can open without an account. It shows the
          same live numbers as this page — no login, read only, and you can turn
          it off at any time.
        </p>
        <button
          disabled={pending}
          onClick={() => run(() => createShareLink(clientId, websiteId), "Share link created")}
          className="cursor-pointer rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          Create share link
        </button>
      </section>
    );
  }

  return (
    <section className="mb-3.5 rounded-xl border border-line bg-white p-[18px]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold">Share this report</p>
        <span
          className={`rounded-full px-2.5 py-[3px] text-[11px] font-bold ${
            share.enabled ? "bg-[rgba(13,148,136,.1)] text-ok" : "bg-[#f1f4f8] text-muted"
          }`}
        >
          {share.enabled ? "LIVE" : "OFF"}
        </span>
      </div>

      <div className="mb-3.5 flex flex-wrap gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-[#dbe1ea] bg-[#f8fafc] px-3 py-2.5 font-mono text-[12.5px] text-[#3c4c66]">
          {url}
        </code>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url!);
              say("Link copied — your client can open it without logging in");
            } catch {
              say("Could not copy. Select the link and copy it by hand.");
            }
          }}
          className="shrink-0 cursor-pointer rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
        >
          Copy link
        </button>
        <button
          disabled={pending}
          onClick={() =>
            run(
              () => setShareEnabled(clientId, websiteId, !share.enabled),
              share.enabled ? "Link turned off" : "Link is live again",
            )
          }
          className="shrink-0 cursor-pointer rounded-lg border-[1.5px] border-[#dbe1ea] px-3.5 py-2 text-[13px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-60"
        >
          {share.enabled ? "Turn off" : "Turn on"}
        </button>
      </div>

      <div className="border-t border-[#edf0f5] pt-3.5">
        <p className="mb-3 text-[13px] font-semibold">
          Branding <span className="font-normal text-faint">— shown on the shared page</span>
        </p>

        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <Labelled label="Footer credit">
            <input
              value={branding.footerCredit}
              onChange={(e) => setBranding({ ...branding, footerCredit: e.target.value })}
              placeholder="Powered by Your Agency"
              className="w-full rounded-lg border border-[#dbe1ea] px-3 py-2.5 text-[13px] outline-none focus:border-brand"
            />
          </Labelled>
          <Labelled label="Phone">
            <input
              value={branding.phone}
              onChange={(e) => setBranding({ ...branding, phone: e.target.value })}
              className="w-full rounded-lg border border-[#dbe1ea] px-3 py-2.5 text-[13px] outline-none focus:border-brand"
            />
          </Labelled>
          <Labelled label="Email">
            <input
              value={branding.email}
              onChange={(e) => setBranding({ ...branding, email: e.target.value })}
              className="w-full rounded-lg border border-[#dbe1ea] px-3 py-2.5 text-[13px] outline-none focus:border-brand"
            />
          </Labelled>
        </div>

        <label className="mb-3.5 flex items-start gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={maskIps}
            onChange={(e) => setMaskIps(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Hide part of each visitor&apos;s IP address on the shared page.
            Your own report above is unaffected.
          </span>
        </label>

        <div className="flex flex-wrap gap-2.5">
          <button
            disabled={pending}
            onClick={() =>
              run(() => saveBranding(clientId, websiteId, branding, maskIps), "Branding updated")
            }
            className="cursor-pointer rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            Update branding
          </button>
          <button
            disabled={pending}
            onClick={() => {
              setBranding({ logoUrl: null, footerCredit: "", phone: "", email: "" });
              setMaskIps(true);
              return run(() => clearBranding(clientId, websiteId), "Branding removed");
            }}
            className="cursor-pointer rounded-lg border-[1.5px] border-bad px-3.5 py-2 text-[13px] font-semibold text-bad hover:bg-bad hover:text-white disabled:opacity-60"
          >
            Remove branding
          </button>
        </div>
      </div>
    </section>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}
