"use client";

import { motion } from "framer-motion";
import { Route } from "lucide-react";
import { Card } from "@/components/ui/card";
import { stripEmoji } from "@/lib/text";
import type { Translator } from "@/lib/i18n";
import type { DiagramStep } from "@/lib/types";

/**
 * Chronological process visualizer: a compact vertical timeline built from
 * plain Tailwind blocks (small numbered badges + a thin connector line).
 * FAILSAFE: renders nothing when there are no steps.
 */
export function ProcessDiagram({ steps, t }: { steps: DiagramStep[]; t: Translator }) {
  if (!steps || steps.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
        <Route className="h-4 w-4" /> {t("your_path")}
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
              className="relative flex gap-3 pb-3 last:pb-0"
            >
              {/* connector line — thin, anchored to the badge center */}
              {!last && (
                <span
                  aria-hidden
                  className="absolute left-[0.6875rem] top-7 h-[calc(100%-1.5rem)] w-px rounded bg-primary/25"
                />
              )}
              {/* node — small badge */}
              <span className="z-10 flex h-[1.375rem] w-[1.375rem] shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-clay-primary">
                {step.step_number}
              </span>
              <div className="flex-1 rounded-md border border-white/70 bg-card p-3 shadow-clay-sm">
                <p className="text-sm font-bold leading-tight">{stripEmoji(step.title)}</p>
                {step.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
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
