"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * PRIVACY SAFEGUARD: any local state ClarityAI keeps (e.g. checklist progress)
 * lives ONLY in the browser's localStorage. It is never sent to or stored by
 * the backend. The app itself is fully stateless.
 */

/**
 * Generic sessionStorage-backed state hook. Values persist for the tab lifetime
 * (survives mobile file-picker round-trips that kill JS context) but do not
 * carry across browser sessions.
 */
export function useSessionStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.sessionStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [key],
  );

  const clear = useCallback(() => {
    setValue(initial);
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, update, clear] as const;
}

/**
 * Generic localStorage-backed state hook (used for checklist progress so a
 * user's checkbox ticks survive a refresh — never leaves the device).
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [key],
  );

  return [value, update, loaded] as const;
}


// ---------------------------------------------------------------------------
// Session persistence & history
// ---------------------------------------------------------------------------

import type { HistoryEntry, TranslateResult } from "@/lib/types";

const CURRENT_KEY = "clarityai.current";
const HISTORY_KEY = "clarityai.history";
const MAX_HISTORY = 30;

// --- Current result (survives refresh) -------------------------------------

export function saveCurrentResult(
  result: TranslateResult,
  checkedTasks: Record<string, boolean>,
): void {
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify({ result, checkedTasks }));
  } catch {
    /* ignore quota errors */
  }
}

export function loadCurrentSession(): {
  result: TranslateResult;
  checkedTasks: Record<string, boolean>;
} | null {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Validate minimal shape
    if (parsed?.result?.urgency_tier) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function clearCurrentSession(): void {
  try {
    localStorage.removeItem(CURRENT_KEY);
  } catch {
    /* ignore */
  }
}

// --- Current history-entry ID (survives refresh, drives per-doc chat key) ----

const CURRENT_ID_KEY = "clarityai.current.id";

export function saveCurrentHistoryId(id: string): void {
  try { localStorage.setItem(CURRENT_ID_KEY, id); } catch { /* ignore */ }
}

export function loadCurrentHistoryId(): string | null {
  try { return localStorage.getItem(CURRENT_ID_KEY); } catch { return null; }
}

export function clearCurrentHistoryId(): void {
  try { localStorage.removeItem(CURRENT_ID_KEY); } catch { /* ignore */ }
}

// --- History array ---------------------------------------------------------

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Prepend a new entry and return its generated ID. */
export function addToHistory(
  result: TranslateResult,
  checkedTasks: Record<string, boolean>,
): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const entry: HistoryEntry = { id, timestamp: Date.now(), result, checkedTasks };
  try {
    const history = getHistory();
    history.unshift(entry);
    history.splice(MAX_HISTORY); // cap at 30 entries
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* ignore */
  }
  return id;
}

/** Overwrite an existing entry's result and checkedTasks (e.g. after recommendation). */
export function updateHistoryEntry(
  id: string,
  result: TranslateResult,
  checkedTasks: Record<string, boolean>,
): void {
  try {
    const history = getHistory();
    const idx = history.findIndex((e) => e.id === id);
    if (idx !== -1) {
      history[idx] = { ...history[idx], result, checkedTasks };
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  } catch {
    /* ignore */
  }
}

export function deleteHistoryEntry(id: string): void {
  try {
    const history = getHistory().filter((e) => e.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* ignore */
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}
