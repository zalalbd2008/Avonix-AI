import { redirect } from "next/navigation";
import { resolvePostLoginPath } from "@/lib/auth/home";

/**
 * Route: /home
 * Identity router after login (ADR-013). No UI — always redirects.
 */
export default async function HomePage() {
  redirect((await resolvePostLoginPath()) as never);
}
