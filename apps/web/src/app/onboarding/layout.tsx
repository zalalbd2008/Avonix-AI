import { onboardingSteps } from "@/lib/nav";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-[560px] rounded-2xl border border-line bg-white p-7 shadow-sm">
        <ol className="mb-6 flex gap-1.5">
          {onboardingSteps.map((step, i) => (
            <li key={step.href} className="flex flex-1 flex-col items-center gap-1.5 text-center">
              <span className="grid size-5.5 place-items-center rounded-full bg-line text-[11px] font-bold text-faint">
                {i + 1}
              </span>
              <span className="text-[11px] text-faint">{step.label}</span>
            </li>
          ))}
        </ol>
        {children}
      </div>
    </div>
  );
}
