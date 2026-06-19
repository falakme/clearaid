"use client";

import { useEffect, useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTranslator } from "@/lib/i18n";
import {
  clearHistory,
  deleteHistoryEntry,
  getHistory,
} from "@/lib/storage";
import type { HistoryEntry } from "@/lib/types";

/** Map doc category to a short display label. */
const CATEGORY_LABEL: Record<string, string> = {
  eviction:       "Eviction",
  housing:        "Housing",
  medical:        "Medical",
  food_assistance:"Food",
  utility:        "Utility",
  legal:          "Legal",
  benefits:       "Benefits",
  general:        "General",
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

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60)     return "Just now";
  if (secs < 3600)   return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400)  return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function HistoryView({
  language,
  onLoad,
}: {
  language: string;
  onLoad: (entry: HistoryEntry) => void;
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

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <FileText className="h-12 w-12 opacity-20" />
          <p className="text-sm font-medium">{t("history_empty")}</p>
        </div>
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
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        CATEGORY_COLOR[cat] ?? CATEGORY_COLOR.general
                      }`}
                    >
                      {CATEGORY_LABEL[cat] ?? cat}
                    </span>
                    {isUrgent && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                        Urgent
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{timeAgo(entry.timestamp)}</span>
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
                    aria-label="Delete entry"
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
