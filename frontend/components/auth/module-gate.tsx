"use client";

import { ShieldCheck, Lock, LifeBuoy } from "lucide-react";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";
import { CLERK_ENABLED } from "@/lib/auth";

interface Props {
  gated: boolean;
  hasEmergency: boolean;
  ready: boolean;
  children: React.ReactNode;
}

/**
 * Conditional auth wall for high-compute modules.
 * - Not gated, OR an active emergency → open (anonymous) access.
 * - Gated + no emergency + Clerk configured → require sign-in.
 * - Gated + no emergency + Clerk NOT configured → open, with a demo note.
 */
export function ModuleGate({ gated, hasEmergency, ready, children }: Props) {
  if (!ready) {
    return (
      <Card>
        <div className="skeleton h-6 w-40" />
        <div className="skeleton mt-3 h-4 w-full" />
      </Card>
    );
  }

  if (!gated || hasEmergency) {
    return (
      <>
        {gated && hasEmergency && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-100 p-3 text-base font-semibold text-emerald-800">
            <LifeBuoy className="h-5 w-5" /> Emergency access — no sign-in needed.
          </div>
        )}
        {children}
      </>
    );
  }

  if (!CLERK_ENABLED) {
    return (
      <>
        <div className="mb-4 flex items-center gap-2 rounded-md bg-warning/15 p-3 text-base text-amber-800">
          <Lock className="h-5 w-5" /> Account sign-in isn&apos;t configured (demo mode) — this tool is open.
        </div>
        {children}
      </>
    );
  }

  return <ClerkGate>{children}</ClerkGate>;
}

/** Rendered only when Clerk is configured, so hooks are safe to call. */
function ClerkGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <Card>
        <div className="skeleton h-6 w-40" />
      </Card>
    );
  }

  if (isSignedIn) return <>{children}</>;

  return (
    <Card className="text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-primary/10 text-primary shadow-clay-sm">
        <ShieldCheck className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-2xl font-extrabold tracking-tight">Quick sign-in required</h2>
      <p className="mx-auto mt-3 max-w-md text-lg text-muted-foreground">
        High-compute tools like this one ask for a free account. It protects the service
        from abuse and keeps it fast for everyone. During an active local emergency, this
        step is skipped automatically.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <SignInButton mode="modal">
          <button className="min-h-tap rounded-md bg-primary px-6 font-bold text-primary-foreground shadow-clay-primary active:translate-y-0.5">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="min-h-tap rounded-md border border-white/70 bg-card px-6 font-bold text-foreground shadow-clay active:translate-y-0.5">
            Create account
          </button>
        </SignUpButton>
      </div>
    </Card>
  );
}
