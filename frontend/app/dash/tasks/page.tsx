"use client";

import { TasksTab } from "@/components/translator/tabs/tasks-tab";
import { createTranslator } from "@/lib/i18n";
import { useTranslator } from "@/lib/translator-context";

/** `/dash/tasks` — the step-by-step path + interactive checklist. */
export default function DashTasksPage() {
  const { result, checkedTasks, handleToggleTask, chatKey, sourceText, language } =
    useTranslator();
  if (!result) return null;
  const t = createTranslator(language);
  return (
    <TasksTab
      result={result}
      checked={checkedTasks}
      onToggle={handleToggleTask}
      storageKey={chatKey}
      sourceText={sourceText}
      t={t}
    />
  );
}
