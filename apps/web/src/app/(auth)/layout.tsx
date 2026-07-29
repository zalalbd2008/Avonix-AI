export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-[380px] rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
        {children}
      </div>
    </div>
  );
}
