import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CLERK_ENABLED } from "@/lib/auth";
import { getUserRole } from "@/lib/roles";
import { AdminShell } from "./admin-shell";

/**
 * Server-side hard lock for the entire /admin area.
 *
 * Access is restricted to Clerk users whose publicMetadata is
 * { "role": "admin" }.
 *  - Not signed in       -> sent to the custom sign-in wall.
 *  - Signed in, not admin -> redirected to the home page.
 *
 * This is the authoritative gate (the matching middleware check is the first
 * line of defense). When Clerk isn't configured, the console stays open as a
 * local dev convenience.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (CLERK_ENABLED) {
    const { userId } = await auth();
    if (!userId) redirect("/signin?redirect_url=%2Fadmin");

    const role = await getUserRole(userId);
    if (role !== "admin") redirect("/");
  }

  return <AdminShell>{children}</AdminShell>;
}
