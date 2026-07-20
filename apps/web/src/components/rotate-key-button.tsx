"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectorKeyPanel } from "./connector-key";
import { rotateKey } from "@/lib/websites/actions";

export function RotateKeyButton({ websiteId }: { websiteId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (issued) {
    return (
      <div className="w-[460px]">
        <ConnectorKeyPanel value={issued} />
      </div>
    );
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="cursor-pointer rounded-lg border-[1.5px] border-[#dbe1ea] px-3.5 py-2 text-[12.5px] font-semibold text-muted hover:border-brand hover:text-brand"
      >
        Rotate key
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      {/* Rotation breaks the live site until the new key is installed, so it asks first. */}
      <span className="text-[12.5px] text-muted">
        This stops the current plugin working until the new key is installed.
      </span>
      <button
        onClick={async () => {
          setPending(true);
          const result = await rotateKey(websiteId);
          setPending(false);
          if (result.ok) {
            setIssued(result.connectorKey);
            router.refresh();
          } else {
            setConfirming(false);
          }
        }}
        disabled={pending}
        className="cursor-pointer rounded-lg bg-bad px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Rotating…" : "Rotate"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="cursor-pointer text-[12.5px] font-medium text-muted hover:text-ink"
      >
        Cancel
      </button>
    </div>
  );
}
