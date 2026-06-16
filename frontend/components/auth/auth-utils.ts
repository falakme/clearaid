import { useEffect, useState } from "react";

/** Extracts a friendly message from a Clerk error. */
export function clerkErrorMessage(err: unknown): string {
  const e = err as {
    errors?: { longMessage?: string; message?: string }[];
    message?: string;
  };
  return (
    e?.errors?.[0]?.longMessage ||
    e?.errors?.[0]?.message ||
    e?.message ||
    "Something went wrong. Please try again."
  );
}

/**
 * Resolves the post-auth destination from the `redirect_url` query param
 * (set by the middleware / protected layouts). Only same-origin paths are
 * honored; otherwise falls back to /dashboard.
 */
export function useRedirectTarget(fallback = "/home"): string {
  const [target, setTarget] = useState(fallback);
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("redirect_url");
    if (!raw) return;
    try {
      const u = new URL(raw, window.location.origin);
      if (u.origin === window.location.origin && u.pathname !== "/signin") {
        setTarget(u.pathname + u.search);
      }
    } catch {
      if (raw.startsWith("/")) setTarget(raw);
    }
  }, []);
  return target;
}
