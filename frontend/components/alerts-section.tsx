"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, Info, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fetchAlerts } from "@/lib/api";
import type { Alert } from "@/lib/types";

const ICON = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
} as const;

export function AlertsSection({ zipCode }: { zipCode: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  async function load() {
    setStatus("loading");
    try {
      setAlerts(await fetchAlerts(zipCode));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
    // Poll so the admin-triggered demo alert appears live on the dashboard.
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipCode]);


  return (
    <section aria-label="Active local alerts">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <BellRing className="h-5 w-5 text-primary" /> Active local alerts
        </h2>
        <button
          onClick={load}
          className="flex min-h-tap min-w-tap items-center justify-center rounded-md text-muted-foreground hover:text-primary"
          aria-label="Refresh alerts"
        >
          <RefreshCw className={"h-5 w-5 " + (status === "loading" ? "animate-spin" : "")} />
        </button>
      </div>

      {status === "loading" && alerts.length === 0 && (
        <div className="clay-card p-5">
          <div className="skeleton mb-3 h-5 w-2/3" />
          <div className="skeleton h-4 w-full" />
        </div>
      )}

      {status === "error" && (
        <div className="clay-card p-5 text-muted-foreground">
          We couldn&apos;t reach the alert service right now. We&apos;ll keep trying.
        </div>
      )}

      {status !== "loading" && status !== "error" && alerts.length === 0 && (
        <div className="clay-card flex items-center gap-3 p-5">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          <p className="text-lg">
            No active alerts for ZIP {zipCode}. You&apos;re all caught up.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {alerts.map((a) => {
          const Icon = ICON[a.severity] ?? Info;
          return (
            <li key={a.id} className="clay-card flex items-start gap-4 p-5">
              <span className="mt-0.5 text-primary">
                <Icon className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold">{a.title}</h3>
                  {a.programs_open > 0 && (
                    <Badge variant="success">{a.programs_open} programs open</Badge>
                  )}
                </div>
                <p className="mt-1 text-base text-muted-foreground">{a.message}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
