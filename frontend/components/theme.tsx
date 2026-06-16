"use client";

import { useEffect } from "react";

export type ThemeName = "default" | "emergency" | "recovery";

/**
 * Programmatically swaps the app's accent color scheme by toggling a
 * `data-theme` attribute on the <html> element. The CSS variables in
 * globals.css react to this attribute, re-tinting every accent surface
 * (buttons, borders, rings, focus states, glossy clay shadows) without
 * touching individual components.
 *
 * - `emergency` -> highly visible RED scheme (active disaster).
 * - `recovery`  -> reassuring GREEN scheme (alert resolved / recovery phase).
 * - `default`   -> calm, trustworthy blue scheme.
 *
 * Mount this once per route. It cleans up to the default scheme on unmount so
 * navigating away restores the calm palette.
 */
export function ThemeMode({ theme }: { theme: ThemeName }) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "default") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    return () => {
      root.removeAttribute("data-theme");
    };
  }, [theme]);

  return null;
}
