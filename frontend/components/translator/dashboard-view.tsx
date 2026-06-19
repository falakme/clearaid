"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { LanguageMenu } from "@/components/language-menu";
import { createTranslator, type Translator } from "@/lib/i18n";
import type { HistoryEntry, TranslateResult } from "@/lib/types";
import { BottomNav, SideNav, type TabKey } from "./bottom-nav";
import { HistoryView } from "./history-view";
import { UrgencyPill } from "./tabs/shared";
import { SummaryTab } from "./tabs/summary-tab";
import { TasksTab } from "./tabs/tasks-tab";
import { ResourcesTab } from "./tabs/resources-tab";
import { SettingsTab } from "./tabs/settings-tab";

const TAB_TITLE: Record<TabKey, Parameters<Translator>[0]> = {
  summary:   "nav_summary",
  tasks:     "title_action_plan",
  resources: "title_get_help",
  history:   "nav_history",
  settings:  "nav_settings",
};

/**
 * The dashboard shell. Adapts across screens:
 *   - phone / tablet  -> floating glassmorphic bottom nav, single column.
 *   - desktop (lg+)    -> persistent left sidebar, wider content column, and
 *                         two-column tab layouts where they help.
 *
 * The output-language selector lives up top in the header; changing it
 * re-translates in place (`refreshing`). All progress-bearing state (checked
 * tasks, acknowledgement) is owned by the orchestrator, so switching tabs never
 * wipes progress.
 */
export function DashboardView({
  result,
  recommendationLoading,
  refreshing,
  language,
  onLanguageChange,
  checked,
  onToggleTask,
  acknowledged,
  onAcknowledgedChange,
  storageKey,
  sourceText,
  onReset,
  onLoadHistory,
}: {
  result: TranslateResult;
  recommendationLoading: boolean;
  refreshing: boolean;
  language: string;
  onLanguageChange: (next: string) => void;
  checked: Record<string, boolean>;
  onToggleTask: (id: string, value: boolean) => void;
  acknowledged: boolean;
  onAcknowledgedChange: (next: boolean) => void;
  storageKey: string;
  sourceText: string;
  onReset: () => void;
  onLoadHistory: (entry: HistoryEntry) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const t = createTranslator(language);
  const hasResource =
    Boolean(result.recommended_resource_url) ||
    (result.additional_resources?.length ?? 0) > 0 ||
    (result.local_support_resources?.length ?? 0) > 0;
  const attention = { resources: hasResource && !acknowledged };

  // The urgency pill describes the current document, so it only belongs on the
  // document-specific tabs — not on History or Settings.
  const showUrgency = activeTab === "summary" || activeTab === "tasks" || activeTab === "resources";

  return (
    <div className="print-hidden mx-auto flex h-[100dvh] w-full max-w-screen-xl">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-white/50 px-5 py-6 lg:flex">
        <Brand href="/" />
        <div className="mt-8 flex-1">
          <SideNav active={activeTab} onChange={setActiveTab} attention={attention} t={t} />
        </div>
        <div className="border-t border-white/50 pt-4">
          <Button variant="ghost" size="sm" className="w-full" onClick={onReset}>
            <RotateCcw className="h-5 w-5" /> {t("new_document")}
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex w-full items-center justify-between gap-2 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] lg:px-8 lg:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Brand href="/" className="lg:hidden" />
            <h1 className="hidden text-lg font-bold tracking-tight lg:block">
              {t(TAB_TITLE[activeTab])}
            </h1>
            {showUrgency && (
              <UrgencyPill tier={result.urgency_tier} t={t} className="hidden sm:inline-flex lg:ml-1" />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageMenu value={language} onChange={onLanguageChange} busy={refreshing} />
          </div>
        </header>

        <main className="scroll-clay flex-1 overflow-y-auto px-4 pb-32 pt-1 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeTab === "summary" && <SummaryTab result={result} t={t} />}
                {activeTab === "tasks" && (
                  <TasksTab
                    result={result}
                    checked={checked}
                    onToggle={onToggleTask}
                    storageKey={storageKey}
                    sourceText={sourceText}
                    t={t}
                  />
                )}
                {activeTab === "resources" && (
                  <ResourcesTab
                    result={result}
                    recommendationLoading={recommendationLoading}
                    acknowledged={acknowledged}
                    onAcknowledgedChange={onAcknowledgedChange}
                    t={t}
                  />
                )}
                {activeTab === "history" && (
                  <HistoryView
                    language={language}
                    onLoad={(entry) => {
                      onLoadHistory(entry);
                      setActiveTab("summary");
                    }}
                  />
                )}
                {activeTab === "settings" && <SettingsTab onReset={onReset} t={t} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <BottomNav active={activeTab} onChange={setActiveTab} attention={attention} t={t} />
      </div>
    </div>
  );
}
