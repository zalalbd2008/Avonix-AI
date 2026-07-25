import { PlatformStub } from "@/components/platform/platform-stub";

/**
 * Platform Operations mirror — configure Accessibility inside a website workspace.
 */
export default function Page() {
  return (
    <PlatformStub
      title="Accessibility"
      subtitle="ADA / WCAG widget, profiles, statement, and compliance tools"
      planned={[
        "Open an organization website workspace → Accessibility",
        "Full studio: widget launcher, vision & typography tools, profiles",
        "Accessibility statement + WCAG A / AA / AAA target",
        "Readiness score synced to the website dashboard",
      ]}
    />
  );
}
