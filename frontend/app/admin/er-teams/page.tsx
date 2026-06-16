"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Plus, Power, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CityAlertMap } from "@/components/admin/city-alert-map";
import { spring } from "@/lib/motion";
import type { GeoArea } from "@/lib/geo";
import type { ErTeam } from "@/lib/types";

interface TeamForm {
  org_name: string;
  assigned_city: string;
  region: string;
  country: string;
  label: string;
  clerk_user_id: string;
}

const BLANK: TeamForm = {
  org_name: "",
  assigned_city: "",
  region: "",
  country: "",
  label: "",
  clerk_user_id: "",
};

/**
 * Admin ER-team management. Admins create an ER team, assign it a city (via
 * the map), optionally link a Clerk user id, and toggle/delete teams.
 */
export default function ErTeamsAdminPage() {
  const [teams, setTeams] = useState<ErTeam[]>([]);
  const [form, setForm] = useState<TeamForm>(BLANK);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/er-teams", { cache: "no-store" });
      if (res.ok) setTeams(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function applyArea(a: GeoArea) {
    setForm((f) => ({
      ...f,
      assigned_city: a.city,
      region: a.region,
      country: a.country,
      label: a.label,
    }));
  }

  async function create() {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/er-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_name: form.org_name,
          assigned_city: form.assigned_city,
          region: form.region,
          country: form.country,
          clerk_user_id: form.clerk_user_id.trim() || null,
          is_active: true,
        }),
      });
      if (res.ok) {
        setStatus(`Created ${form.org_name} for ${form.label || form.assigned_city}.`);
        setForm(BLANK);
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

  async function toggle(team: ErTeam) {
    await fetch(`/api/admin/er-teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !team.is_active }),
    });
    await load();
  }

  async function linkUser(team: ErTeam) {
    const id = prompt(
      `Link a Clerk user id to "${team.org_name}" (leave blank to unlink):`,
      team.clerk_user_id ?? "",
    );
    if (id === null) return;
    await fetch(`/api/admin/er-teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clerk_user_id: id.trim() || null }),
    });
    await load();
  }

  async function remove(team: ErTeam) {
    if (!confirm(`Delete ER team "${team.org_name}"?`)) return;
    await fetch(`/api/admin/er-teams/${team.id}`, { method: "DELETE" });
    await load();
  }

  const canCreate = !busy && !!form.org_name.trim() && !!form.assigned_city;

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <Users className="h-5 w-5 text-primary" /> Create an ER team
        </h2>
        <p className="mb-4 text-base text-muted-foreground">
          Assign a responder organisation to a city. They&apos;ll trigger localized
          alerts for that city from the ER dashboard.
        </p>

        <label className="block">
          <span className="mb-1 block font-semibold">Organisation name</span>
          <Input
            value={form.org_name}
            placeholder="e.g. Red Cross Dallas"
            onChange={(e) => setForm({ ...form, org_name: e.target.value })}
          />
        </label>

        <div className="mt-4">
          <span className="mb-2 flex items-center gap-2 font-semibold">
            <MapPin className="h-5 w-5 text-primary" /> Assigned city
          </span>
          <CityAlertMap
            area={
              form.assigned_city
                ? {
                    city: form.assigned_city,
                    region: form.region,
                    country: form.country,
                    label: form.label,
                  }
                : null
            }
            onArea={applyArea}
          />
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block font-semibold">
            Clerk user id <span className="font-normal text-muted-foreground">(optional — link now or later)</span>
          </span>
          <Input
            value={form.clerk_user_id}
            placeholder="user_..."
            onChange={(e) => setForm({ ...form, clerk_user_id: e.target.value })}
          />
        </label>

        {status && <p className="mt-4 rounded-md bg-primary/5 p-3 text-base">{status}</p>}

        <Button size="lg" className="mt-5 w-full" onClick={create} disabled={!canCreate}>
          <Plus className="h-5 w-5" />
          {busy ? "Creating…" : "Create ER team"}
        </Button>
      </Card>

      <section>
        <h2 className="mb-3 text-xl font-bold">ER teams ({teams.length})</h2>
        {teams.length === 0 && (
          <p className="text-muted-foreground">No ER teams yet. Create one above.</p>
        )}
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {teams.map((t) => (
              <motion.li
                key={t.id}
                layout
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, height: 0, marginTop: 0 }}
                transition={spring}
                className={"clay-card flex items-start gap-4 p-4 " + (t.is_active ? "" : "opacity-60")}
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{t.org_name}</h3>
                    <Badge variant="info">
                      {[t.assigned_city, t.region, t.country].filter(Boolean).join(", ")}
                    </Badge>
                    {t.clerk_user_id ? (
                      <Badge variant="success">linked</Badge>
                    ) : (
                      <Badge variant="neutral">unlinked</Badge>
                    )}
                    {!t.is_active && <Badge variant="neutral">inactive</Badge>}
                  </div>
                  {t.clerk_user_id && (
                    <p className="mt-1 break-all text-sm text-muted-foreground">
                      {t.clerk_user_id}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button variant="ghost" size="icon" aria-label="Link user" onClick={() => linkUser(t)}>
                    <Users className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t.is_active ? "Deactivate" : "Activate"}
                    onClick={() => toggle(t)}
                  >
                    <Power className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove(t)}>
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
