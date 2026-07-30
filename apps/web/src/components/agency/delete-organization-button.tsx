"use client";

import { ConfirmDelete } from "@/components/confirm-delete";
import { deleteOrganization } from "@/lib/agency/delete-actions";

export function DeleteOrganizationButton({
  agencyId,
  orgName,
}: {
  agencyId: string;
  orgName: string;
}) {
  return (
    <ConfirmDelete
      title={`Delete organization “${orgName}”?`}
      description="This permanently deletes the organization and all of its data — clients, websites, forms, leads, invites, and member logins that belong only to this org. Connected WordPress plugins will uninstall on the next check. Stripe billing history stays with Stripe. This cannot be undone."
      confirmLabel="Delete organization"
      triggerLabel="Delete"
      triggerClassName="text-[13px] font-semibold text-faint hover:text-bad"
      onConfirm={async () => {
        const result = await deleteOrganization(agencyId);
        if (!result.ok) return result;
        window.location.assign(
          result.accountDeleted ? "/sign-in" : "/organizations",
        );
        return { ok: true as const };
      }}
    />
  );
}
