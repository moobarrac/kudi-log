"use client";

import { Share, X } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import { PillButton } from "./PillButton";
import { clearDeferred, currentMode, deferred, DISMISSED_KEY, emit, store, subscribe } from "./PwaRegister";

export { recordLog } from "./PwaRegister";

// ---------- the card ----------

/** "Put Kudi Log on your home screen", shown on Today from the third log on this device. */
export function InstallCard() {
  const reduce = useReducedMotion();
  const mode = useSyncExternalStore(subscribe, currentMode, () => null);
  const [closing, setClosing] = useState(false);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    clearDeferred();
    if (outcome === "dismissed") store(DISMISSED_KEY, String(Date.now()));
    emit();
  }

  function dismiss() {
    setClosing(true);
    store(DISMISSED_KEY, String(Date.now()));
    emit();
  }

  return (
    <AnimatePresence initial={false}>
      {mode && !closing && (
        <m.section
          aria-label="Install Kudi Log"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-3 overflow-hidden rounded-card border border-line bg-surface p-4"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Not now"
            className="absolute top-2 right-2 grid size-tap place-items-center rounded-full text-muted hover:bg-surface-2"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 pr-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" width={44} height={44} className="size-11 shrink-0 rounded-[12px]" />
            <div>
              <p className="font-semibold">Put Kudi Log on your home screen</p>
              <p className="text-sm text-muted">Opens like an app. One tap to log.</p>
            </div>
          </div>

          {mode === "prompt" ? (
            <PillButton block size="sm" className="mt-4" onClick={install}>
              Add to home screen
            </PillButton>
          ) : (
            <p className="mt-4 rounded-row bg-surface-2 px-3.5 py-3 text-sm leading-6">
              Tap <Share size={16} aria-hidden className="mx-0.5 inline align-[-3px] text-emerald" /> <b>Share</b>, then{" "}
              <b>Add to Home Screen</b>.
            </p>
          )}
        </m.section>
      )}
    </AnimatePresence>
  );
}
