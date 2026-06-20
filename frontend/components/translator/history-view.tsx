"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTranslator, type Translator, type UiKey } from "@/lib/i18n";
import {
  clearHistory,
  deleteHistoryEntry,
  getHistory,
} from "@/lib/storage";
import type { HistoryEntry } from "@/lib/types";
import { EmptyState } from "./empty-workspace";

/** Map a document category to its localized label key. */
const CATEGORY_KEY: Record<string, UiKey> = {
  eviction: "cat_eviction",
  housing: "cat_housing",
  medical: "cat_medical",
  food_assistance: "cat_food",
  utility: "cat_utility",
  legal: "cat_legal",
  benefits: "cat_benefits",
  general: "cat_general",
};

const CATEGORY_COLOR: Record<string, string> = {
  eviction:       "bg-red-100 text-red-700",
  housing:        "bg-blue-100 text-blue-700",
  medical:        "bg-purple-100 text-purple-700",
  food_assistance:"bg-green-100 text-green-700",
  utility:        "bg-yellow-100 text-yellow-700",
  legal:          "bg-indigo-100 text-indigo-700",
  benefits:       "bg-teal-100 text-teal-700",
  general:        "bg-gray-100 text-gray-700",
};

/** Localized relative time. Falls back to a short date for older entries. */
function timeAgo(ts: number, t: Translator): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60)     return t("time_just_now");
  if (secs < 3600)   return t("time_minutes_ago", { n: Math.floor(secs / 60) });
  if (secs < 86400)  return t("time_hours_ago", { n: Math.floor(secs / 3600) });
  if (secs < 604800) return t("time_days_ago", { n: Math.floor(secs / 86400) });
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function HistoryView({
  language,
  onLoad,
  onCreateChat,
}: {
  language: string;
  onLoad: (entry: HistoryEntry) => void;
  onCreateChat?: () => void;
}) {
  const t = createTranslator(language);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  // Read from localStorage on mount (client-only).
  useEffect(() => {
    setEntries(getHistory());
  }, []);

  function handleDelete(id: string) {
    deleteHistoryEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleClearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    clearHistory();
    setEntries([]);
    setConfirmClear(false);
  }

  return (
    <div className="space-y-4">
      {/* Compact actions row — the tab title already appears in the header,
          so we don't repeat the word "History" here. */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {entries.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className={confirmClear ? "text-red-600 hover:text-red-700" : "text-muted-foreground"}
          >
            <Trash2 className="h-4 w-4" />
            {confirmClear ? t("history_confirm_clear") : t("history_clear_all")}
          </Button>
        </div>
      )}

      {/* Empty state — skeleton + invitation to create the first chat */}
      {entries.length === 0 && (
        <EmptyState t={t} onCreate={onCreateChat ?? (() => {})} />
      )}

      {/* Entry list */}
      <div className="space-y-2">
        {entries.map((entry) => {
          const cat = entry.result.document_category ?? "general";
          const brief = entry.result.plain_language_brief ?? "";
          const tier = entry.result.urgency_tier ?? "";
          const isUrgent = tier === "Urgent Action Required";

          return (
            <div
              key={entry.id}
              className="group rounded-md border border-border bg-card/80 p-3 transition-shadow hover:shadow-clay-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {/* Badges row */}
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        CATEGORY_COLOR[cat] ?? CATEGORY_COLOR.general
                      }`}
                    >
                      {t(CATEGORY_KEY[cat] ?? "cat_general")}
                    </span>
                    {isUrgent && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">
                        {t("history_urgent")}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{timeAgo(entry.timestamp, t)}</span>
                  </div>

                  {/* Brief */}
                  <p className="line-clamp-2 text-sm text-foreground/80">
                    {brief || t("history_no_brief")}
                  </p>

                  {/* Task progress */}
                  {entry.result.task_list.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Object.values(entry.checkedTasks).filter(Boolean).length}/
                      {entry.result.task_list.length} {t("history_tasks_done")}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => onLoad(entry)}
                    className="h-8 px-3 text-xs"
                  >
                    {t("history_load")}
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    aria-label={t("history_delete")}
                    className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
