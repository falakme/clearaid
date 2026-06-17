"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, FileSearch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Item, Stagger } from "@/components/motion";
import type { TranslateResult } from "@/lib/types";
import { ProcessDiagram } from "../process-diagram";
import { TaskList } from "../task-list";

/**
 * Tab 2 — Tasks.
 * The visual step-by-step path, the interactive action checklist (controlled;
 * progress is owned by the orchestrator), and the Source Transparency toggle
 * directly below the checklist.
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

  return (
    <Stagger className="space-y-5">
      {hasSteps && (
        <Item>
          <ProcessDiagram steps={result.diagram_steps} />
        </Item>
      )}

      {hasTasks && (
        <Item>
          <TaskList
            tasks={result.task_list}
            checked={checked}
            onToggle={onToggle}
            storageKey={storageKey}
          />
        </Item>
      )}

      {!hasTasks && !hasSteps && (
        <Item>
          <Card>
            <p className="text-base text-muted-foreground">
              No specific action steps were found in this document. Check the Summary tab
              for the full explanation.
            </p>
          </Card>
        </Item>
      )}

      {/* Source transparency — directly below the checklist */}
      <Item>
        <Card>
          <button
            onClick={() => setShowSource((s) => !s)}
            className="flex min-h-tap w-full items-center justify-between rounded-md text-left text-base font-semibold text-muted-foreground hover:text-foreground"
            aria-expanded={showSource}
          >
            <span className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" /> Show original source
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
                <p className="mb-2 mt-3 text-sm text-muted-foreground">
                  The exact text ClearAid read to generate your plan. Verify any deadline
                  or figure against this source.
                </p>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-4 text-sm text-muted-foreground">
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
