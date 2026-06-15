"use client";

import * as React from "react";
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
        "flex min-h-tap cursor-pointer items-center gap-4 rounded-md border border-white/70 bg-card p-3 shadow-clay-sm transition-all hover:brightness-[1.02] active:translate-y-0.5",
        checked && "bg-primary/5",
        className,
      )}
    >
      <button
        type="button"
        id={id}
        role="checkbox"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.7rem] transition-all",
          checked
            ? "bg-primary text-white shadow-clay-primary"
            : "bg-card text-transparent shadow-clay-inset",
        )}
      >
        {checked && <Check className="h-5 w-5" strokeWidth={3} />}
      </button>
      <span className={cn("text-lg", checked && "text-muted-foreground line-through")}>
        {label}
      </span>
    </label>
  );
}
