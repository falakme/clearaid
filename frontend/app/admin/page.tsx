"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  DownloadCloud,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Item, Stagger } from "@/components/motion";
import { fetchHealth } from "@/lib/api";
import type { Alert, Health } from "@/lib/types";

export default function AdminOverview() {
  const [health, setHealth] = useState<Health | null>(null);
  const [reachable, setReachable] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [busy, setBusy] = useState<string>("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      setHealth(await fetchHealth());
      setReachable(true);
    } catch {
      setReachable(false);
      setHealth(null);
    }
    try {
      const res = await fetch("/api/admin/alerts", { cache: "no-store" });
      if (res.ok) setAlerts(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function action(key: string, run: () => Promise<Response>, ok: string) {
    setBusy(key);
    setMsg("");
    try {
      const res = await run();
      setMsg(res.ok ? ok : `Failed (${res.status}).`);
      await load();
    } catch {
      setMsg("Backend unreachable.");
    } finally {
      setBusy("");
    }
  }

  const activeCount = alerts.filter((a) => a.is_active).length;


  return (
    <Stagger className="space-y-5">
      {/* Counts */}
      <Item>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Total alerts" value={alerts.length} />
          <Stat label="Active" value={activeCount} accent />
          <Stat label="Inactive" value={alerts.length - activeCount} />
        </div>
      </Item>

      {/* System status */}
      <Item>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">System status</h2>
            <Button variant="ghost" size="icon" aria-label="Refresh" onClick={load}>
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-2">
            <StatusRow ok={reachable} label="Backend API" detail={reachable ? "Reachable" : "Unreachable"} />
            <StatusRow
              ok={!!health?.database_connected}
              label="Database"
              detail={health?.database_connected ? "Connected" : "Not connected"}
            />
            <StatusRow
              ok={!!health?.nvidia_configured}
              label="NVIDIA AI"
              detail={health?.nvidia_configured ? `Configured · ${health?.nvidia_model}` : "No API key set"}
            />
            <div className="flex items-center justify-between rounded-md bg-white/60 px-4 py-3">
              <span className="font-semibold">Backend version</span>
              <span className="text-muted-foreground">{health?.version ?? "—"}</span>
            </div>
          </div>
        </Card>
      </Item>

      {/* Quick actions */}
      <Item>
        <Card>
          <h2 className="mb-1 text-xl font-bold">Quick actions</h2>
          <p className="mb-4 text-base text-muted-foreground">
            Manage demo data for the pitch. These affect the shared (non-PII) alert store.
          </p>

          {msg && <p className="mb-4 rounded-md bg-primary/5 p-3 text-base">{msg}</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              disabled={busy !== ""}
              onClick={() =>
                action(
                  "seed",
                  () => fetch("/api/admin/alerts/seed", { method: "POST" }),
                  "Demo alerts loaded.",
                )
              }
            >
              <DownloadCloud className="h-5 w-5" />
              {busy === "seed" ? "Loading…" : "Load demo alerts"}
            </Button>

            <Button
              variant="warning"
              disabled={busy !== "" || alerts.length === 0}
              onClick={() => {
                if (!confirm("Delete ALL alerts? This cannot be undone.")) return;
                action(
                  "clear",
                  () => fetch("/api/admin/alerts", { method: "DELETE" }),
                  "All alerts cleared.",
                );
              }}
            >
              <Trash2 className="h-5 w-5" />
              {busy === "clear" ? "Clearing…" : "Clear all alerts"}
            </Button>
          </div>
        </Card>
      </Item>
    </Stagger>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="clay-card p-5">
      <p className={"text-4xl font-extrabold " + (accent ? "text-primary" : "")}>{value}</p>
      <p className="mt-1 text-base text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-white/60 px-4 py-3">
      <span className="flex items-center gap-2 font-semibold">
        {ok ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <TriangleAlert className="h-5 w-5 text-amber-500" />
        )}
        {label}
      </span>
      <span className="text-right text-base text-muted-foreground">{detail}</span>
    </div>
  );
}
