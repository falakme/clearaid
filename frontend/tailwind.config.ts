import type { Config } from "tailwindcss";

// "Crisis Claymorphism" design tokens.
// Soft, puffy 3D clay surfaces (outer drop shadow + inner light/dark insets),
// very rounded shapes, calm palette, accessible sizing. NO harsh reds.
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#EEF0FB", // soft cool off-white
        foreground: "#27314A", // deep slate-indigo, high contrast & friendly
        // Accent is CSS-variable driven so the whole app can swap from the
        // calm blue scheme to the high-visibility RED emergency scheme at
        // runtime (see globals.css + components/theme.tsx).
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          foreground: "rgb(var(--color-primary-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "#F59E0B", // soft amber
          foreground: "#3D2C06",
        },
        muted: {
          DEFAULT: "#DEE2F3",
          foreground: "#5A6588",
        },
        border: "#E2E7F7",
        ring: "rgb(var(--color-ring) / <alpha-value>)",
        card: {
          DEFAULT: "#FBFCFF", // solid clay surface (catches light)
          foreground: "#27314A",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        base: ["1rem", { lineHeight: "1.6" }],
        lg: ["1.125rem", { lineHeight: "1.6" }],
        xl: ["1.25rem", { lineHeight: "1.5" }],
        "2xl": ["1.5rem", { lineHeight: "1.4" }],
        "3xl": ["1.875rem", { lineHeight: "1.3" }],
        "4xl": ["2.25rem", { lineHeight: "1.2" }],
        "5xl": ["3rem", { lineHeight: "1.1" }],
      },
      borderRadius: {
        // Restrained, modern radii — friendly but not bubble-like.
        xl: "1rem",
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.3rem",
      },
      boxShadow: {
        // Soft, subtle elevation — a light drop shadow plus a faint top
        // highlight. Replaces the older heavy "puffy clay" insets.
        clay: "0 6px 16px -8px rgba(40,48,86,0.16), inset 0 1px 0 rgba(255,255,255,0.55)",
        "clay-lg": "0 12px 28px -10px rgba(40,48,86,0.20), inset 0 1px 0 rgba(255,255,255,0.55)",
        "clay-sm": "0 3px 8px -4px rgba(40,48,86,0.13), inset 0 1px 0 rgba(255,255,255,0.45)",
        // Colored buttons get a soft tinted shadow, driven by a CSS variable
        // so it re-tints (blue -> red) with the active theme.
        "clay-primary": "var(--shadow-clay-primary)",
        "clay-warning": "0 8px 18px -8px rgba(245,158,11,0.38), inset 0 1px 0 rgba(255,255,255,0.4)",
        // Gentle pressed-in surface for inputs / active state.
        "clay-inset": "inset 0 2px 4px rgba(40,48,86,0.10)",
      },
      minHeight: {
        tap: "48px", // massive tap targets
      },
      minWidth: {
        tap: "48px",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "clay-pop": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
        "clay-pop": "clay-pop 0.25s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
