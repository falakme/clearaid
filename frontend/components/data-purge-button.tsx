"use client";

import { Trash2 } from "lucide-react";

/**
 * "Erase My Data" — wipes EVERYTHING this app stored on the device and reloads.
 *
 * That means not just localStorage/sessionStorage (checklist progress) but also
 * the service worker's Cache Storage, which holds cached translation responses
 * of the user's documents. Clearing those caches and unregistering the worker
 * is what makes the privacy promise ("nothing persisted") actually hold.
 */
export function DataPurgeButton({ className = "" }: { className?: string }) {
  async function purge() {
    if (!confirm("Erase all ClarityAI data stored on this device?")) return;

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }

    try {
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {
      /* ignore */
    }

    try {
      const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
      await Promise.all(regs.map((reg) => reg.unregister()));
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
