"use client";

import { SettingsTab } from "@/components/translator/tabs/settings-tab";
import { createTranslator } from "@/lib/i18n";
import { useTranslator } from "@/lib/translator-context";

/** `/dash/settings` — print/export, start-new, erase-data, disclaimer. */
export default function DashSettingsPage() {
  const { handleReset, language } = useTranslator();
  const t = createTranslator(language);
  return <SettingsTab onReset={handleReset} t={t} />;
}
