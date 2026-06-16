"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AccountSection } from "@/components/auth/account-section";
import { DataPurgeButton } from "@/components/data-purge-button";
import { useProfile } from "@/lib/storage";
import { CLERK_ENABLED } from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();
  const { profile, loaded, reset } = useProfile();

  useEffect(() => {
    if (loaded && !profile) router.replace("/onboarding");
  }, [loaded, profile, router]);

  if (!loaded || !profile) return null;

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <header className="flex items-center justify-between">
        <Brand href="/dashboard" />
        <Link
          href="/dashboard"
          className="flex min-h-tap items-center gap-1 rounded-md px-2 font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-5 w-5" /> Back
        </Link>
      </header>

      <h1 className="mb-6 mt-6 text-3xl font-extrabold tracking-tight">Settings</h1>

      <Card>
        <h2 className="text-xl font-bold">Your area</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Derived from your device location and stored only in this browser. We keep the
          area only — never your exact coordinates.
        </p>
        <dl className="mt-4 space-y-2 text-lg">
          <Row label="Area" value={profile.label || "—"} />
          <Row label="City" value={profile.city || "—"} />
          <Row label="Region" value={profile.region || "—"} />
          <Row label="Country" value={profile.country || "—"} />
          <Row label="Active emergency" value={profile.emergency ? "Yes" : "No"} />
        </dl>
      </Card>

      {/* Clerk account management — only when auth is configured. */}
      {CLERK_ENABLED && <AccountSection />}

      <Card className="mt-5">
        <h2 className="text-xl font-bold">Clear my data</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Removes your area and checklist progress from this device.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            reset();
            router.replace("/");
          }}
        >
          <Trash2 className="h-5 w-5" /> Clear all local data
        </Button>
      </Card>

      <footer className="mt-8 flex justify-center">
        <DataPurgeButton />
      </footer>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
