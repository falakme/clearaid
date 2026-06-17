"use client";

import { RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataPurgeButton } from "@/components/data-purge-button";
import { Item, Stagger } from "@/components/motion";

/**
 * Tab 4 — Settings.
 * Reset to the intake screen (State 0), the "Erase my data" panic button
 * (clears localStorage), and the standard disclaimers.
 */
export function SettingsTab({ onReset }: { onReset: () => void }) {
  return (
    <Stagger className="space-y-5">
      <Item>
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary">Document</h2>
          <p className="mb-4 mt-1 text-base text-muted-foreground">
            Done with this one? Start over with a new letter, bill, or form.
          </p>
          <Button className="w-full" onClick={onReset}>
            <RotateCcw className="h-5 w-5" /> Translate another document
          </Button>
        </Card>
      </Item>

      <Item>
        <Card>
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
            Privacy &amp; data
          </h2>
          <p className="mb-4 mt-1 text-base text-muted-foreground">
            ClearAid is stateless and stores nothing on our servers. The only thing kept
            on this device is your checklist progress. You can wipe it anytime.
          </p>
          <DataPurgeButton className="w-full justify-center rounded-md border border-white/70 bg-card py-3 shadow-clay-sm" />
        </Card>
      </Item>

      <Item>
        <div className="space-y-2 px-1 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-1.5 font-semibold">
            <ShieldCheck className="h-4 w-4" /> Private by design
          </p>
          <p>
            ClearAid only explains and organizes. It never submits anything — you stay in
            control of signing and submitting. It does not provide official medical, legal,
            or financial advice.
          </p>
          <p className="pt-2">
            Built for the USAII Global AI Hackathon · Crisis-to-Action Translator
          </p>
        </div>
      </Item>
    </Stagger>
  );
}
