import { clerkClient } from "@clerk/nextjs/server";

/**
 * Application roles, stored in Clerk **publicMetadata** as `{ "role": "..." }`.
 *  - "admin" -> full admin console (/admin)
 *  - "er"    -> ER responder console (/er-dashboard)
 *  - "user"  -> everyone else (default)
 *
 * publicMetadata is chosen (over privateMetadata) so it's easy to set in the
 * Clerk dashboard and is also readable on the client.
 */
export type Role = "admin" | "er" | "user";

/** Reads a user's role from Clerk publicMetadata via the Backend API. */
export async function getUserRole(userId: string): Promise<Role> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata as { role?: unknown } | null)?.role;
    if (role === "admin") return "admin";
    if (role === "er") return "er";
    return "user";
  } catch {
    return "user";
  }
}
