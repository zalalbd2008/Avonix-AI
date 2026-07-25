"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError, SubmitButton } from "@/components/ui/field";
import { acceptInviteAction } from "@/lib/team/actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <FormError message={error} />
      <SubmitButton
        type="button"
        pending={pending}
        pendingLabel="Joining…"
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await acceptInviteAction(token);
            if (!res.ok) {
              setError(res.error ?? "Could not accept.");
              return;
            }
            router.push("/dashboard");
            router.refresh();
          });
        }}
      >
        Accept invitation
      </SubmitButton>
    </div>
  );
}
