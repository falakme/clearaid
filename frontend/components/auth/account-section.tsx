"use client";

import { useRouter } from "next/navigation";
import { LogIn, LogOut, UserCog } from "lucide-react";
import { SignedIn, SignedOut, UserButton, useClerk, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Clerk account management for the settings page. ONLY rendered when Clerk is
 * configured (the parent gates on CLERK_ENABLED), so these Clerk hooks always
 * run inside <ClerkProvider>. Provides:
 *  - inline account management (UserButton opens "Manage account"),
 *  - an explicit Sign out button,
 *  - a Sign in button when signed out.
 */
export function AccountSection() {
  const router = useRouter();
  const { signOut, openUserProfile } = useClerk();
  const { user } = useUser();

  return (
    <Card className="mt-5">
      <h2 className="text-xl font-bold">Account</h2>

      <SignedIn>
        <div className="mt-4 flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {user?.fullName || user?.username || "Signed in"}
            </p>
            <p className="truncate text-base text-muted-foreground">
              {user?.primaryEmailAddress?.emailAddress ?? ""}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => openUserProfile()}>
            <UserCog className="h-5 w-5" /> Manage account
          </Button>
          <Button
            variant="warning"
            onClick={() => signOut(() => router.replace("/"))}
          >
            <LogOut className="h-5 w-5" /> Sign out
          </Button>
        </div>
      </SignedIn>

      <SignedOut>
        <p className="mt-1 text-base text-muted-foreground">
          You&apos;re not signed in. Sign in to sync your everyday paperwork.
        </p>
        <Button className="mt-4" onClick={() => router.push("/signin")}>
          <LogIn className="h-5 w-5" /> Sign in
        </Button>
      </SignedOut>
    </Card>
  );
}
