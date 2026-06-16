"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  label: React.ReactNode;
  className?: string;
}

/** Large, accessible checkbox with a 48px tap target for stressed users. */
export function Checkbox({ checked, onCheckedChange, id, label, className }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-tap cursor-pointer items-center gap-4 rounded-md border border-white/70 bg-card p-3 shadow-clay-sm transition-all hover:brightness-[1.02]",
        checked && "bg-primary/5",
        className,
      )}
    >
      <motion.button
        type="button"
        id={id}
        role="checkbox"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        whileTap={{ scale: 0.85 }}
        animate={checked ? { scale: [1, 1.18, 1] } : { scale: 1 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.7rem]",
          checked
            ? "bg-primary text-white shadow-clay-primary"
            : "bg-card text-transparent shadow-clay-inset",
        )}
      >
        <AnimatePresence>
          {checked && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 24 }}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <span className={cn("text-lg transition-colors", checked && "text-muted-foreground line-through")}>
        {label}
      </span>
    </label>
  );
}
