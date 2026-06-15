/**
 * Whether Clerk authentication is configured. When no publishable key is
 * present (e.g. local/hackathon demo), the app runs with auth disabled:
 * gated modules stay open and show an informational note instead of a wall.
 *
 * NEXT_PUBLIC_* is inlined at build time, so this is a static boolean.
 */
export const CLERK_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);
