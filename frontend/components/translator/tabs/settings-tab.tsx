"use client";

import { Printer, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataPurgeButton } from "@/components/data-purge-button";
import { Item, Stagger } from "@/components/motion";

/**
 * Tab 4 — Settings.
 * Print/export, reset to the start screen, the "erase my data" panic button,
 * and the disclaimer.
 */
export function SettingsTab({ onReset }: { onReset: () => void }) {
  return (
    <Stagger className="space-y-5">
      <Item>
        <Card>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-primary">This document</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Save a clean copy to keep or share, or start fresh with another letter.
          </p>
          <div className="space-y-3">
            <Button variant="outline" className="w-full" onClick={() => window.print()}>
              <Printer className="h-5 w-5" /> Print or save as PDF
            </Button>
            <Button className="w-full" onClick={onReset}>
              <RotateCcw className="h-5 w-5" /> Start a new document
            </Button>
          </div>
        </Card>
      </Item>

      <Item>
        <Card>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-primary">Your privacy</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            We store nothing on our servers. The only thing saved on this device is your
            checklist progress, and you can wipe it instantly.
          </p>
          <DataPurgeButton className="w-full justify-center rounded-md border border-white/70 bg-card py-3 shadow-clay-sm" />
        </Card>
      </Item>

      <Item>
        <div className="space-y-2 px-1 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-1.5 font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> ClearAid explains, you decide
          </p>
          <p>
            ClearAid helps you understand and organize. It never files or submits anything
            for you, and it isn&apos;t a substitute for advice from a lawyer, doctor, or
            caseworker.
          </p>
          <p className="pt-2">USAII Global AI Hackathon · Crisis-to-Action Translator</p>
        </div>
      </Item>
    </Stagger>
  );
}
