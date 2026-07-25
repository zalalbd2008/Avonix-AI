"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

/** Route: /onboarding/plugin — download the WP connector zip */
function DownloadPlugin() {
  const key = useSearchParams().get("key");
  const [busy, setBusy] = useState(false);

  const nextHref = key
    ? (`/onboarding/connector?key=${encodeURIComponent(key)}` as const)
    : ("/onboarding/connector" as const);

  return (
    <>
      <h1 className="text-[19px] font-bold tracking-[-0.02em]">
        Download the connector
      </h1>
      <p className="mt-0.5 mb-4 text-[13px] text-muted">
        One WordPress plugin. Upload it on their site, then paste the key on the
        next step.
      </p>

      <div className="mb-4 rounded-xl border border-line bg-[#f7f8fb] px-4 py-3.5">
        <p className="text-[13px] font-semibold text-ink">
          Avonix AI Connector
        </p>
        <p className="mt-1 text-[12.5px] leading-[1.55] text-muted">
          Zip ready for{" "}
          <b className="font-semibold text-ink">
            Plugins → Add New → Upload Plugin
          </b>
          . Works with Local WP and any self-hosted WordPress.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            // Full navigation so the browser handles the attachment download.
            window.location.assign("/api/connector/download");
            setTimeout(() => setBusy(false), 1500);
          }}
          className="mt-3 w-full rounded-lg bg-brand py-2.5 text-[14px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? "Starting download…" : "Download plugin (.zip)"}
        </button>
      </div>

      <ol className="mb-5 list-inside list-decimal space-y-2 text-[13px] text-muted">
        <li>Download the zip above.</li>
        <li>
          In WordPress:{" "}
          <b className="text-ink">Plugins → Add New → Upload Plugin</b>.
        </li>
        <li>Activate <b className="text-ink">Avonix AI Connector</b>.</li>
        <li>Continue to paste your connector key.</li>
      </ol>

      <Link
        href={nextHref as never}
        className="block rounded-lg border border-line bg-white py-2.5 text-center text-[14px] font-semibold text-ink hover:bg-[#f7f8fb]"
      >
        Continue to install →
      </Link>
    </>
  );
}

export default function DownloadPluginStep() {
  return (
    <Suspense fallback={null}>
      <DownloadPlugin />
    </Suspense>
  );
}
