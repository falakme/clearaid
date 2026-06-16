"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import type { EmailCodeFactor } from "@clerk/types";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeMode } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "./field";
import { OtpInput } from "./otp-input";
import { clerkErrorMessage, useRedirectTarget } from "./auth-utils";

/**
 * Custom, claymorphism-styled sign-in built on Clerk's headless useSignIn.
 *
 * PASSWORDLESS: email + one-time verification code ONLY (Clerk `email_code`
 * first factor). No passwords, no passkeys. Two steps:
 *   1. enter email -> Clerk emails a 6-digit code,
 *   2. enter the code -> session is created.
 */
export function SignInForm() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const target = useRedirectTarget();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await signIn.create({ identifier: email });
      const factor = res.supportedFirstFactors?.find(
        (f): f is EmailCodeFactor => f.strategy === "email_code",
      );
      if (!factor) {
        setError("This account can't sign in with an email code.");
        return;
      }
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: factor.emailAddressId,
      });
      setPending(true);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await signIn.attemptFirstFactor({ strategy: "email_code", code });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        router.push(target);
      } else {
        setError("We couldn't finish signing you in. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      setError(clerkErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <ThemeMode theme="default" />
      <div className="mb-8 flex justify-center">
        <Brand href="/" />
      </div>

      <Card>
        {!pending ? (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Enter your email and we&apos;ll send you a sign-in code — no password needed.
            </p>

            <form onSubmit={onSendCode} className="mt-6 space-y-4">
              <Field
                label="Email"
                icon={<Mail className="h-5 w-5" />}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {error && (
                <p className="rounded-md bg-warning/15 p-3 text-base text-amber-800">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading || !isLoaded}>
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Sending code…
                  </>
                ) : (
                  <>
                    Email me a code <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight">Enter your code</h1>
            <p className="mt-2 text-base text-muted-foreground">
              We sent a 6-digit code to <strong>{email}</strong>.
            </p>

            <form onSubmit={onVerify} className="mt-6 space-y-4">
              <div>
                <span className="mb-2 block font-semibold">Verification code</span>
                <OtpInput value={code} onChange={setCode} onComplete={() => {}} />
              </div>

              {error && (
                <p className="rounded-md bg-warning/15 p-3 text-base text-amber-800">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading || !isLoaded || code.length < 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Verifying…
                  </>
                ) : (
                  <>
                    Sign in <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setPending(false);
                  setCode("");
                  setError("");
                }}
              >
                Use a different email
              </Button>
            </form>
          </>
        )}
      </Card>

      <p className="mt-6 text-center text-base text-muted-foreground">
        New to ClearAid?{" "}
        <Link href="/signup" className="font-bold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
