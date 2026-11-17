"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect } from "react";

export type ToastData = {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
  /** ms; Undo toasts use 5000 */
  duration?: number;
  tone?: "default" | "error";
};

/** One toast at a time, floating above the log bar. */
/** `offset` is the height (px) of whatever is fixed at the bottom, so the toast floats just above it. */
export function Toast({ toast, onDone, offset = 96 }: { toast: ToastData | null; onDone: () => void; offset?: number }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, toast.duration ?? 3500);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  return (
    <div
      aria-live="polite"
      style={{ bottom: `calc(${offset}px + env(safe-area-inset-bottom))` }}
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-gutter"
    >
      <AnimatePresence>
        {toast && (
          <m.div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex w-full max-w-[448px] items-center gap-3 rounded-row bg-hero py-2 pr-2 pl-4 text-on-ink shadow-[0_16px_40px_-16px_rgb(0_0_0/0.6)] ring-1 ring-ink-line/60"
          >
            {toast.tone === "error" && <span aria-hidden className="size-2 shrink-0 rounded-full bg-[var(--cat-fun)]" />}
            <p className="min-h-tap flex-1 py-2.5 text-sm">{toast.message}</p>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  onDone();
                }}
                className="h-tap shrink-0 rounded-pill px-4 text-sm font-semibold text-lime hover:bg-ink-raised"
              >
                {toast.action.label}
              </button>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
