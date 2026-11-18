"use client";

import { useEffect } from "react";

// Kept apart from the install card (which uses motion) so the root layout doesn't pull motion into every page.

// ---------- install prompt store ----------
// Chrome/Android fire `beforeinstallprompt` once, early, on any page. We keep it here until
// the Today screen decides it's a good moment (after the third log).

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
export const emit = () => listeners.forEach((l) => l());
export const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

/** In the root layout: registers the service worker (production only) and catches the install event. */
export function PwaRegister() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // we show our own card instead of Chrome's mini-bar
      deferred = e as InstallEvent;
      emit();
    };
    const onInstalled = () => {
      deferred = null;
      store("kudi:installed", "1");
      emit();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      } else {
        // A service worker in dev serves stale pages and fights hot reload.
        navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      }
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

// ---------- per-device memory (a convenience: if storage is blocked, the card just doesn't show) ----------

const LOGS_KEY = "kudi:logs";
export const DISMISSED_KEY = "kudi:install-dismissed";
const SHOW_AFTER_LOGS = 3;
const SNOOZE_DAYS = 30;

export function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

/** Call after each successful log. Returns the new count on this device. */
export function recordLog(): number {
  const n = (Number(read(LOGS_KEY)) || 0) + 1;
  store(LOGS_KEY, String(n));
  emit();
  return n;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

type Mode = "prompt" | "ios" | null;

export function currentMode(): Mode {
  if (isStandalone() || read("kudi:installed")) return null;
  if ((Number(read(LOGS_KEY)) || 0) < SHOW_AFTER_LOGS) return null;
  const dismissed = Number(read(DISMISSED_KEY)) || 0;
  if (dismissed && Date.now() - dismissed < SNOOZE_DAYS * 86_400_000) return null;
  if (deferred) return "prompt";
  if (isIOS()) return "ios";
  return null; // other browsers can't install, or Chrome hasn't offered yet
}


/** For the card: forget the event once it has been used (it can only prompt once). */
export function clearDeferred() {
  deferred = null;
}
