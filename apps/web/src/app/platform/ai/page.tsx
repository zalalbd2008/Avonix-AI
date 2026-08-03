import { PageHeader } from "@/components/shell/page-header";
import { PlatformAiKeysForm } from "@/components/platform/platform-ai-keys-form";
import { requirePlatformOwner } from "@/lib/auth/session";
import { listAiKeyStatuses } from "@/lib/platform/ai-keys";

/**
 * Route: /platform/ai — Platform Super Admin API configuration.
 * One OpenRouter (or Anthropic) key here powers Live Chat for all sites.
 */
export default async function PlatformAiPage() {
  await requirePlatformOwner();
  const statuses = await listAiKeyStatuses();

  return (
    <div>
      <PageHeader
        title="API Configuration"
        subtitle="Super Admin — add provider keys so Live Chat works on every connected website"
      />

      <ol className="mb-5 max-w-2xl list-decimal space-y-1.5 rounded-xl border border-line bg-white px-5 py-4 pl-9 text-[13px] leading-relaxed text-muted">
        <li>
          Get an API key from{" "}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand hover:underline"
          >
            openrouter.ai/keys
          </a>{" "}
          (recommended) or Anthropic.
        </li>
        <li>Paste it below and click Save.</li>
        <li>
          Open any website’s Live Chat studio → ensure the widget is Published /
          Live. Visitors can chat immediately.
        </li>
      </ol>

      <PlatformAiKeysForm statuses={statuses} />

      <p className="mt-6 max-w-2xl text-[12px] leading-relaxed text-faint">
        Keys are encrypted in the database (AES-GCM via{" "}
        <code>PLATFORM_SECRETS_KEY</code> or <code>BETTER_AUTH_SECRET</code>).
        Server env vars remain a fallback. Azure / custom base URLs still use{" "}
        <code>AZURE_OPENAI_ENDPOINT</code> / <code>CUSTOM_LLM_BASE_URL</code>.
      </p>
    </div>
  );
}
