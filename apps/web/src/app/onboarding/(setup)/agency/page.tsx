import { redirect } from "next/navigation";
import { getActiveContext, requireUser } from "@/lib/auth/session";
import { agencyHasPaidAccess } from "@/lib/billing/access";
import { isPlatformOwner } from "@/lib/platform/owner";
import { CreateAgencyForm } from "./form";

/**
 * Route: /onboarding/agency — step 2
 *
 * If the agency already exists (common after a stuck "Saving…" soft-nav), skip
 * ahead to the next wizard step instead of asking again.
 */
export default async function CreateAgencyStep() {
  const user = await requireUser();
  if (await isPlatformOwner(user.userId)) {
    redirect("/platform" as never);
  }

  const ctx = await getActiveContext();
  if (ctx) {
    if (await agencyHasPaidAccess(ctx.agencyId)) {
      redirect("/onboarding/client");
    }
    redirect("/onboarding/billing");
  }

  return <CreateAgencyForm />;
}
