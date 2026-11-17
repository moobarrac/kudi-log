"use client";

import { LazyMotion } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("./motion-features").then((m) => m.default);

/**
 * Wrap screens that animate with motion. Components inside use `m.div` (not `motion.div`); the animation
 * engine arrives in its own chunk after the page has painted, which keeps Today's first load small.
 * `strict` makes a stray `motion.*` component throw in development, so the full bundle can't sneak back in.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
