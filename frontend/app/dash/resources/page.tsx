"use client";

import { ResourcesTab } from "@/components/translator/tabs/resources-tab";
import { createTranslator } from "@/lib/i18n";
import { useTranslator } from "@/lib/translator-context";

/** `/dash/resources` — verified local support + Responsible-AI controls. */
export default function DashResourcesPage() {
  const { result, recLoading, acknowledged, setAcknowledged, language } = useTranslator();
  if (!result) return null;
  const t = createTranslator(language);
  return (
    <ResourcesTab
      result={result}
      recommendationLoading={recLoading}
      acknowledged={acknowledged}
      onAcknowledgedChange={setAcknowledged}
      t={t}
    />
  );
}
