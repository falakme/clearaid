"use client";

import { HistoryView } from "@/components/translator/history-view";
import { useTranslator } from "@/lib/translator-context";

/** `/dash/history` — past documents; loading one swaps the active session. */
export default function DashHistoryPage() {
  const { language, handleLoadHistory, goHome } = useTranslator();
  return <HistoryView language={language} onLoad={handleLoadHistory} onCreateChat={goHome} />;
}
