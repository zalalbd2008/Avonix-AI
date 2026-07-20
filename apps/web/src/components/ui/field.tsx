export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="mb-3.5 block">
      <span className="mb-1.5 block text-[12.5px] font-semibold">{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-[#dbe1ea] px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
    </label>
  );
}

export function SubmitButton({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Working…" : children}
    </button>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="mb-3 rounded-lg bg-[#fef2f2] px-3 py-2 text-[12.5px] text-bad">
      {message}
    </p>
  );
}
