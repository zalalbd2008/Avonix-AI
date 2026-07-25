import { redirect } from "next/navigation";
import { requireAgency } from "@/lib/auth/session";
import { NewOrganizationForm } from "./form";

/**
 * Route: /organizations/new
 * Platform Owners create complimentary orgs from /platform/workspaces/new.
 */
export default async function NewOrganizationPage() {
  const ctx = await requireAgency();
  if (ctx.platformAccess) {
    redirect("/platform/workspaces/new" as never);
  }
  return <NewOrganizationForm />;
}
