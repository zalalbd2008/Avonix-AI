import Link from "next/link";
import { PRICING_NOTE, TIERS } from "@/lib/marketing-content";

/** Route: /pricing */
export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1020px] px-6 py-12 pb-14">
      <h1 className="mb-1.5 text-center text-[28px] font-bold tracking-[-0.02em]">
        Start free, pay when it earns you money
      </h1>
      <p className="mb-8 text-center text-[14px] text-muted">{PRICING_NOTE}</p>

      <div className="grid grid-cols-1 items-start gap-3.5 md:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`flex flex-col gap-3 rounded-[14px] border bg-white p-[22px] ${
              t.highlight ? "border-brand shadow-[0_8px_28px_rgba(255,102,0,.12)]" : "border-line"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold">{t.name}</span>
              {t.highlight && (
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                  most agencies
                </span>
              )}
            </div>
            <div className="text-[26px] font-bold tracking-[-0.02em]">{t.price}</div>
            <p className="text-[12px] text-muted">{t.sub}</p>

            <Link
              href={t.cta === "Talk to us" ? "/contact" : "/sign-up"}
              className="rounded-lg bg-brand py-2.5 text-center text-[13px] font-semibold text-white hover:bg-brand-dark"
            >
              {t.cta}
            </Link>

            <ul className="flex flex-col gap-[7px] border-t border-[#edf0f5] pt-3">
              {t.items.map((item) => (
                <li key={item} className="flex gap-2 text-[12.5px] text-[#3c4c66]">
                  <span className="font-bold text-ok">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
