import { PlatformStub } from "@/components/platform/platform-stub";

/** Platform Operations mirror — configure Languages in a website workspace. */
export default function Page() {
  return (
    <PlatformStub
      title="Languages"
      subtitle="Locales, switcher, translation, and SEO for each website"
      planned={[
        "Open an organization website workspace → Languages",
        "Full studio: locales, switcher, detection, surfaces",
        "URL strategy, hreflang SEO, glossary & never-translate",
        "Settings saved on websites.settings.languages",
      ]}
    />
  );
}
