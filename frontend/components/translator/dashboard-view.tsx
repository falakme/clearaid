"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Printer, RotateCcw } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { LanguageSelect } from "@/components/language-select";
import type { TranslateResult } from "@/lib/types";
import { BottomNav, SideNav, type TabKey } from "./bottom-nav";
import { UrgencyPill } from "./tabs/shared";
import { SummaryTab } from "./tabs/summary-tab";
import { TasksTab } from "./tabs/tasks-tab";
import { ResourcesTab } from "./tabs/resources-tab";
import { SettingsTab } from "./tabs/settings-tab";

const TAB_TITLE: Record<TabKey, string> = {
  summary: "Summary",
  tasks: "Your action plan",
  resources: "Get help",
  settings: "Settings",
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
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const hasResource = Boolean(result.recommended_resource_url);
  const attention = { resources: hasResource && !acknowledged };

  const print = () => window.print();

  return (
    <div className="print-hidden mx-auto flex h-[100dvh] w-full max-w-screen-xl">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-white/50 px-5 py-6 lg:flex">
        <Brand href="/" />
        <div className="mt-8 flex-1">
          <SideNav active={activeTab} onChange={setActiveTab} attention={attention} />
        </div>
        <div className="space-y-2 border-t border-white/50 pt-4">
          <Button variant="outline" size="sm" className="w-full" onClick={print}>
            <Printer className="h-5 w-5" /> Print plan
          </Button>
          <Button variant="ghost" size="sm" className="w-full" onClick={onReset}>
            <RotateCcw className="h-5 w-5" /> New document
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 px-4 py-3 lg:px-8 lg:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <Brand href="/" className="lg:hidden" />
            <h1 className="hidden text-2xl font-extrabold tracking-tight lg:block">
              {TAB_TITLE[activeTab]}
            </h1>
            <UrgencyPill tier={result.urgency_tier} className="hidden sm:inline-flex lg:ml-1" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSelect value={language} onChange={onLanguageChange} busy={refreshing} />
            <button
              type="button"
              onClick={print}
              aria-label="Print plan"
              className="flex min-h-tap min-w-tap items-center justify-center rounded-md bg-card text-foreground shadow-clay-sm active:translate-y-0.5 lg:hidden"
            >
              <Printer className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="scroll-clay flex-1 overflow-y-auto px-4 pb-32 pt-1 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {activeTab === "summary" && <SummaryTab result={result} />}
                {activeTab === "tasks" && (
                  <TasksTab
                    result={result}
                    checked={checked}
                    onToggle={onToggleTask}
                    storageKey={storageKey}
                    sourceText={sourceText}
                  />
                )}
                {activeTab === "resources" && (
                  <ResourcesTab
                    result={result}
                    recommendationLoading={recommendationLoading}
                    acknowledged={acknowledged}
                    onAcknowledgedChange={onAcknowledgedChange}
                  />
                )}
                {activeTab === "settings" && <SettingsTab onReset={onReset} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <BottomNav active={activeTab} onChange={setActiveTab} attention={attention} />
      </div>
    </div>
  );
}
