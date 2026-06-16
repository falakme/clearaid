import { clerkClient } from "@clerk/nextjs/server";

/**
 * Access model.
 *  - System Admins are verified STRICTLY via Clerk privateMetadata
 *    `{ "admin": true }` (server-only, read via the Backend API).
 *  - ER team membership is a DATABASE concept (the er_teams table), matched by
 *    Clerk user id — see lib/er-teams-server.ts.
 *  - Everyone else is a standard user.
 */

/** True iff the user's Clerk privateMetadata is { "admin": true }. */
export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return (user.privateMetadata as { admin?: unknown } | null)?.admin === true;
  } catch {
    return false;
  }
}
