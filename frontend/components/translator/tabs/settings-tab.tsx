"use client";

import Link from "next/link";
import { Printer, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataPurgeButton } from "@/components/data-purge-button";
import { Item, Stagger } from "@/components/motion";
import type { Translator } from "@/lib/i18n";

/**
 * Tab 4 — Settings.
 * Print/export, reset to the start screen, the "erase my data" panic button,
 * and the disclaimer.
 */
export function SettingsTab({ onReset, t }: { onReset: () => void; t: Translator }) {
  return (
    <Stagger className="space-y-5">
      <Item>
        <Card>
          <h2 className="text-xs font-semibold uppercase text-primary">
            {t("this_document")}
          </h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("this_document_hint")}</p>
          <div className="space-y-3">
            <Button variant="outline" className="w-full" onClick={() => window.print()}>
              <Printer className="h-5 w-5" /> {t("print_save_pdf")}
            </Button>
            <Button className="w-full" onClick={onReset}>
              <RotateCcw className="h-5 w-5" /> {t("start_new_document")}
            </Button>
          </div>
        </Card>
      </Item>

      <Item>
        <Card>
          <h2 className="text-xs font-semibold uppercase text-primary">
            {t("your_privacy")}
          </h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("your_privacy_hint")}</p>
          <DataPurgeButton
            label={t("erase_data")}
            confirmText={t("erase_confirm")}
            className="w-full justify-center rounded-md border border-white/70 bg-card py-3 shadow-clay-sm"
          />
        </Card>
      </Item>

      <Item>
        <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5 font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" /> {t("explains_you_decide")}
          </p>
          <p className="mt-2">{t("disclaimer_body")}</p>
          <nav className="mt-3 flex flex-wrap items-center gap-4 text-xs">
            <Link href="/privacy" className="hover:text-foreground">{t("privacy_policy")}</Link>
            <span aria-hidden>·</span>
            <Link href="/terms" className="hover:text-foreground">{t("terms_of_service")}</Link>
          </nav>
          <p className="mt-3 text-xs">{t("hackathon_credit")}</p>
        </footer>
      </Item>
    </Stagger>
  );
}
