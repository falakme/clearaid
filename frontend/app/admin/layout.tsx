import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CLERK_ENABLED } from "@/lib/auth";
import { isAdminUser } from "@/lib/roles";
import { AdminShell } from "./admin-shell";

/**
 * Server-side hard lock for the entire /admin area.
 *
 * Access is restricted STRICTLY to Clerk users whose privateMetadata is
 * { "admin": true }.
 *  - Not signed in        -> custom sign-in wall.
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
    if (!(await isAdminUser(userId))) redirect("/");
  }

  return <AdminShell>{children}</AdminShell>;
}
