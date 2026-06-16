"use client";

import { Trash2 } from "lucide-react";

/**
 * "Erase My Data" — wipes ALL local data (localStorage) and reloads. Gives the
 * user a one-tap way to remove everything stored on their device.
 */
export function DataPurgeButton({ className = "" }: { className?: string }) {
  function purge() {
    if (!confirm("Erase all ClearAid data stored on this device?")) return;
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.reload();
  }

  return (
    <button
      onClick={purge}
      className={
        "inline-flex min-h-tap items-center justify-center gap-2 rounded-md text-base font-semibold text-muted-foreground hover:text-primary " +
        className
      }
    >
      <Trash2 className="h-4 w-4" /> Erase my data
    </button>
  );
}
