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
        primary: {
          DEFAULT: "#2563EB", // trustworthy blue
          foreground: "#FFFFFF",
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
        ring: "#2563EB",
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
        // Very rounded — the puffy clay silhouette.
        xl: "2.25rem",
        lg: "1.75rem",
        md: "1.25rem",
        sm: "0.875rem",
      },
      boxShadow: {
        // Signature clay: soft outer drop + inner top highlight + inner bottom shade.
        clay: "0 16px 32px -12px rgba(40,48,86,0.28), inset 0 8px 16px rgba(255,255,255,0.9), inset 0 -8px 14px rgba(40,48,86,0.10)",
        "clay-lg": "0 26px 50px -14px rgba(40,48,86,0.34), inset 0 9px 18px rgba(255,255,255,0.92), inset 0 -9px 16px rgba(40,48,86,0.10)",
        "clay-sm": "0 8px 18px -8px rgba(40,48,86,0.25), inset 0 4px 8px rgba(255,255,255,0.85), inset 0 -4px 8px rgba(40,48,86,0.08)",
        // Colored buttons get a glossy tinted clay.
        "clay-primary": "0 16px 28px -10px rgba(37,99,235,0.55), inset 0 8px 14px rgba(255,255,255,0.40), inset 0 -8px 14px rgba(20,46,120,0.45)",
        "clay-warning": "0 16px 28px -10px rgba(245,158,11,0.50), inset 0 8px 14px rgba(255,255,255,0.55), inset 0 -8px 14px rgba(161,98,7,0.40)",
        // Pressed-in surface for inputs / active state.
        "clay-inset": "inset 0 6px 12px rgba(40,48,86,0.16), inset 0 -4px 8px rgba(255,255,255,0.75)",
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
