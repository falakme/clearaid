"use client";

import { motion, MotionConfig } from "framer-motion";
import { gentle } from "@/lib/motion";

/**
 * Next.js templates re-mount on every navigation, giving each route a fluid
 * entrance. MotionConfig honours the user's reduced-motion OS setting so the
 * whole app stays comfortable for sensitive users.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={gentle}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
