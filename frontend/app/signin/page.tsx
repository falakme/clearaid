"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CLERK_ENABLED } from "@/lib/auth";
import { SignInForm } from "@/components/auth/sign-in-form";

/** Demo mode (no Clerk): there's nothing to sign into — go to the dashboard. */
function RedirectToDashboard() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}

export default function SignInPage() {
  // Render the Clerk-powered form ONLY when Clerk is configured, so the
  // useSignIn hook never runs outside <ClerkProvider>.
  if (!CLERK_ENABLED) return <RedirectToDashboard />;
  return <SignInForm />;
}
