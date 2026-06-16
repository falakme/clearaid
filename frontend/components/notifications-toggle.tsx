"use client";

import { useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enablePushForCity, pushSupported, type PushResult } from "@/lib/pwa";

/**
 * "Enable alerts" control. Explicitly requests Notification permission and
 * registers a Web Push subscription scoped to the user's city, so they're
 * notified when an alert is triggered nearby — even with the app closed.
 */
export function NotificationsToggle({ city }: { city: string }) {
  const [state, setState] = useState<PushResult | "idle" | "working">("idle");

  if (!pushSupported()) return null;

  const MESSAGES: Record<string, string> = {
    subscribed: "Alerts are on — we'll notify you about emergencies nearby.",
    denied: "Notifications are blocked. Enable them in your browser settings.",
    "not-configured": "Push isn't configured on the server yet.",
    error: "Couldn't enable alerts. Please try again.",
    unsupported: "",
  };

  async function enable() {
    setState("working");
    setState(await enablePushForCity(city));
  }

  const done = state === "subscribed";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/5 p-3">
      <span className="text-primary">
        {done ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
      </span>
      <p className="flex-1 text-base">
        {state !== "idle" && state !== "working" && MESSAGES[state]
          ? MESSAGES[state]
          : "Get notified when emergencies or aid are announced in your area."}
      </p>
      {!done && (
        <Button size="sm" variant="outline" onClick={enable} disabled={state === "working"}>
          {state === "working" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Enabling…
            </>
          ) : state === "denied" ? (
            <>
              <BellOff className="h-4 w-4" /> Blocked
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" /> Enable alerts
            </>
          )}
        </Button>
      )}
    </div>
  );
}
