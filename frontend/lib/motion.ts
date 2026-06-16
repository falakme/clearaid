import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion language for ClearAid.
 * Calm and fluid — gentle springs and soft easing so animations soothe a
 * stressed user rather than startle them. All motion respects the user's
 * reduced-motion preference (configured globally in app/template.tsx).
 */

// Soft, slightly bouncy spring for puffy "clay" elements.
export const spring: Transition = {
  type: "spring",
  stiffness: 230,
  damping: 24,
  mass: 0.9,
};

// Smooth ease-out for content reveals.
export const gentle: Transition = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1],
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: gentle },
};

export const popIn: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
};

// Container that reveals its children one after another.
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.06 },
  },
};

// Forward slide used between onboarding steps / wizard phases.
export const slideStep: Variants = {
  hidden: { opacity: 0, x: 48, scale: 0.98 },
  show: { opacity: 1, x: 0, scale: 1, transition: gentle },
  exit: { opacity: 0, x: -48, scale: 0.98, transition: { duration: 0.28, ease: "easeIn" } },
};

// Cross-fade with a soft vertical drift, for swapping translator phases.
export const phaseFade: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: gentle },
  exit: { opacity: 0, y: -16, transition: { duration: 0.25, ease: "easeIn" } },
};
