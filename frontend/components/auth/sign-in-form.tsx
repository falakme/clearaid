"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeMode } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "./field";
import { clerkErrorMessage, useRedirectTarget } from "./auth-utils";

/**
 * Custom, claymorphism-styled sign-in built on Clerk's headless useSignIn
 * (email + password). Replaces Clerk's hosted <SignIn /> component so the
 * surface matches the rest of the app.
 */
export function SignInForm() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const target = useRedirectTarget();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await signIn.create({ identifier: email, password });
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
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Sign in to pick up your everyday paperwork.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
          <Field
            label="Password"
            icon={<Lock className="h-5 w-5" />}
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="rounded-md bg-warning/15 p-3 text-base text-amber-800">{error}</p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading || !isLoaded}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Signing in…
              </>
            ) : (
              <>
                Sign in <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </form>
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
