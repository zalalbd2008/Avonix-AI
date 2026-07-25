import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getInvitationByRawToken } from "@/lib/team/service";
import { AcceptInviteButton } from "./accept-button";

/**
 * Route: /invite/[token]
 * Matches the auth card layout used by sign-in / sign-up.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInvitationByRawToken(token);

  if (!invite) {
    return (
      <AuthCard>
        <h1 className="text-xl font-bold tracking-tight">Invitation not found</h1>
        <p className="mt-0.5 mb-5 text-[13px] text-muted">
          This link is invalid or has already been used.
        </p>
        <Link href="/sign-in" className="font-semibold text-brand hover:underline">
          Back to sign in →
        </Link>
      </AuthCard>
    );
  }

  if (invite.status !== "pending") {
    return (
      <AuthCard>
        <h1 className="text-xl font-bold tracking-tight">
          Invitation {invite.status}
        </h1>
        <p className="mt-0.5 mb-5 text-[13px] text-muted">
          Ask an admin of {invite.agencyName} to send a new invite.
        </p>
        <Link href="/sign-in" className="font-semibold text-brand hover:underline">
          Sign in →
        </Link>
      </AuthCard>
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <AuthCard>
      <h1 className="text-xl font-bold tracking-tight">Join {invite.agencyName}</h1>
      <p className="mt-0.5 mb-5 text-[13px] text-muted">
        Invited as <b className="text-ink">{invite.roleName ?? invite.memberRole}</b>
      </p>

      {!session?.user ? (
        <>
          <p className="mb-4 rounded-lg bg-[#fff8f3] px-3 py-2.5 text-[12.5px] text-muted">
            Use <b className="text-ink">{invite.email}</b> to sign in or create an
            account, then return to this link.
          </p>
          <Link
            href={"/sign-in" as never}
            className="mb-2.5 block w-full rounded-lg bg-brand py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Sign in
          </Link>
          <Link
            href={"/sign-up" as never}
            className="block w-full rounded-lg border border-[#dbe1ea] py-2.5 text-center text-sm font-semibold hover:border-brand"
          >
            Create account
          </Link>
        </>
      ) : session.user.email.toLowerCase() !== invite.email.toLowerCase() ? (
        <p className="rounded-lg bg-[#fef2f2] px-3 py-2.5 text-[12.5px] text-bad">
          Signed in as {session.user.email}. Switch to {invite.email} to accept.
        </p>
      ) : (
        <AcceptInviteButton token={token} />
      )}
    </AuthCard>
  );
}

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-[380px] rounded-2xl border border-line bg-white p-7 shadow-sm">
        {children}
      </div>
    </div>
  );
}
