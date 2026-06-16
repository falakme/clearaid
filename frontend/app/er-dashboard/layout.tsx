import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CLERK_ENABLED } from "@/lib/auth";
import { getUserRole } from "@/lib/roles";

/**
 * Server-side lock for the ER responder console.
 *
 * Access is restricted to Clerk users whose publicMetadata is
 * { "role": "er" } (admins are allowed too).
 *  - Not signed in              -> custom sign-in wall.
 *  - Signed in without er/admin -> redirected home.
 */
export default async function ErDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (CLERK_ENABLED) {
    const { userId } = await auth();
    if (!userId) redirect("/signin?redirect_url=%2Fer-dashboard");

    const role = await getUserRole(userId);
    if (role !== "er" && role !== "admin") redirect("/");
  }

  return <>{children}</>;
}
