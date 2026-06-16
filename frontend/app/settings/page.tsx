"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, Radio, Trash2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProfile } from "@/lib/storage";

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
        <h2 className="text-xl font-bold">Your details</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Stored only in this browser. Nothing is sent to our servers.
        </p>
        <dl className="mt-4 space-y-2 text-lg">
          <Row label="ZIP code" value={profile.zipCode} />
          <Row label="City" value={profile.city || "—"} />
          <Row label="Family size" value={String(profile.familySize)} />
          <Row
            label="Alerts"
            value={profile.notificationsEnabled ? "Enabled" : "Off"}
          />
        </dl>
      </Card>


      <Card className="mt-5">
        <h2 className="text-xl font-bold">Clear my data</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Removes your profile and checklist progress from this device.
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

      <Link
        href="/admin"
        className="mt-5 flex min-h-tap items-center justify-center gap-2 rounded-md text-base font-semibold text-muted-foreground hover:text-primary"
      >
        <Radio className="h-5 w-5" /> Open admin console (demo)
      </Link>
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
