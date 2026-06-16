"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Pencil, Send, Trash2, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { spring } from "@/lib/motion";
import type { Alert } from "@/lib/types";

type Severity = "info" | "warning" | "success";

interface AlertForm {
  zip_code: string;
  title: string;
  message: string;
  severity: Severity;
  programs_open: number;
}

const BLANK: AlertForm = {
  zip_code: "77001",
  title: "",
  message: "",
  severity: "info",
  programs_open: 0,
};

const PRESETS: { label: string; data: AlertForm }[] = [
  {
    label: "Hurricane lifted",
    data: {
      zip_code: "77001",
      title: "Hurricane warning lifted",
      message: "Hurricane warning lifted. 3 aid programs now open for your zip code.",
      severity: "success",
      programs_open: 3,
    },
  },
  {
    label: "Flood recovery",
    data: {
      zip_code: "70112",
      title: "Flood recovery assistance open",
      message: "Federal flood recovery assistance is now accepting applications.",
      severity: "info",
      programs_open: 2,
    },
  },
  {
    label: "Evacuation order",
    data: {
      zip_code: "33101",
      title: "Voluntary evacuation in effect",
      message: "A voluntary evacuation is in effect. Shelters are open nearby.",
      severity: "warning",
      programs_open: 0,
    },
  },
];


export default function AlertsManagerPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [form, setForm] = useState<AlertForm>(PRESETS[0].data);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/alerts", { cache: "no-store" });
    if (res.ok) setAlerts(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setForm(BLANK);
    setEditingId(null);
  }

  async function submit() {
    setBusy(true);
    setStatus("");
    try {
      const url = editingId ? `/api/admin/alerts/${editingId}` : "/api/admin/alerts";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus(editingId ? "Alert updated." : "Alert triggered — live on the dashboard within seconds.");
        resetForm();
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

  function startEdit(a: Alert) {
    setEditingId(a.id);
    setForm({
      zip_code: a.zip_code,
      title: a.title,
      message: a.message,
      severity: a.severity,
      programs_open: a.programs_open,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleActive(a: Alert) {
    await fetch(`/api/admin/alerts/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !a.is_active }),
    });
    await load();
  }

  async function remove(a: Alert) {
    if (!confirm(`Permanently delete "${a.title}"?`)) return;
    await fetch(`/api/admin/alerts/${a.id}`, { method: "DELETE" });
    if (editingId === a.id) resetForm();
    await load();
  }


  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {editingId ? "Edit alert" : "Trigger an alert"}
          </h2>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="h-4 w-4" /> Cancel edit
            </Button>
          )}
        </div>

        {!editingId && (
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                onClick={() => setForm(p.data)}
              >
                <Zap className="h-4 w-4" /> {p.label}
              </Button>
            ))}
          </div>
        )}

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

        <div className="mt-4">
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
        </div>

        {status && <p className="mt-4 rounded-md bg-primary/5 p-3 text-base">{status}</p>}

        <Button
          size="lg"
          className="mt-5 w-full"
          onClick={submit}
          disabled={busy || !form.title.trim() || !form.message.trim() || !form.zip_code}
        >
          <Send className="h-5 w-5" />
          {busy ? "Saving…" : editingId ? "Save changes" : "Trigger alert"}
        </Button>
      </Card>

      <section>
        <h2 className="mb-3 text-xl font-bold">All alerts ({alerts.length})</h2>
        {alerts.length === 0 && (
          <p className="text-muted-foreground">No alerts yet. Trigger one above.</p>
        )}
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {alerts.map((a) => (
              <motion.li
                key={a.id}
                layout
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, height: 0, marginTop: 0 }}
                transition={spring}
                className={
                  "clay-card flex items-start gap-4 p-4 " + (a.is_active ? "" : "opacity-60")
                }
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{a.title}</h3>
                    <Badge variant={a.severity}>{a.severity}</Badge>
                    <Badge variant="neutral">ZIP {a.zip_code}</Badge>
                    {a.programs_open > 0 && (
                      <Badge variant="success">{a.programs_open} open</Badge>
                    )}
                    {!a.is_active && <Badge variant="neutral">inactive</Badge>}
                  </div>
                  <p className="mt-1 text-base text-muted-foreground">{a.message}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={a.is_active ? "Deactivate" : "Activate"}
                    onClick={() => toggleActive(a)}
                  >
                    {a.is_active ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit"
                    onClick={() => startEdit(a)}
                  >
                    <Pencil className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete"
                    onClick={() => remove(a)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>
    </div>
  );
}
