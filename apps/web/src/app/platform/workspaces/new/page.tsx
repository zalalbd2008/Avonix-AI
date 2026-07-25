import { requirePlatformOwner } from "@/lib/auth/session";
import { CreatePlatformOrganizationForm } from "@/components/platform/create-platform-organization-form";

/** Route: /platform/workspaces/new */
export default async function NewPlatformOrganizationPage() {
  await requirePlatformOwner();
  return <CreatePlatformOrganizationForm />;
}
