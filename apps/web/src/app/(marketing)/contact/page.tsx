/** Route: /contact */
export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[860px] px-6 py-12 pb-14">
      <h1 className="mb-1.5 text-center text-[28px] font-bold tracking-[-0.02em]">Contact</h1>
      <p className="mb-8 text-center text-[14px] text-muted">
        Questions about the Agency plan, or want to tell us what you&apos;d pay?
      </p>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-[1.2fr_.8fr]">
        <form className="rounded-[14px] border border-line bg-white p-6">
          <label className="mb-3.5 block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Name</span>
            <input
              name="name"
              className="w-full rounded-lg border border-[#dbe1ea] px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="mb-3.5 block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Email</span>
            <input
              type="email"
              name="email"
              className="w-full rounded-lg border border-[#dbe1ea] px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Message</span>
            <textarea
              name="message"
              rows={5}
              className="w-full resize-y rounded-lg border border-[#dbe1ea] px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>
          {/*
            No submit handler on purpose. There is no inbound route for
            marketing enquiries yet, and a button that appears to send and does
            nothing is worse than an address people can actually use.
          */}
          <p className="rounded-lg bg-[#f1f4f8] px-3 py-2.5 text-[12.5px] text-muted">
            This form is not wired up yet — email us at the address opposite and
            it will reach a person.
          </p>
        </form>

        <div className="flex flex-col gap-[18px] rounded-[14px] bg-navy p-6 text-white">
          {[
            ["Email", "hello@avonix.ai"],
            ["Response time", "Within 24 hours"],
            ["Office", "Dhaka, Bangladesh · UTC+6"],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="mb-1 text-[11px] font-bold tracking-[0.08em] text-[#ff9a5c] uppercase">
                {label}
              </div>
              <div className="text-[14px] leading-[1.5] font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
