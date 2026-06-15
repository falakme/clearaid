"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChevronRight, ClipboardList, Settings } from "lucide-react";
import { Brand } from "@/components/brand";
import { AlertsSection } from "@/components/alerts-section";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/lib/storage";
import { RELIEF_PROGRAMS } from "@/lib/mock-programs";

export default function DashboardPage() {
  const router = useRouter();
  const { profile, loaded } = useProfile();

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
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Your relief hub</h1>
      </div>

      <div className="mb-10">
        <AlertsSection zipCode={profile.zipCode} />
      </div>

      <section aria-label="Relief to-do list">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <ClipboardList className="h-5 w-5 text-primary" /> Relief to-do list
        </h2>
        <p className="mb-4 text-base text-muted-foreground">
          Tap a program to translate its form into clear steps.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {RELIEF_PROGRAMS.map((p) => (
            <Link
              key={p.id}
              href={`/translate/${p.id}`}
              className="clay-card group flex min-h-tap flex-col p-5 transition-all hover:-translate-y-1 hover:shadow-clay-lg"
            >
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="info">{p.agency}</Badge>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
              <h3 className="text-xl font-bold">{p.title}</h3>
              <p className="mt-1 text-base text-muted-foreground">{p.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        Your profile is stored only on this device. ClearAid never submits forms for you.
      </footer>
    </main>
  );
}
