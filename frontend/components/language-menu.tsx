"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Languages, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANGUAGES } from "@/lib/languages";

/**
 * Compact, icon-only output-language toggle for the dashboard header.
 *
 * Replaces the wide native <select> (which overlapped the title on small
 * viewports) with a single Languages-icon button that opens a clean floating
 * dropdown panel. On the dashboard, choosing a language re-translates in place,
 * so `busy` swaps the icon for a spinner.
 */
export function LanguageMenu({
  value,
  onChange,
  busy = false,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  busy?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Output language: ${value}`}
        title={`Language: ${value}`}
        className="flex min-h-tap min-w-tap items-center justify-center rounded-md bg-card text-foreground shadow-clay-sm transition-all active:translate-y-0.5 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Languages className="h-5 w-5 text-primary" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Output language"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 max-h-72 w-44 overflow-y-auto rounded-md border border-white/70 bg-card p-1.5 shadow-clay-lg"
        >
          {LANGUAGES.map((l) => {
            const active = l === value;
            return (
              <button
                key={l}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  onChange(l);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted/60",
                )}
              >
                <span className="truncate">{l}</span>
                {active && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
