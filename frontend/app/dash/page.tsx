"use client";

import { SummaryTab } from "@/components/translator/tabs/summary-tab";
import { createTranslator } from "@/lib/i18n";
import { useTranslator } from "@/lib/translator-context";

/** `/dash` — Summary: urgency banner, plain-language explanation, breakdown. */
export default function DashSummaryPage() {
  const { result, language } = useTranslator();
  if (!result) return null;
  const t = createTranslator(language);
  return <SummaryTab result={result} t={t} language={language} />;
}
