"use client";

import { useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { updateWebsiteUrl } from "@/lib/websites/actions";
import { isValidWebsiteUrl, WEBSITE_URL_ERROR } from "@/lib/websites/url";

/** Shown when a site has no usable URL — blocks the dashboard until fixed. */
export function FixWebsiteUrlForm({
  websiteId,
  clientId,
  currentUrl,
}: {
  websiteId: string;
  clientId: string;
  currentUrl: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const url = String(fd.get("url") ?? "");
    if (!isValidWebsiteUrl(url)) {
      setError(WEBSITE_URL_ERROR);
      return;
    }
    setPending(true);
    setError(null);
    const result = await updateWebsiteUrl(websiteId, clientId, fd);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-line bg-white p-6">
      <h1 className="text-[18px] font-bold text-ink">Valid website URL required</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        This site cannot open on the website dashboard until it has a valid
        address
        {currentUrl ? (
          <>
            . Current value: <code className="text-ink">{currentUrl}</code>
          </>
        ) : (
          "."
        )}
      </p>
      <form onSubmit={onSubmit} className="mt-5">
        <FormError message={error} />
        <Field
          label="Website address"
          name="url"
          required
          autoFocus
          defaultValue={currentUrl && isValidWebsiteUrl(currentUrl) ? currentUrl : ""}
          placeholder="harbourdental.com"
          inputMode="url"
          autoComplete="url"
        />
        <p className="mb-3 text-[12px] text-muted">
          Use a full domain like <b>example.com</b> or{" "}
          <b>https://example.com</b>.
        </p>
        <SubmitButton pending={pending}>Save & open dashboard</SubmitButton>
      </form>
    </div>
  );
}
