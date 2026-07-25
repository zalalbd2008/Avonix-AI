import Link from "next/link";
import { FEATURES, HERO, HOW_IT_WORKS } from "@/lib/marketing-content";

/** Route: / */
export default function HomePage() {
  return (
    <>
      <section className="bg-navy px-6 pt-[76px] pb-[84px] text-center text-white">
        <span className="rounded-full border border-[#ff9a5c]/35 px-3.5 py-1.5 text-[11px] font-bold tracking-[0.1em] text-[#ff9a5c] uppercase">
          {HERO.badge}
        </span>
        <h1 className="mx-auto mt-[22px] mb-3.5 max-w-[720px] text-[46px] leading-[1.1] font-bold tracking-[-0.03em]">
          {HERO.title[0]}
          <br />
          {HERO.title[1]}
        </h1>
        <p className="mx-auto mb-[30px] max-w-[560px] text-[16px] leading-[1.55] text-white/65">
          {HERO.subtitle}
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/sign-up"
            className="rounded-[9px] bg-brand px-[22px] py-3 text-[14px] font-semibold text-white hover:bg-brand-dark"
          >
            {HERO.primary}
          </Link>
          <Link
            href="/sign-in"
            className="rounded-[9px] border border-white/30 px-[22px] py-3 text-[14px] font-semibold text-white hover:bg-white/10"
          >
            {HERO.secondary}
          </Link>
        </div>
      </section>

      {/* Overlaps the hero, as in the prototype. */}
      <div className="mx-auto -mt-9 max-w-[1000px] px-6 pb-14">
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-line bg-white p-5 shadow-[0_4px_16px_rgba(11,30,58,.05)]"
            >
              <h3 className="mb-1.5 text-[14.5px] font-bold">{f.title}</h3>
              <p className="text-[12.5px] leading-[1.5] text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="border-t border-line bg-white px-6 py-16">
        <div className="mx-auto max-w-[900px]">
          <h2 className="mb-10 text-center text-[26px] font-bold tracking-[-0.02em]">
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step}>
                <span className="grid size-8 place-items-center rounded-full bg-brand text-[14px] font-bold text-white">
                  {s.step}
                </span>
                <h3 className="mt-3 mb-1.5 text-[15px] font-bold">{s.title}</h3>
                <p className="text-[13px] leading-[1.55] text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 text-center">
        <h2 className="text-[24px] font-bold tracking-[-0.02em]">
          Start with one client, free
        </h2>
        <p className="mx-auto mt-2 mb-6 max-w-[460px] text-[14px] text-muted">
          No card. Connect a site, see the leads arrive, then decide.
        </p>
        <Link
          href="/sign-up"
          className="inline-block rounded-[9px] bg-brand px-[22px] py-3 text-[14px] font-semibold text-white hover:bg-brand-dark"
        >
          Create your agency
        </Link>
      </section>
    </>
  );
}
