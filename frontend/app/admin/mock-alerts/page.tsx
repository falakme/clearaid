"use client";

import { useCallback, useEffect, useState } from "react";
import { Radio, Send, Trash2, Zap } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Alert } from "@/lib/types";

type Severity = "info" | "warning" | "success";

const PRESET = {
  zip_code: "77001",
  title: "Hurricane warning lifted",
  message:
    "Hurricane warning lifted. 3 aid programs now open for your zip code.",
  severity: "success" as Severity,
  programs_open: 3,
};

export default function MockAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [form, setForm] = useState(PRESET);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/alerts", { cache: "no-store" });
    if (res.ok) setAlerts(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);


  async function trigger() {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("Alert triggered — it will appear on the dashboard within seconds.");
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus(`Failed: ${data.detail ?? res.status}`);
      }
    } catch {
      setStatus("Failed: backend unreachable.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: number) {
    await fetch(`/api/admin/alerts/${id}`, { method: "DELETE" });
    await load();
  }


  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="flex items-center justify-between">
        <Brand href="/dashboard" />
        <Badge variant="warning">
          <Radio className="h-4 w-4" /> Demo control
        </Badge>
      </header>

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Mock alert console</h1>
      <p className="mt-1 text-lg text-muted-foreground">
        Trigger a simulated disaster alert to demo live dashboard updates during the
        pitch. This data is non-PII and stored in Postgres.
      </p>

      <Card className="mt-6">
        <h2 className="text-xl font-bold">Trigger an alert</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-semibold">ZIP code</span>
            <Input
              value={form.zip_code}
              maxLength={5}
              onChange={(e) =>
                setForm({ ...form, zip_code: e.target.value.replace(/\D/g, "") })
              }
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-semibold">Programs open</span>
            <Input
              type="number"
              min={0}
              value={form.programs_open}
              onChange={(e) =>
                setForm({ ...form, programs_open: Number(e.target.value) || 0 })
              }
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block font-semibold">Title</span>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1 block font-semibold">Message</span>
          <Textarea
            rows={3}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1 block font-semibold">Severity</span>
          <div className="flex gap-2">
            {(["info", "warning", "success"] as Severity[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={form.severity === s ? "primary" : "outline"}
                onClick={() => setForm({ ...form, severity: s })}
              >
                {s}
              </Button>
            ))}
          </div>
        </label>

        {status && (
          <p className="mt-4 rounded-md bg-primary/5 p-3 text-base">{status}</p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={trigger} disabled={busy} className="flex-1">
            <Send className="h-5 w-5" /> {busy ? "Triggering…" : "Trigger alert"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setForm(PRESET)}
            className="flex-1"
          >
            <Zap className="h-5 w-5" /> Reset to preset
          </Button>
        </div>
      </Card>


      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">All alerts</h2>
        {alerts.length === 0 && (
          <p className="text-muted-foreground">No alerts yet. Trigger one above.</p>
        )}
        <ul className="space-y-3">
          {alerts.map((a) => (
            <li key={a.id} className="clay-card flex items-start gap-4 p-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{a.title}</h3>
                  <Badge variant={a.severity}>{a.severity}</Badge>
                  <Badge variant="neutral">ZIP {a.zip_code}</Badge>
                  {!a.is_active && <Badge variant="neutral">inactive</Badge>}
                </div>
                <p className="mt-1 text-base text-muted-foreground">{a.message}</p>
              </div>
              {a.is_active && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Deactivate alert"
                  onClick={() => deactivate(a.id)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-10 text-center text-sm text-muted-foreground">
        Hidden demo route · stores only non-PII alert data
      </footer>
    </main>
  );
}
