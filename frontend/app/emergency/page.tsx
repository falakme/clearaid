"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, LifeBuoy, Settings, TriangleAlert } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeMode } from "@/components/theme";
import { IntakeWorkspace } from "@/components/translator/intake-workspace";
import { RecommendedActions } from "@/components/recommended-actions";
import { NotificationsToggle } from "@/components/notifications-toggle";
import { DataPurgeButton } from "@/components/data-purge-button";
import { spring } from "@/lib/motion";
import { fetchAlerts } from "@/lib/api";
import { useProfile } from "@/lib/storage";
import type { Alert } from "@/lib/types";

/**
 * Emergency intake (Scenario A). Reached when an alert is active for the
 * user's area — authentication is bypassed. The accent scheme is applied
 * programmatically: RED while the alert is active, GREEN once it's resolved
 * (recovery phase). Recommended Actions come from the Brave Search pipeline
 * (emergency relief while active, long-term recovery grants once resolved).
 */
export default function EmergencyPage() {
  const { profile } = useProfile();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!profile?.city) return;
    let active = true;
    fetchAlerts({ city: profile.city })
      .then((a) => active && setAlerts(a.filter((x) => x.is_active)))
      .catch(() => active && setAlerts([]));
    return () => {
      active = false;
    };
  }, [profile?.city]);

  // The most recent active alert drives the theme + recommendations mode.
  const primary = alerts[0];
  const resolved = primary?.status === "resolved";
  const mode = resolved ? "recovery" : "relief";

  const disaster = useMemo(() => primary?.title ?? "disaster", [primary]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      {/* Programmatic accent scheme: green when resolved, red while active. */}
      <ThemeMode theme={resolved ? "recovery" : "emergency"} />

      <header className="flex items-center justify-between">
        <Brand href="/emergency" />
        <Link
          href="/settings"
          className="flex min-h-tap min-w-tap items-center justify-center rounded-md text-muted-foreground hover:text-primary"
          aria-label="Settings"
        >
          <Settings className="h-6 w-6" />
        </Link>
      </header>

      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring}
        className="mt-6 flex items-center gap-3 rounded-md border-2 border-primary bg-primary/10 p-4 text-primary"
      >
        {resolved ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : <TriangleAlert className="h-6 w-6 shrink-0" />}
        <div>
          <p className="text-lg font-extrabold">
            {resolved
              ? `Recovery phase${profile?.label ? ` — ${profile.label}` : ""}`
              : `Active emergency${profile?.label ? ` near ${profile.label}` : " in your area"}`}
          </p>
          <p className="text-base">
            {resolved
              ? "The immediate emergency has ended. Here's help for recovery."
              : "All ClearAid tools are open — no sign-in needed. Get help below."}
          </p>
        </div>
      </motion.div>

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

      <div className="mt-4">
        <NotificationsToggle city={profile?.city ?? ""} />
      </div>

      {profile?.city && (
        <div className="mt-6">
          <RecommendedActions
            city={profile.city}
            region={profile.region}
            disaster={disaster}
            mode={mode}
          />
        </div>
      )}

      <div className="mt-6">
        <IntakeWorkspace
          docType="emergency"
          storageKey="emergency-intake"
          subtitle="Describe what's happening, paste a notice you received, or add a photo or PDF of any document. ClearAid explains it and gives you clear next steps right now."
        />
      </div>

      <footer className="mt-12 flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
        <p>Free and anonymous. ClearAid never submits anything for you.</p>
        <DataPurgeButton />
      </footer>
    </main>
  );
}
