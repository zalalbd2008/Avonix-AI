import { NotBuilt } from "@/components/not-built";

export default function Page() {
  return (
    <NotBuilt
      title="AI"
      subtitle="Organization AI usage and settings"
      lead="Coming next"
      body="This organization-level view is on the roadmap. Today these records still live under each client and website workspace."
      backHref="/organizations"
      backLabel="← Organizations"
    />
  );
}
