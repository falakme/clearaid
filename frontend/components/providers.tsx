import { ClerkProvider } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/auth";

/**
 * Wraps the app in ClerkProvider only when Clerk is configured. Without a
 * publishable key the provider is skipped entirely, so the app works with no
 * Clerk account (and no build/runtime errors).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  if (!CLERK_ENABLED) return <>{children}</>;
  return <ClerkProvider>{children}</ClerkProvider>;
}
