import { PageHeader } from "@/components/shell/page-header";
import { PlatformAiKeysForm } from "@/components/platform/platform-ai-keys-form";
import { requirePlatformOwner } from "@/lib/auth/session";
import { listAiKeyStatuses } from "@/lib/platform/ai-keys";

/**
 * Route: /platform/ai — Platform Owner AI Center (API keys for Live Chat).
 * Org “Super Admin” is tenant-scoped; AI keys live here (cross-tenant).
 */
export default async function PlatformAiPage() {
  await requirePlatformOwner();
  const statuses = await listAiKeyStatuses();

  return (
    <div>
      <PageHeader
        title="AI Center"
        subtitle="Platform API keys for Live Chat and AI features"
      />
      <PlatformAiKeysForm statuses={statuses} />
      <p className="mt-6 max-w-2xl text-[12px] leading-relaxed text-faint">
        Azure endpoint / custom base URL still come from env (
        <code>AZURE_OPENAI_ENDPOINT</code>, <code>CUSTOM_LLM_BASE_URL</code>).
        Encryption uses <code>PLATFORM_SECRETS_KEY</code> or{" "}
        <code>BETTER_AUTH_SECRET</code>.
      </p>
    </div>
  );
}
