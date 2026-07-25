import { requireVerifiedUser } from "@/lib/auth/session";

/**
 * Agency → connector steps require a confirmed email address.
 */
export default async function OnboardingSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireVerifiedUser();
  return children;
}
