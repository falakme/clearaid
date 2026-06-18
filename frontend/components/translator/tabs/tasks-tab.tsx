"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, FileSearch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Item, Stagger } from "@/components/motion";
import { cn } from "@/lib/utils";
import type { TranslateResult } from "@/lib/types";
import { ProcessDiagram } from "../process-diagram";
import { TaskList } from "../task-list";

/**
 * Tab 2 — Tasks.
 * The visual step-by-step path, the interactive checklist (controlled; progress
 * lives in the orchestrator), and a Source Transparency toggle. On desktop the
 * path and checklist sit side by side.
 */
export function TasksTab({
  result,
  checked,
  onToggle,
  storageKey,
  sourceText,
}: {
  result: TranslateResult;
  checked: Record<string, boolean>;
  onToggle: (id: string, value: boolean) => void;
  storageKey: string;
  sourceText: string;
}) {
  const [showSource, setShowSource] = useState(false);
  const hasTasks = result.task_list.length > 0;
  const hasSteps = result.diagram_steps.length > 0;
  const twoCol = hasTasks && hasSteps;

  return (
    <Stagger className={cn("grid gap-5", twoCol && "lg:grid-cols-2 lg:items-start")}>
      {hasSteps && (
        <Item>
          <ProcessDiagram steps={result.diagram_steps} />
        </Item>
      )}

      <Item className="space-y-5">
        {hasTasks && (
          <TaskList
            tasks={result.task_list}
            checked={checked}
            onToggle={onToggle}
            storageKey={storageKey}
          />
        )}

        {!hasTasks && !hasSteps && (
          <Card>
            <p className="text-sm text-muted-foreground">
              This document doesn&apos;t call for specific action steps. Head to the
              Summary tab for the full explanation.
            </p>
          </Card>
        )}

        {/* Source transparency — verify the AI against the original text */}
        <Card>
          <button
            onClick={() => setShowSource((s) => !s)}
            className="flex min-h-tap w-full items-center justify-between rounded-md text-left text-sm font-semibold text-muted-foreground hover:text-foreground"
            aria-expanded={showSource}
          >
            <span className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" /> Compare with the original
            </span>
            <ChevronDown
              className={"h-5 w-5 transition-transform " + (showSource ? "rotate-180" : "")}
            />
          </button>
          <AnimatePresence initial={false}>
            {showSource && (
              <motion.div
                key="src"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <p className="mb-2 mt-3 text-xs text-muted-foreground">
                  This is the exact text ClearAid read. Always check dates and dollar
                  amounts against it.
                </p>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-4 text-xs text-muted-foreground">
                  {sourceText}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </Item>
    </Stagger>
  );
}
