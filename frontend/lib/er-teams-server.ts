import type { ErTeam } from "./types";

/**
 * SERVER-ONLY helper: looks up the active ER team linked to a Clerk user id by
 * calling the backend over the internal network. Used by the ER dashboard gate
 * and the /api/er/me proxy. Returns null when the user isn't on an ER team.
 */
const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000";

export async function getErTeamForUser(clerkUserId: string): Promise<ErTeam | null> {
  try {
    const res = await fetch(
      `${BACKEND}/api/er-teams/by-user?clerk_user_id=${encodeURIComponent(clerkUserId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data ?? null;
  } catch {
    return null;
  }
}
