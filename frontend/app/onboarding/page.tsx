"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, Lock, MapPin, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeMode } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { slideStep } from "@/lib/motion";
import { useProfile } from "@/lib/storage";
import { CLERK_ENABLED } from "@/lib/auth";
import { fetchAlerts } from "@/lib/api";
import { locateUser, GeoError, type GeoArea } from "@/lib/geo";
import type { UserProfile } from "@/lib/types";

type Status = "prompt" | "locating" | "error";

export default function OnboardingPage() {
  const router = useRouter();
  const { save } = useProfile();
  const [status, setStatus] = useState<Status>("prompt");
  const [error, setError] = useState("");

  /** Once an area is known, decide where to send the user. */
  async function routeForArea(area: GeoArea) {
    // Check the backend for an active emergency in this city.
    let emergency = false;
    if (area.city) {
      try {
        const alerts = await fetchAlerts({ city: area.city });
        emergency = alerts.some((a) => a.is_active);
      } catch {
        emergency = false;
      }
    }

    const profile: UserProfile = {
      city: area.city,
      region: area.region,
      country: area.country,
      label: area.label,
      zipCode: area.zipCode || undefined,
      emergency,
      notificationsEnabled: false,
      onboardedAt: new Date().toISOString(),
    };
    save(profile); // PRIVACY: written only to localStorage (no coordinates)

    if (emergency) {
      // Scenario A — active emergency: bypass auth, go straight to intake.
      router.replace("/emergency");
    } else if (CLERK_ENABLED) {
      // Scenario B — everyday use: sign in, then land on the dashboard.
      router.replace("/signin");
    } else {
      // Clerk not configured (demo) — go straight to the dashboard.
      router.replace("/dashboard");
    }
  }

  async function requestLocation() {
    setStatus("locating");
    setError("");
    try {
      const area = await locateUser();
      await routeForArea(area);
    } catch (e) {
      setError(
        e instanceof GeoError
          ? e.message
          : "We couldn't read your location. Please try again.",
      );
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-8">
      <ThemeMode theme="default" />
      <Brand href="/" />

      <section className="flex flex-1 flex-col justify-center py-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={status}
            variants={slideStep}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {status === "locating" ? (
              <Card className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-primary/10 text-primary shadow-clay-sm">
                  <Loader2 className="h-7 w-7 animate-spin" />
                </span>
                <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
                  Checking your area…
                </h1>
                <p className="mt-3 text-lg text-muted-foreground">
                  Finding your location and checking for active emergencies near you.
                </p>
              </Card>
            ) : (
              <Card>
                <span className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10 text-primary shadow-clay-sm">
                  <MapPin className="h-7 w-7" />
                </span>
                <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
                  Privacy &amp; location
                </h1>
                <p className="mt-4 text-xl leading-relaxed text-muted-foreground">
                  We require your location to check for active emergencies and serve you
                  local aid. All data is encrypted, anonymized, and never stored.
                </p>

                <div className="mt-6 space-y-3">
                  <InfoRow
                    icon={<ShieldCheck className="h-5 w-5" />}
                    text="We use your location only to find emergencies and aid near you."
                  />
                  <InfoRow
                    icon={<Lock className="h-5 w-5" />}
                    text="Your location stays on this device — it's never sent to our servers."
                  />
                </div>

                {status === "error" && (
                  <p className="mt-6 rounded-md bg-warning/15 p-3 text-base text-amber-800">
                    {error}
                  </p>
                )}

                <Button size="lg" className="mt-8 w-full" onClick={requestLocation}>
                  <MapPin className="h-5 w-5" />
                  {status === "error" ? "Try again" : "Allow location & continue"}
                  <ArrowRight className="h-5 w-5" />
                </Button>

                {status === "error" && (
                  <Button
                    variant="ghost"
                    size="lg"
                    className="mt-3 w-full"
                    onClick={() =>
                      CLERK_ENABLED ? router.replace("/signin") : router.replace("/dashboard")
                    }
                  >
                    Continue without location
                  </Button>
                )}
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md bg-white/60 p-3">
      <span className="mt-0.5 text-primary">{icon}</span>
      <p className="text-base text-foreground">{text}</p>
    </div>
  );
}
