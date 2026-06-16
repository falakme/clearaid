"use client";

import { motion } from "framer-motion";
import { Route } from "lucide-react";
import { Card } from "@/components/ui/card";
import { stripEmoji } from "@/lib/text";
import type { DiagramStep } from "@/lib/types";

/**
 * Chronological process visualizer: a vertical timeline built from plain
 * Tailwind blocks (numbered nodes + connector lines).
 * FAILSAFE: renders nothing when there are no steps.
 */
export function ProcessDiagram({ steps }: { steps: DiagramStep[] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
        <Route className="h-4 w-4" /> Your step-by-step path
      </h2>

      <ol className="relative">
        {steps.map((step, i) => {
          const last = i === steps.length - 1;
          return (
            <motion.li
              key={`${step.step_number}-${i}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 240, damping: 24 }}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              {/* connector line */}
              {!last && (
                <span
                  aria-hidden
                  className="absolute left-[1.375rem] top-12 h-[calc(100%-2.5rem)] w-0.5 rounded bg-primary/25"
                />
              )}
              {/* node */}
              <span className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-primary-foreground shadow-clay-primary">
                {step.step_number}
              </span>
              <div className="flex-1 rounded-md border border-white/70 bg-card p-4 shadow-clay-sm">
                <p className="text-lg font-bold">{stripEmoji(step.title)}</p>
                {step.description && (
                  <p className="mt-1 text-base text-muted-foreground">
                    {stripEmoji(step.description)}
                  </p>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </Card>
  );
}
