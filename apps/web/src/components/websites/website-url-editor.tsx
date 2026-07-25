"use client";

import { useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { updateWebsiteUrl } from "@/lib/websites/actions";
import { isValidWebsiteUrl, WEBSITE_URL_ERROR } from "@/lib/websites/url";

export function WebsiteUrlEditor({
  websiteId,
  clientId,
  currentUrl,
}: {
  websiteId: string;
  clientId: string;
  currentUrl: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const url = String(fd.get("url") ?? "");
    if (!isValidWebsiteUrl(url)) {
      setError(WEBSITE_URL_ERROR);
      setMsg(null);
      return;
    }
    setPending(true);
    setError(null);
    setMsg(null);
    const result = await updateWebsiteUrl(websiteId, clientId, fd);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMsg(`Saved as ${result.url}`);
  }

  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-line bg-white">
      <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
        Website address
      </h2>
      <form onSubmit={onSubmit} className="px-4 py-4">
        <FormError message={error} />
        {msg ? (
          <p className="mb-3 rounded-lg bg-[#f0fdf9] px-3 py-2 text-[12.5px] text-ok">
            {msg}
          </p>
        ) : null}
        <Field
          label="URL"
          name="url"
          required
          defaultValue={currentUrl}
          placeholder="harbourdental.com"
          inputMode="url"
          autoComplete="url"
        />
        <p className="mb-3 -mt-2 text-[12px] text-muted">
          Must be a valid domain. The website dashboard stays locked without one.
        </p>
        <div className="w-40">
          <SubmitButton pending={pending}>Update URL</SubmitButton>
        </div>
      </form>
    </section>
  );
}
