import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CLERK_ENABLED } from "@/lib/auth";
import { isAdminUser } from "@/lib/roles";
import { getErTeamForUser } from "@/lib/er-teams-server";

/**
 * Server-side lock for the ER responder console.
 *
 * Access is restricted to:
 *  - System Admins (privateMetadata.admin), or
 *  - members of an active ER team (er_teams table, matched by Clerk user id).
 * Everyone else (and signed-out visitors) is redirected away.
 */
export default async function ErDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (CLERK_ENABLED) {
    const { userId } = await auth();
    if (!userId) redirect("/signin?redirect_url=%2Fer-dashboard");

    const admin = await isAdminUser(userId);
    if (!admin) {
      const team = await getErTeamForUser(userId);
      if (!team) redirect("/");
    }
  }

  return <>{children}</>;
}
