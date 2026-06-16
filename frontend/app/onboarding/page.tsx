"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BellRing, MapPin, Users } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { slideStep, spring } from "@/lib/motion";
import { useProfile } from "@/lib/storage";
import type { UserProfile } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const { save } = useProfile();
  const [step, setStep] = useState(1);

  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [familySize, setFamilySize] = useState(1);

  function finish(notificationsEnabled: boolean) {
    const profile: UserProfile = {
      zipCode: zipCode.trim(),
      city: city.trim(),
      familySize,
      notificationsEnabled,
      onboardedAt: new Date().toISOString(),
    };
    save(profile); // PRIVACY: written only to localStorage
    router.push("/dashboard");
  }

  async function requestNotifications() {
    try {
      if ("Notification" in window) {
        const perm = await Notification.requestPermission();
        finish(perm === "granted");
        return;
      }
    } catch {
      /* fall through */
    }
    finish(false);
  }


  const zipValid = /^\d{5}$/.test(zipCode.trim());

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8">
      <Brand href="/" />

      <div className="mt-6 flex items-center gap-2" aria-label={`Step ${step} of 3`}>
        {[1, 2, 3].map((n) => (
          <span key={n} className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <motion.span
              className="block h-full origin-left rounded-full bg-primary"
              initial={false}
              animate={{ scaleX: n <= step ? 1 : 0 }}
              transition={spring}
            />
          </span>
        ))}
      </div>

      <section className="flex flex-1 flex-col justify-center py-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            variants={slideStep}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {step === 1 && (
              <Card>
                <h1 className="text-3xl font-extrabold tracking-tight">
                  You&apos;re in the right place.
                </h1>
                <p className="mt-4 text-xl text-muted-foreground">
                  In three quick steps we&apos;ll set up ClearAid for your area. We only ask
                  for what we need, and it stays on your device.
                </p>
                <Button size="lg" className="mt-8 w-full" onClick={() => setStep(2)}>
                  Continue <ArrowRight className="h-5 w-5" />
                </Button>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <h1 className="text-3xl font-extrabold tracking-tight">Where are you?</h1>
                <p className="mt-3 text-lg text-muted-foreground">
                  This helps us show aid programs open in your area. Stored only on this
                  device.
                </p>

                <div className="mt-8 space-y-6">
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-lg font-semibold">
                      <MapPin className="h-5 w-5 text-primary" /> ZIP code
                    </span>
                    <Input
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="e.g. 77001"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ""))}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-lg font-semibold">City (optional)</span>
                    <Input
                      placeholder="e.g. Houston"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </label>

                  <div>
                    <span className="mb-2 flex items-center gap-2 text-lg font-semibold">
                      <Users className="h-5 w-5 text-primary" /> Family size
                    </span>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Decrease family size"
                        onClick={() => setFamilySize((n) => Math.max(1, n - 1))}
                      >
                        −
                      </Button>
                      <motion.span
                        key={familySize}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={spring}
                        className="min-w-[3ch] text-center text-3xl font-bold"
                      >
                        {familySize}
                      </motion.span>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Increase family size"
                        onClick={() => setFamilySize((n) => Math.min(20, n + 1))}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="mt-8 w-full"
                  disabled={!zipValid}
                  onClick={() => setStep(3)}
                >
                  {zipValid ? "Continue" : "Enter a 5-digit ZIP"}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <motion.span
                  initial={{ scale: 0, rotate: -25 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ ...spring, delay: 0.1 }}
                  className="flex h-14 w-14 items-center justify-center rounded-md bg-warning/15 text-amber-600 shadow-clay-sm"
                >
                  <BellRing className="h-7 w-7" />
                </motion.span>
                <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
                  Stay one step ahead
                </h1>
                <p className="mt-3 text-xl text-muted-foreground">
                  Enable alerts so we can wake you up if aid becomes available in your area —
                  even when the app is closed.
                </p>

                <Button size="lg" className="mt-8 w-full" onClick={requestNotifications}>
                  <BellRing className="h-5 w-5" /> Enable alerts
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="mt-3 w-full"
                  onClick={() => finish(false)}
                >
                  Maybe later
                </Button>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  );
}
