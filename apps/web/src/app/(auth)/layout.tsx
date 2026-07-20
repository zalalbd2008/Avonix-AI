export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-[380px] rounded-2xl border border-line bg-white p-7 shadow-sm">
        {children}
      </div>
    </div>
  );
}
