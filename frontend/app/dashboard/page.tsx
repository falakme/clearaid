"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Settings } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeMode } from "@/components/theme";
import { AlertsSection } from "@/components/alerts-section";
import { NotificationsToggle } from "@/components/notifications-toggle";
import { DataPurgeButton } from "@/components/data-purge-button";
import { IntakeWorkspace } from "@/components/translator/intake-workspace";
import { useProfile } from "@/lib/storage";

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
      {/* Everyday dashboard uses the calm default (blue) scheme. */}
      <ThemeMode theme="default" />

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

      <div className="mb-8 mt-6">
        <p className="text-lg text-muted-foreground">{profile.label || "Your area"}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          Let&apos;s make this paperwork plain.
        </h1>
      </div>

      {profile.city && (
        <div className="mb-6">
          <AlertsSection city={profile.city} />
        </div>
      )}

      <div className="mb-10">
        <NotificationsToggle city={profile.city} />
      </div>

      <IntakeWorkspace docType="general" storageKey="dashboard-intake" />

      <footer className="mt-12 flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
        <p>Your profile is stored only on this device. ClearAid never submits forms for you.</p>
        <DataPurgeButton />
      </footer>
    </main>
  );
}
