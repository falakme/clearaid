"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** A clay-styled progress bar, animated to its value. */
export function Progress({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn("h-3 w-full overflow-hidden rounded-full bg-muted shadow-clay-inset", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 200, damping: 26 }}
      />
    </div>
  );
}
