"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronRight, LifeBuoy, Lock, Settings, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { AlertsSection } from "@/components/alerts-section";
import { Stagger } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { popIn } from "@/lib/motion";
import { CLERK_ENABLED } from "@/lib/auth";
import { useProfile } from "@/lib/storage";
import { useActiveEmergency } from "@/lib/use-emergency";
import { RELIEF_PROGRAMS } from "@/lib/mock-programs";
import type { ReliefProgram } from "@/lib/types";

const MotionLink = motion(Link);

const EMERGENCY = RELIEF_PROGRAMS.filter((p) => !p.gated);
const SUPPORT = RELIEF_PROGRAMS.filter((p) => p.gated);

export default function DashboardPage() {
  const router = useRouter();
  const { profile, loaded } = useProfile();
  const { hasEmergency } = useActiveEmergency();

  useEffect(() => {
    if (loaded && !profile) router.replace("/onboarding");
  }, [loaded, profile, router]);

  if (!loaded || !profile) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <div className="skeleton h-8 w-40" />
      </main>
    );
  }


  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="flex items-center justify-between">
        <Brand href="/dashboard" />
        <Link
          href="/settings"
          className="flex min-h-tap min-w-tap items-center justify-center rounded-md text-muted-foreground hover:text-primary"
          aria-label="Settings"
        >
          <Settings className="h-6 w-6" />
        </Link>
      </header>

      <div className="mt-6 mb-8">
        <p className="text-lg text-muted-foreground">
          {profile.city ? `${profile.city} · ` : ""}ZIP {profile.zipCode} · Household of{" "}
          {profile.familySize}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          What can we help you read?
        </h1>
      </div>

      <div className="mb-10">
        <AlertsSection zipCode={profile.zipCode} />
      </div>

      <section aria-label="Emergency tools" className="mb-10">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <LifeBuoy className="h-5 w-5 text-primary" /> Emergency &amp; disaster
        </h2>
        <p className="mb-4 text-base text-muted-foreground">
          Always free and anonymous — no sign-in, ever.
        </p>
        <Stagger className="grid gap-4 sm:grid-cols-2">
          {EMERGENCY.map((p) => (
            <ModuleCard key={p.id} program={p} locked={false} unlocked={false} />
          ))}
        </Stagger>
      </section>

      <section aria-label="Support tools">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <ShieldCheck className="h-5 w-5 text-primary" /> Everyday paperwork
        </h2>
        {hasEmergency ? (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-100 p-3 text-base font-semibold text-emerald-800">
            <LifeBuoy className="h-5 w-5" /> Active emergency in your area — all tools are
            unlocked, no sign-in needed.
          </div>
        ) : (
          <p className="mb-4 text-base text-muted-foreground">
            Higher-compute tools. {CLERK_ENABLED ? "A quick free sign-in is required." : "Sign-in is disabled in this demo."}
          </p>
        )}
        <Stagger className="grid gap-4 sm:grid-cols-2">
          {SUPPORT.map((p) => (
            <ModuleCard
              key={p.id}
              program={p}
              locked={CLERK_ENABLED && !hasEmergency}
              unlocked={hasEmergency}
            />
          ))}
        </Stagger>
      </section>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        Your profile is stored only on this device. ClearAid never submits forms for you.
      </footer>
    </main>
  );
}

function ModuleCard({
  program,
  locked,
  unlocked,
}: {
  program: ReliefProgram;
  locked: boolean;
  unlocked: boolean;
}) {
  return (
    <MotionLink
      href={`/translate/${program.id}`}
      variants={popIn}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="clay-card group flex min-h-tap flex-col p-5 hover:shadow-clay-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <Badge variant="info">{program.agency}</Badge>
        {locked ? (
          <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
            <Lock className="h-4 w-4" /> Sign in
          </span>
        ) : unlocked ? (
          <Badge variant="success">Open now</Badge>
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
        )}
      </div>
      <h3 className="text-xl font-bold">{program.title}</h3>
      <p className="mt-1 text-base text-muted-foreground">{program.description}</p>
    </MotionLink>
  );
}
