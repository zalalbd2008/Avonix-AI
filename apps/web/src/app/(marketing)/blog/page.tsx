import { POSTS } from "@/lib/marketing-content";

/** Route: /blog */
export default function BlogPage() {
  return (
    <div className="mx-auto max-w-[760px] px-6 py-12 pb-14">
      <h1 className="mb-1.5 text-center text-[28px] font-bold tracking-[-0.02em]">Blog</h1>
      <p className="mb-8 text-center text-[14px] text-muted">
        Notes on building this, and on how agencies actually work leads
      </p>

      <div className="flex flex-col gap-3.5">
        {POSTS.map((p) => (
          <article key={p.title} className="rounded-xl border border-line bg-white p-[22px]">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10.5px] font-bold tracking-[0.06em] text-brand uppercase">
                {p.tag}
              </span>
              <span className="text-[12px] text-faint">{p.date}</span>
            </div>
            <h2 className="text-[17px] font-bold tracking-[-0.01em]">{p.title}</h2>
            <span className="mt-2.5 block text-[12.5px] font-semibold text-faint">
              Being written
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
