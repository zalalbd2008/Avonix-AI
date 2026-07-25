import { DOCS } from "@/lib/marketing-content";

/** Route: /docs */
export default function DocsPage() {
  return (
    <div className="mx-auto max-w-[1000px] px-6 py-12 pb-14">
      <h1 className="mb-1.5 text-center text-[28px] font-bold tracking-[-0.02em]">
        Documentation
      </h1>
      <p className="mb-8 text-center text-[14px] text-muted">
        Setting up, connecting a site, and how the assistant decides what to say
      </p>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {DOCS.map((d) => (
          <div key={d.title} className="rounded-xl border border-line bg-white p-5">
            <h3 className="mb-1.5 text-[14.5px] font-bold">{d.title}</h3>
            <p className="mb-2.5 text-[12.5px] leading-[1.5] text-muted">{d.body}</p>
            {/* Not linked anywhere yet — an article that does not exist should
                not advertise itself with a "Read →" that 404s. */}
            <span className="text-[12.5px] font-semibold text-faint">Being written</span>
          </div>
        ))}
      </div>
    </div>
  );
}
