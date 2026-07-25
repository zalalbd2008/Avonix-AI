"use client";

import { ConfirmDelete } from "@/components/confirm-delete";
import { deleteClient } from "@/lib/clients/delete-actions";

export function DeleteClientButton({
  clientId,
  clientName,
  websiteCount,
  contactCount,
}: {
  clientId: string;
  clientName: string;
  websiteCount: number;
  contactCount: number;
}) {
  return (
    <ConfirmDelete
      title={`Delete “${clientName}”?`}
      description={`This permanently deletes the client and ${websiteCount} website${websiteCount === 1 ? "" : "s"} from the database${contactCount ? `, including ${contactCount} contact${contactCount === 1 ? "" : "s"}` : ""}. Connected WordPress plugins will uninstall themselves on the next check.`}
      confirmLabel="Delete client"
      onConfirm={async () => {
        const result = await deleteClient(clientId);
        if (!result.ok) return result;
        window.location.assign("/clients");
        return { ok: true as const };
      }}
    />
  );
}
