"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CLERK_ENABLED } from "@/lib/auth";
import { SignUpForm } from "@/components/auth/sign-up-form";

/** Demo mode (no Clerk): there's nothing to register — go to the dashboard. */
function RedirectToDashboard() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}

export default function SignUpPage() {
  // Render the Clerk-powered form ONLY when Clerk is configured, so the
  // useSignUp hook never runs outside <ClerkProvider>.
  if (!CLERK_ENABLED) return <RedirectToDashboard />;
  return <SignUpForm />;
}
