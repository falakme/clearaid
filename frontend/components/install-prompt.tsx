"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "clearaid.installDismissed";

/**
 * Floating "Add to Home Screen" prompt. Appears only when the browser fires
 * `beforeinstallprompt` (i.e. the PWA is installable and not yet installed).
 * Dismissal is remembered so we don't nag the user.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 240, damping: 24 }}
          className="clay-card fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 p-4 sm:left-auto sm:right-4"
          role="dialog"
          aria-label="Install ClearAid"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary shadow-clay-sm">
            <Download className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="font-bold leading-tight">Install ClearAid</p>
            <p className="text-sm text-muted-foreground">
              Add it to your home screen for quick, offline-friendly access.
            </p>
          </div>
          <button
            onClick={install}
            className="min-h-tap rounded-md bg-primary px-4 font-bold text-primary-foreground shadow-clay-primary active:translate-y-0.5"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex min-h-tap min-w-tap items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
