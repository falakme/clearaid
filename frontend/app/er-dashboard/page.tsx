"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MapPin, Radio, RefreshCw, Send } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeMode } from "@/components/theme";
import { CityAlertMap } from "@/components/admin/city-alert-map";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { fetchAlerts } from "@/lib/api";
import type { GeoArea } from "@/lib/geo";
import type { Alert, ErTeam } from "@/lib/types";

type Severity = "info" | "warning" | "success";

/**
 * ER responder console. ER teams are assigned a city by an admin (er_teams
 * table). The team triggers ONE localized alert for their city; if an active
 * alert already exists they can only UPDATE or RESOLVE it (the backend
 * enforces one active alert per city). Admins without a team can pick any city.
 */
export default function ErDashboardPage() {
  const [team, setTeam] = useState<ErTeam | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);

  // The city this console operates on (assigned for ER, picked for admins).
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [label, setLabel] = useState("");

  const [existing, setExisting] = useState<Alert | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<Severity>("warning");
  const [programsOpen, setProgramsOpen] = useState(0);

  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  // Load the signed-in user's ER team (assigned city).
  useEffect(() => {
    let active = true;
    fetch("/api/er/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((t: ErTeam | null) => {
        if (!active) return;
        setTeam(t);
        if (t?.assigned_city) {
          setCity(t.assigned_city);
          setRegion(t.region || "");
          setCountry(t.country || "");
          setLabel([t.assigned_city, t.region, t.country].filter(Boolean).join(", "));
        }
      })
      .catch(() => {})
      .finally(() => active && setLoadingTeam(false));
    return () => {
      active = false;
    };
  }, []);

  const refreshExisting = useCallback(async () => {
    if (!city) {
      setExisting(null);
      return;
    }
    try {
      const alerts = await fetchAlerts({ city });
      const active = alerts.find((a) => a.is_active) ?? null;
      setExisting(active);
      if (active) {
        setTitle(active.title);
        setMessage(active.message);
        setSeverity(active.severity);
        setProgramsOpen(active.programs_open);
      }
    } catch {
      setExisting(null);
    }
  }, [city]);

  useEffect(() => {
    refreshExisting();
  }, [refreshExisting]);

  function applyArea(a: GeoArea) {
    setCity(a.city);
    setRegion(a.region);
    setCountry(a.country);
    setLabel(a.label);
  }

  async function createAlert() {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/er/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          region,
          country,
          title,
          message,
          severity,
          programs_open: programsOpen,
          status: "active",
        }),
      });
      if (res.ok) {
        setStatus(`Alert live for residents in ${label || city}.`);
        await refreshExisting();
      } else if (res.status === 409) {
        // A duplicate active alert already exists — switch to update mode.
        setStatus("An active alert already exists for this city. Update it below.");
        await refreshExisting();
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus(`Failed: ${typeof data.detail === "string" ? data.detail : res.status}`);
      }
    } catch {
      setStatus("Failed: backend unreachable.");
    } finally {
      setBusy(false);
    }
  }

  async function patchExisting(body: Record<string, unknown>, okMsg: string) {
    if (!existing) return;
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch(`/api/er/alerts/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setStatus(okMsg);
        await refreshExisting();
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus(`Failed: ${typeof data.detail === "string" ? data.detail : res.status}`);
      }
    } catch {
      setStatus("Failed: backend unreachable.");
    } finally {
      setBusy(false);
    }
  }

  const updateAlert = () =>
    patchExisting(
      { title, message, severity, programs_open: programsOpen },
      "Alert updated for residents.",
    );

  const resolveAlert = () =>
    patchExisting(
      { status: "resolved", severity: "success" },
      "Alert marked resolved — residents now see recovery mode.",
    );

  const canCompose = !!city && !!title.trim() && !!message.trim() && !busy;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <ThemeMode theme="default" />
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brand href="/er-dashboard" />
          <Badge variant="warning">
            <Radio className="h-4 w-4" /> ER Team
          </Badge>
        </div>
      </header>

      {loadingTeam ? (
        <div className="mt-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your assignment…
        </div>
      ) : (
        <>
          <div className="mb-6 mt-6">
            {team ? (
              <>
                <p className="text-lg text-muted-foreground">{team.org_name}</p>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
                  Coordinate aid for {label || team.assigned_city}
                </h1>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-extrabold tracking-tight">
                  ER coordination console
                </h1>
                <p className="mt-1 text-base text-muted-foreground">
                  You aren&apos;t assigned to a team. As an admin you can pick any city below.
                </p>
              </>
            )}
          </div>

          {/* Admins (no assigned team) pick a city; ER teams are locked to theirs. */}
          {!team && (
            <Card className="mb-6">
              <h2 className="mb-2 flex items-center gap-2 font-bold">
                <MapPin className="h-5 w-5 text-primary" /> Pick a city
              </h2>
              <CityAlertMap area={city ? { city, region, country, label } : null} onArea={applyArea} />
            </Card>
          )}

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                {existing ? "Update the active alert" : "Trigger a localized alert"}
              </h2>
              <button
                onClick={refreshExisting}
                aria-label="Refresh"
                className="flex min-h-tap min-w-tap items-center justify-center rounded-md text-muted-foreground hover:text-primary"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>

            {existing && (
              <p className="mb-4 flex items-center gap-2 rounded-md bg-primary/5 p-3 text-base">
                <Radio className="h-5 w-5 text-primary" /> An alert is already active for{" "}
                {label || city}. You can update or resolve it.
              </p>
            )}

            <label className="block">
              <span className="mb-1 block font-semibold">Title</span>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Flood recovery assistance open" />
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block font-semibold">Message</span>
              <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block font-semibold">Programs open</span>
                <Input
                  type="number"
                  min={0}
                  value={programsOpen}
                  onChange={(e) => setProgramsOpen(Number(e.target.value) || 0)}
                />
              </label>
              <div>
                <span className="mb-1 block font-semibold">Severity</span>
                <div className="flex gap-2">
                  {(["info", "warning", "success"] as Severity[]).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={severity === s ? "primary" : "outline"}
                      onClick={() => setSeverity(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {status && <p className="mt-4 rounded-md bg-primary/5 p-3 text-base">{status}</p>}

            {existing ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button size="lg" onClick={updateAlert} disabled={!canCompose}>
                  <Send className="h-5 w-5" /> Update alert
                </Button>
                <Button size="lg" variant="outline" onClick={resolveAlert} disabled={busy}>
                  <CheckCircle2 className="h-5 w-5" /> Mark resolved
                </Button>
              </div>
            ) : (
              <Button size="lg" className="mt-5 w-full" onClick={createAlert} disabled={!canCompose}>
                <Send className="h-5 w-5" />
                {busy ? "Posting…" : city ? `Trigger alert for ${label || city}` : "No city assigned"}
              </Button>
            )}
          </Card>
        </>
      )}

      <footer className="mt-10 text-center text-sm text-muted-foreground">
        ER responder console · all data here is non-PII
      </footer>
    </div>
  );
}
