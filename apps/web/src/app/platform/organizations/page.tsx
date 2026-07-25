import { redirect } from "next/navigation";

/** Legacy path — Accounts → Workspaces. */
export default function Page() {
  redirect("/platform/workspaces" as never);
}
