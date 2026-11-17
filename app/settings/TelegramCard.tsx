"use client";

import { Check, Moon, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PillButton } from "@/components/PillButton";
import { cn } from "@/lib/cn";

type Props = { linked: boolean; nightly: boolean; botUsername: string | null };

/** Link Telegram (one-time deep link), the 9 PM summary switch, and unlink. */
export function TelegramCard({ linked, nightly, botUsername }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [on, setOn] = useState(nightly);
  const [error, setError] = useState<string | null>(null);

  // After tapping Start in Telegram, people come back to this tab: check whether the link went through.
  useEffect(() => {
    if (!waiting || linked) return;
    const check = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", check);
    const t = setInterval(() => router.refresh(), 4000);
    return () => {
      document.removeEventListener("visibilitychange", check);
      clearInterval(t);
    };
  }, [waiting, linked, router]);

  async function startLink() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "We couldn't start linking. Try again.");
      setWaiting(true);
      window.location.href = data.url; // opens the Telegram app on phones, web Telegram on desktop
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't start linking. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/link", { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "We couldn't unlink that.");
      setWaiting(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't unlink that.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleNightly() {
    const next = !on;
    setOn(next); // optimistic
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nightly_summary: next }),
    }).catch(() => null);
    if (!res?.ok) {
      setOn(!next);
      setError("We couldn't save that. Try again.");
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Telegram</h2>

      {linked ? (
        <div className="mt-2 overflow-hidden rounded-card bg-surface">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-tile bg-emerald-tint text-emerald">
              <Check size={18} strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Telegram is linked</p>
              <p className="text-sm text-muted">Send spending to the bot and it lands here.</p>
            </div>
            {botUsername && (
              <a href={`https://t.me/${botUsername}`} className="shrink-0 rounded-pill px-3 py-2 text-sm font-semibold text-emerald hover:bg-surface-2">
                Open chat
              </a>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-line-soft px-4 py-3.5">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-tile bg-surface-2 text-muted">
              <Moon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p id="nightly-label" className="font-medium">
                9 PM summary
              </p>
              <p className="text-sm text-muted">Your day in kudi, every night in Telegram.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-labelledby="nightly-label"
              onClick={toggleNightly}
              className={cn(
                "relative h-8 w-[52px] shrink-0 rounded-pill transition-colors duration-150",
                on ? "bg-emerald" : "bg-line",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute top-1 left-1 size-6 rounded-full bg-on-ink shadow-sm transition-transform duration-150 ease-out",
                  on && "translate-x-5",
                )}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={unlink}
            disabled={busy}
            className="h-tap w-full border-t border-line-soft text-sm font-semibold text-bad transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            {busy ? "Unlinking…" : "Unlink Telegram"}
          </button>
        </div>
      ) : (
        <div className="mt-2 rounded-card bg-surface p-4">
          <div className="flex items-start gap-3">
            <span aria-hidden className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-tile bg-surface-2 text-ink">
              <Send size={18} />
            </span>
            <div>
              <p className="font-medium">Log from Telegram</p>
              <p className="text-sm text-muted">Type your spending in chat, and get your day in kudi at 9 PM.</p>
            </div>
          </div>
          <PillButton variant="ink" block className="mt-4" onClick={startLink} disabled={busy} icon={<Send size={18} aria-hidden />}>
            {busy ? "Opening Telegram…" : "Link Telegram"}
          </PillButton>
          {waiting && <p className="mt-3 text-center text-sm text-muted">Tap Start in Telegram, then come back here.</p>}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-bad">
          {error}
        </p>
      )}
    </section>
  );
}
