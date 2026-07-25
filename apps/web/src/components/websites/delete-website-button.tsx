"use client";

import { ConfirmDelete } from "@/components/confirm-delete";
import { deleteWebsite } from "@/lib/websites/actions";

export function DeleteWebsiteButton({
  websiteId,
  clientId,
  websiteName,
}: {
  websiteId: string;
  clientId: string;
  websiteName: string;
}) {
  return (
    <ConfirmDelete
      title={`Delete “${websiteName}”?`}
      description="This permanently deletes the website and its data from the database. The WordPress connector plugin will uninstall itself on the next heartbeat or admin visit."
      confirmLabel="Delete website"
      onConfirm={async () => {
        const result = await deleteWebsite(websiteId, clientId);
        if (!result.ok) return result;
        window.location.assign(`/clients/${clientId}/websites`);
        return { ok: true as const };
      }}
    />
  );
}
