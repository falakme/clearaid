"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * PRIVACY SAFEGUARD: any local state ClearAid keeps (e.g. checklist progress)
 * lives ONLY in the browser's localStorage. It is never sent to or stored by
 * the backend. The app itself is fully stateless.
 */

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
