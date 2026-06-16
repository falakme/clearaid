"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpenText, ChevronDown, ExternalLink, FileSearch, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { Item, Stagger } from "@/components/motion";
import { DataTable } from "./data-table";
import { ProcessDiagram } from "./process-diagram";
import { TaskList } from "./task-list";
import type { ReliefProgram, TranslateResult } from "@/lib/types";

interface Props {
  program: ReliefProgram;
  result: TranslateResult;
  originalText: string;
  onReset: () => void;
}

export function TranslatorResult({ program, result, originalText, onReset }: Props) {
  const [showSource, setShowSource] = useState(false);
  const sourceText = result.source_text || originalText;

  return (
    <Stagger className="space-y-5">
      {/* 1. Plain-language explanation (Markdown) */}
      <Item>
        <Card>
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
            <BookOpenText className="h-4 w-4" /> What this means
          </h2>
          <Markdown>{result.plain_language_explanation_markdown}</Markdown>
        </Card>
      </Item>

      {/* 2. Process visualizer (renders only when steps exist) */}
      <Item>
        <ProcessDiagram steps={result.diagram_steps} />
      </Item>

      {/* 3. Interactive task list + progress (renders only when tasks exist) */}
      <Item>
        <TaskList tasks={result.task_list} storageKey={program.id} />
      </Item>

      {/* 4. Data table (renders only when headers exist) */}
      <Item>
        <DataTable data={result.table_data} />
      </Item>

      {/* Source transparency (Responsible AI) */}
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
                  The exact text ClearAid read to generate the above. Verify any deadline
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

      {/* Direct action + reset */}
      <Item>
        <a
          href={program.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          <ExternalLink className="h-5 w-5" /> Go to official site
        </a>
      </Item>

      <Item>
        <Button variant="ghost" className="w-full" onClick={onReset}>
          <RotateCcw className="h-5 w-5" /> Translate another document
        </Button>
      </Item>

      <p className="pb-4 text-center text-sm text-muted-foreground">
        ClearAid only explains and organizes. It never submits anything — you stay in
        control of signing and submitting.
      </p>
    </Stagger>
  );
}
