"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ConnectorKeyPanel } from "@/components/connector-key";

/** Route: /onboarding/connector — paste key + finish install */
function InstallConnector() {
  const key = useSearchParams().get("key");

  return (
    <>
      <h1 className="text-[19px] font-bold tracking-[-0.02em]">
        Connect WordPress
      </h1>
      <p className="mt-0.5 mb-4 text-[13px] text-muted">
        Paste this key into the plugin, test the connection, and you&apos;re
        done.
      </p>

      {key && <ConnectorKeyPanel value={key} />}

      <ol className="mt-4 mb-5 list-inside list-decimal space-y-2 text-[13px] text-muted">
        <li>
          Open <b className="text-ink">Settings → Avonix AI</b> in WordPress.
        </li>
        <li>Paste the connector key above.</li>
        <li>
          Set the endpoint to{" "}
          <code className="rounded bg-[#f1f4f8] px-1.5 py-0.5 text-[12px] text-ink">
            http://127.0.0.1:3000
          </code>{" "}
          on Local WP (same Mac). Keep Avonix running with{" "}
          <code className="rounded bg-[#f1f4f8] px-1.5 py-0.5 text-[12px] text-ink">
            npm run dev
          </code>
          .
        </li>
        <li>
          Press <b className="text-ink">Test connection</b>.
        </li>
        <li>
          Optional: add{" "}
          <code className="rounded bg-[#f1f4f8] px-1.5 py-0.5 text-[12px] text-ink">
            [avonix_form]
          </code>{" "}
          or{" "}
          <code className="rounded bg-[#f1f4f8] px-1.5 py-0.5 text-[12px] text-ink">
            [avonix_chat]
          </code>{" "}
          to a page; enable chat in settings for the bubble.
        </li>
      </ol>

      <p className="mb-4 text-[12.5px] text-muted">
        Need the zip again?{" "}
        <a
          href="/api/connector/download"
          className="font-semibold text-brand hover:underline"
        >
          Download plugin
        </a>
        .
      </p>

      <Link
        href="/onboarding/done"
        className="block rounded-lg bg-brand py-2.5 text-center text-[14px] font-semibold text-white hover:bg-brand-dark"
      >
        I&apos;ve installed it
      </Link>
    </>
  );
}

export default function InstallConnectorStep() {
  return (
    <Suspense fallback={null}>
      <InstallConnector />
    </Suspense>
  );
}
