"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, LifeBuoy, Settings, TriangleAlert } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeMode, type ThemeName } from "@/components/theme";
import { IntakeWorkspace } from "@/components/translator/intake-workspace";
import { RecommendedActions } from "@/components/recommended-actions";
import { NotificationsToggle } from "@/components/notifications-toggle";
import { DataPurgeButton } from "@/components/data-purge-button";
import { spring } from "@/lib/motion";
import { fetchAlerts } from "@/lib/api";
import { useProfile } from "@/lib/storage";
import type { Alert } from "@/lib/types";

/**
 * The single unified app page. No more /emergency or /dashboard split.
 *
 * Mood is derived live from the user's area alerts and drives everything:
 *
 *   default   (no active alerts) → calm blue, standard paperwork helper
 *   emergency (active alert)     → vivid red, emergency intake + official links
 *   recovery  (resolved alert)   → reassuring green, recovery resources
 *
 * Authentication is never required here — the emergency scenario must always
 * be reachable without a Clerk account.
 */

type Mood = "default" | "emergency" | "recovery";

function deriveMood(alerts: Alert[]): Mood {
  const first = alerts[0];
  if (!first) return "default";
  return first.status === "resolved" ? "recovery" : "emergency";
}

const MOOD_THEME: Record<Mood, ThemeName> = {
  default: "default",
  emergency: "emergency",
  recovery: "recovery",
};

const MOOD_DOC_TYPE: Record<Mood, "emergency" | "general"> = {
  default: "general",
  emergency: "emergency",
  recovery: "general",
};

export default function HomePage() {
  const router = useRouter();
  const { profile, loaded } = useProfile();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // No profile → the user hasn't been onboarded yet.
  useEffect(() => {
    if (loaded && !profile) router.replace("/onboarding");
  }, [loaded, profile, router]);

  // Fetch alerts for the user's city, and poll every 30 s so a newly-posted
  // alert (e.g. from an ER team) switches the theme without a page reload.
  useEffect(() => {
    if (!profile?.city) return;
    let alive = true;

    async function load() {
      if (!profile?.city) return;
      try {
        const data = await fetchAlerts({ city: profile.city });
        if (alive) setAlerts(data.filter((a) => a.is_active));
      } catch {
        /* keep previous state */
      }
    }

    load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [profile?.city]);

  const mood = deriveMood(alerts);
  const primary = alerts[0] ?? null;
  const disaster = useMemo(() => primary?.title ?? "disaster", [primary]);
  const recommendMode = mood === "recovery" ? "recovery" : "relief";

  if (!loaded || !profile) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <div className="skeleton h-8 w-40" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      {/* ── Dynamic accent: blue / red / green ─────────────────────────── */}
      <ThemeMode theme={MOOD_THEME[mood]} />

      <header className="flex items-center justify-between">
        <Brand href="/home" />
        <Link
          href="/settings"
          className="flex min-h-tap min-w-tap items-center justify-center rounded-md text-muted-foreground hover:text-primary"
          aria-label="Settings"
        >
          <Settings className="h-6 w-6" />
        </Link>
      </header>

      {/* ── Mood banner (hidden in default/calm mode) ────────────────────── */}
      <AnimatePresence>
        {mood !== "default" && (
          <motion.div
            key={mood}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={spring}
            className="mt-6 flex items-start gap-3 rounded-md border-2 border-primary bg-primary/10 p-4 text-primary"
          >
            {mood === "recovery" ? (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
            ) : (
              <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0" />
            )}
            <div>
              <p className="text-lg font-extrabold">
                {mood === "recovery"
                  ? `Recovery phase${profile.label ? ` — ${profile.label}` : ""}`
                  : `Active emergency${profile.label ? ` near ${profile.label}` : " in your area"}`}
              </p>
              <p className="text-base">
                {mood === "recovery"
                  ? "The immediate emergency has ended. Here's help for your recovery."
                  : "All ClearAid tools are open — no sign-in needed. Get help below."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Calm-mode page title ─────────────────────────────────────────── */}
      {mood === "default" && (
        <div className="mb-6 mt-6">
          <p className="text-lg text-muted-foreground">{profile.label || "Your area"}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
            Let&apos;s make this paperwork plain.
          </h1>
        </div>
      )}

      {/* ── Active alert cards ──────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <ul className="mt-4 space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-3 rounded-md border border-primary/40 bg-card p-4 shadow-clay-sm"
            >
              <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-bold">{a.title}</p>
                <p className="text-base text-muted-foreground">{a.message}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── Push notifications opt-in ───────────────────────────────────── */}
      <div className="mt-4">
        <NotificationsToggle city={profile.city} />
      </div>

      {/* ── Official relief / recovery links (Brave Search) ─────────────── */}
      {mood !== "default" && profile.city && (
        <div className="mt-6">
          <RecommendedActions
            city={profile.city}
            region={profile.region}
            disaster={disaster}
            mode={recommendMode}
          />
        </div>
      )}

      {/* ── Intake workspace ─────────────────────────────────────────────── */}
      <div className={mood === "default" ? "mt-0" : "mt-8"}>
        <IntakeWorkspace
          docType={MOOD_DOC_TYPE[mood]}
          storageKey="home-intake"
          subtitle={
            mood === "emergency"
              ? "Describe what's happening, paste a notice, or add a photo or PDF of any document. ClearAid explains it and gives you clear next steps right now."
              : mood === "recovery"
                ? "Recovery documents, insurance forms, FEMA correspondence — paste or upload anything and ClearAid will break it down for you."
                : undefined
          }
        />
      </div>

      <footer className="mt-12 flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
        <p>
          {mood === "default"
            ? "Your profile is stored only on this device. ClearAid never submits forms for you."
            : "Free and anonymous. ClearAid never submits anything for you."}
        </p>
        <DataPurgeButton />
      </footer>
    </main>
  );
}
