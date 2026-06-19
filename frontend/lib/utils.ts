import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


/**
 * True only for a plain http(s) URL. Used to gate any model-provided link
 * before it is rendered as an href, blocking javascript:, data:, and other
 * dangerous schemes (security hardening for untrusted AI output).
 */
export function isSafeHttpUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
