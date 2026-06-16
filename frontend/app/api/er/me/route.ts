import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CLERK_ENABLED } from "@/lib/auth";
import { getErTeamForUser } from "@/lib/er-teams-server";

/**
 * Returns the ER team linked to the currently signed-in Clerk user (or null).
 * Used by the ER dashboard to discover its assigned city. Reads the user id
 * server-side via Clerk auth() — the browser never supplies it.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!CLERK_ENABLED) return NextResponse.json(null);
  const { userId } = await auth();
  if (!userId) return NextResponse.json(null, { status: 401 });
  const team = await getErTeamForUser(userId);
  return NextResponse.json(team);
}
