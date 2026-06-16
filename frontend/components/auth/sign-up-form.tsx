"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { ArrowRight, Loader2, Mail, User } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeMode } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "./field";
import { OtpInput } from "./otp-input";
import { clerkErrorMessage, useRedirectTarget } from "./auth-utils";

/**
 * Custom, claymorphism-styled sign-up built on Clerk's headless useSignUp.
 *
 * PASSWORDLESS: email + one-time verification code ONLY. No passwords, no
 * passkeys. Two steps: (1) enter email, (2) verify the 6-digit code Clerk
 * emails.
 */
export function SignUpForm() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const target = useRedirectTarget();

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || loading) return;
    setLoading(true);
    setError("");
    try {
      await signUp.create({
        emailAddress: email,
        ...(firstName ? { firstName } : {}),
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
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
      const res = await signUp.attemptEmailAddressVerification({ code });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        router.push(target);
      } else {
        setError("That code didn't work. Check your email and try again.");
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
            <h1 className="text-3xl font-extrabold tracking-tight">Create your account</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Just your email — we&apos;ll send a code to verify it. No password needed.
            </p>

            <form onSubmit={onCreate} className="mt-6 space-y-4">
              <Field
                label="First name (optional)"
                icon={<User className="h-5 w-5" />}
                type="text"
                autoComplete="given-name"
                placeholder="Alex"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
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

              {/* Clerk Smart CAPTCHA / bot protection mounts here. */}
              <div id="clerk-captcha" />

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading || !isLoaded}
              >
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
            <h1 className="text-3xl font-extrabold tracking-tight">Verify your email</h1>
            <p className="mt-2 text-base text-muted-foreground">
              We sent a 6-digit code to <strong>{email}</strong>. Enter it below.
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
                    Verify &amp; continue <ArrowRight className="h-5 w-5" />
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
        Already have an account?{" "}
        <Link href="/signin" className="font-bold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
