"use client";

import { Languages, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANGUAGES, LANGUAGE_NATIVE_NAMES } from "@/lib/languages";

/**
 * Output-language selector. Lives "up top" in the header on both the intake
 * screen and the dashboard. On the dashboard, changing it re-translates in
 * place, so `busy` shows a spinner instead of the globe icon.
 */
export function LanguageSelect({
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
  return (
    <label
      className={cn(
        "flex min-h-tap items-center gap-2 rounded-md bg-card px-3 text-sm font-semibold shadow-clay-sm",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
      ) : (
        <Languages className="h-4 w-4 shrink-0 text-primary" />
      )}
      <span className="sr-only">Output language</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Output language"
        disabled={busy}
        className="max-w-[8.5rem] bg-transparent py-2 pr-1 font-semibold outline-none disabled:opacity-60"
      >
        {LANGUAGES.map((l) => (
          <option key={l} value={l}>
            {LANGUAGE_NATIVE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
