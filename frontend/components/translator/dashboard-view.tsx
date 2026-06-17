"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brand } from "@/components/brand";
import type { TranslateResult } from "@/lib/types";
import { BottomNav, type TabKey } from "./bottom-nav";
import { UrgencyPill } from "./tabs/shared";
import { SummaryTab } from "./tabs/summary-tab";
import { TasksTab } from "./tabs/tasks-tab";
import { ResourcesTab } from "./tabs/resources-tab";
import { SettingsTab } from "./tabs/settings-tab";

/**
 * State 1 — the mobile-app dashboard. A max-w-md, full-height column with a
 * compact header, a scrollable content area, and a floating glassmorphic
 * bottom navigation. Renders one of the four tab views. All progress-bearing
 * state (checked tasks, acknowledgement, controls) is owned by the orchestrator
 * and passed in, so switching tabs never wipes the user's progress.
 */
export function DashboardView({
  result,
  recommendationLoading,
  refreshing,
  eli5,
  language,
  onEli5Change,
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
  eli5: boolean;
  language: string;
  onEli5Change: (next: boolean) => void;
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

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <Brand href="/" />
        <UrgencyPill tier={result.urgency_tier} />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-32 pt-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {activeTab === "summary" && (
              <SummaryTab
                result={result}
                eli5={eli5}
                language={language}
                onEli5Change={onEli5Change}
                onLanguageChange={onLanguageChange}
                refreshing={refreshing}
              />
            )}
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
      </main>

      <BottomNav
        active={activeTab}
        onChange={setActiveTab}
        attention={{ resources: hasResource && !acknowledged }}
      />
    </div>
  );
}
