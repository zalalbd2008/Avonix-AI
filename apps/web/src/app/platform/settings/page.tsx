import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { PlatformAiKeysForm } from "@/components/platform/platform-ai-keys-form";
import { requirePlatformOwner } from "@/lib/auth/session";
import { listAiKeyStatuses } from "@/lib/platform/ai-keys";

/**
 * Route: /platform/settings — Platform Super Admin settings hub.
 * API keys are the primary control for Live Chat AI.
 */
export default async function PlatformSettingsPage() {
  await requirePlatformOwner();
  const statuses = await listAiKeyStatuses();
  const chatReady = statuses.some(
    (s) =>
      (s.provider === "openrouter" ||
        s.provider === "anthropic" ||
        s.provider === "openai") &&
      s.source !== "none",
  );

  return (
    <div>
      <PageHeader
        title="Platform Settings"
        subtitle="Super Admin controls — API keys, integrations, and platform defaults"
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={"/platform/ai" as never}
          className="rounded-xl border border-line bg-white px-4 py-3.5 transition hover:border-brand/40"
        >
          <p className="text-[13px] font-semibold text-ink">API Configuration</p>
          <p className="mt-1 text-[12px] text-muted">
            {chatReady
              ? "Chat providers configured"
              : "Add OpenRouter / Anthropic keys"}
          </p>
        </Link>
        <div className="rounded-xl border border-dashed border-line bg-[#fafbfd] px-4 py-3.5">
          <p className="text-[13px] font-semibold text-ink">Email / SMTP</p>
          <p className="mt-1 text-[12px] text-faint">Coming soon</p>
        </div>
        <div className="rounded-xl border border-dashed border-line bg-[#fafbfd] px-4 py-3.5">
          <p className="text-[13px] font-semibold text-ink">Payments</p>
          <p className="mt-1 text-[12px] text-faint">Coming soon</p>
        </div>
      </div>

      <h2 className="mb-3 text-[14px] font-semibold text-ink">
        API Configuration
      </h2>
      <PlatformAiKeysForm statuses={statuses} />
    </div>
  );
}
