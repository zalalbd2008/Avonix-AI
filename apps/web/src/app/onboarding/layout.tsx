import { requireUser } from "@/lib/auth/session";
import { OnboardingSteps } from "./steps";

/**
 * The wizard shell — signed in required.
 * Email verification is enforced by the `(setup)` route group layout.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-[560px] rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
        <OnboardingSteps />
        {children}
      </div>
    </div>
  );
}
