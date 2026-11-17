"use client";

import { ArrowDown, ArrowUp, Equal, Share, X } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { categoryStyle } from "@/components/category-style";
import { HeroTotal } from "@/components/HeroTotal";
import { pillClasses } from "@/components/PillButton";
import { categoryLabel } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/money";
import { biggestBiteLine, type DaySummary, weekdayName } from "@/lib/summary";

type Props = { summary: DaySummary; dateLabel: string; isToday: boolean };

const EASE = [0.22, 1, 0.36, 1] as const;
const BARS_SHOWN = 4;
/** Three "chapters": the total, where it went, the streak. The story bars at the top fill as each one appears. */
const CHAPTER_AT = [0.1, 0.8, 1.5];

export function SummaryView({ summary, dateLabel, isToday }: Props) {
  const s = summary;
  const when = isToday ? "today" : weekdayName(s.day);

  return (
    <main className="min-h-dvh bg-hero text-on-ink">
      <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-5 pt-[max(16px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))]">
        <StoryBars />

        <header className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-on-ink-muted">{dateLabel}</p>
            <h1 className="font-display text-[20px] font-bold">Your day in kudi</h1>
          </div>
          <Link
            href="/today"
            aria-label="Close summary"
            className="grid size-tap shrink-0 place-items-center rounded-full bg-ink-raised transition-transform duration-150 ease-out active:scale-95"
          >
            <X size={18} strokeWidth={2.2} />
          </Link>
        </header>

        {s.count === 0 ? <Empty summary={s} when={when} /> : <Full summary={s} when={when} />}
      </div>
    </main>
  );
}

function Full({ summary: s, when }: { summary: DaySummary; when: string }) {
  const top = s.byCategory[0];
  const shown = s.byCategory.slice(0, BARS_SHOWN);
  const max = shown[0]?.amount ?? 1;
  const hidden = s.byCategory.length - shown.length;
  const wd = weekdayName(s.day);
  const [note, setNote] = useState<string | null>(null);

  return (
    <>
      <Reveal at={CHAPTER_AT[0]} className="mt-9">
        <p className="text-[15px] text-on-ink-soft">You spent</p>
        <HeroTotal amount={s.total} size="summary" className="mt-2 leading-[0.95]" />
        <p className="mt-2 text-[15px] text-on-ink-soft">
          across {s.count} {s.count === 1 ? "entry" : "entries"}
        </p>
      </Reveal>

      <Reveal at={CHAPTER_AT[0] + 0.25} className="mt-6">
        <Comparison summary={s} weekday={wd} />
      </Reveal>

      {top && (
        <Reveal at={CHAPTER_AT[1]} className="mt-6">
          <p className="text-sm font-medium text-on-ink-muted">Biggest bite</p>
          <p className="mt-1 font-display text-[24px] leading-tight font-bold tracking-[-0.02em]">
            {biggestBiteLine(s.byCategory, categoryLabel(top.category), when)}
          </p>
          <ul className="mt-4 flex flex-col gap-3" aria-label="Spending by category">
            {shown.map((c, i) => (
              <li key={c.category}>
                <div className="flex justify-between text-sm">
                  <span className="text-on-ink-soft">{categoryLabel(c.category)}</span>
                  <span className="font-semibold tabular-nums">{naira(c.amount)}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-pill bg-ink-raised">
                  <div
                    className="animate-grow-x h-2 rounded-pill"
                    style={
                      {
                        background: categoryStyle(c.category).dot,
                        width: `${Math.max(3, (c.amount / max) * 100)}%`,
                        "--delay": `${(CHAPTER_AT[1] + 0.15 + i * 0.08) * 1000}ms`,
                      } as CSSProperties
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
          {hidden > 0 && <p className="mt-2 text-xs text-on-ink-muted">+{hidden} more {hidden === 1 ? "category" : "categories"}</p>}
        </Reveal>
      )}

      <Reveal at={CHAPTER_AT[2]} className="mt-6 grid grid-cols-2 gap-2.5">
        {s.biggest && (
          <Tile label="Biggest single spend">
            <p className="truncate text-[15px] font-semibold first-letter:uppercase">{s.biggest.item}</p>
            <p className="font-display text-[20px] font-bold tabular-nums">{naira(s.biggest.amount)}</p>
          </Tile>
        )}
        <StreakTile streak={s.streak} />
      </Reveal>

      <Reveal at={CHAPTER_AT[2] + 0.35} className="mt-auto pt-8">
        <p aria-live="polite" className={cn("mb-3 text-center text-sm text-on-ink-soft", !note && "sr-only")}>
          {note}
        </p>
        <div className="flex gap-2.5">
          <ShareCardButton day={s.day} onNote={setNote} />
          <Link href="/insights" className={cn(pillClasses("lime"), "flex-1 px-4")}>
            See my week
          </Link>
        </div>
      </Reveal>
    </>
  );
}

function Empty({ summary: s, when }: { summary: DaySummary; when: string }) {
  return (
    <>
      <Reveal at={CHAPTER_AT[0]} className="mt-9">
        <p className="text-[15px] text-on-ink-soft">Nothing logged {when === "today" ? "today" : `on ${when}`} yet</p>
        <p className="mt-2 font-display text-[44px] leading-[1.02] font-extrabold tracking-[-0.03em]">
          Your summary shows up once you log.
        </p>
        <p className="mt-3 text-[15px] text-on-ink-muted">Type it the way you'd say it, like “suya 2k, transport 1,500”.</p>
      </Reveal>
      {s.streak > 0 && (
        <Reveal at={CHAPTER_AT[1]} className="mt-6 grid grid-cols-2 gap-2.5">
          <StreakTile streak={s.streak} />
        </Reveal>
      )}
      <Reveal at={CHAPTER_AT[2]} className="mt-auto pt-8">
        <Link href="/today" className={pillClasses("lime", { block: true })}>
          Log something
        </Link>
      </Reveal>
    </>
  );
}

function Comparison({ summary: s, weekday }: { summary: DaySummary; weekday: string }) {
  const c = s.comparison;
  const Icon = c?.direction === "under" ? ArrowDown : c?.direction === "over" ? ArrowUp : Equal;
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-ink-raised px-4 py-3.5">
      <span
        aria-hidden
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-[14px]",
          c?.direction === "under" ? "bg-good-tint-on-ink text-good-on-ink" : "bg-ink-line/60 text-on-ink-soft",
        )}
      >
        <Icon size={20} strokeWidth={2.4} />
      </span>
      {c ? (
        <div>
          <p className="text-[15px] font-semibold">{c.headline}</p>
          <p className="text-xs text-on-ink-muted">{c.detail}</p>
        </div>
      ) : (
        <div>
          <p className="text-[15px] font-semibold">Your first {weekday} on record</p>
          <p className="text-xs text-on-ink-muted">Log next {weekday} too and we'll compare.</p>
        </div>
      )}
    </div>
  );
}

function StreakTile({ streak }: { streak: number }) {
  const filled = Math.min(streak, 7);
  return (
    <Tile label="Logging streak">
      <p className="font-display text-[20px] font-bold tabular-nums">
        {streak} {streak === 1 ? "day" : "days"}
      </p>
      <span className="mt-1 flex gap-[5px]" role="img" aria-label={streak >= 7 ? "A full week or more" : `${filled} of 7 days toward a full week`}>
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className={cn("size-3 rounded-full", i < filled ? "bg-lime" : "bg-ink-line")} />
        ))}
      </span>
    </Tile>
  );
}

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-row bg-ink-raised p-3.5">
      <p className="text-xs text-on-ink-muted">{label}</p>
      {children}
    </div>
  );
}

function StoryBars() {
  return (
    <div aria-hidden className="flex gap-1">
      {CHAPTER_AT.map((at, i) => (
        <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-[2px] bg-ink-line">
          <span
            className="animate-grow-x block h-full bg-on-ink"
            style={{ "--delay": `${at * 1000}ms`, "--grow-duration": "700ms" } as CSSProperties}
          />
        </span>
      ))}
    </div>
  );
}

/** Each chapter rises in on a CSS delay: no JavaScript needed, so the summary paints at once. */
function Reveal({ at, className, children }: { at: number; className?: string; children: ReactNode }) {
  return (
    <div className={cn("animate-rise", className)} style={{ "--delay": `${at * 1000}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

/**
 * Shares the card as a picture (WhatsApp status, Instagram...). The image is fetched ahead of time,
 * because iOS only allows navigator.share straight after a tap, not after a slow network call.
 */
function ShareCardButton({ day, onNote }: { day: string; onNote: (note: string | null) => void }) {
  const file = useRef<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(): Promise<File> {
    if (file.current) return file.current;
    const res = await fetch(`/summary/card?day=${day}`);
    if (!res.ok) throw new Error("card failed");
    const blob = await res.blob();
    file.current = new File([blob], `kudi-log-${day}.png`, { type: "image/png" });
    return file.current;
  }

  useEffect(() => {
    const t = setTimeout(() => load().catch(() => {}), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  async function share() {
    onNote(null);
    setBusy(true);
    try {
      const f = await load();
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], title: "My day in kudi" });
      } else {
        const url = URL.createObjectURL(f);
        const a = document.createElement("a");
        a.href = url;
        a.download = f.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        onNote("Card saved. Share it from your downloads.");
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) onNote("We couldn't make the card. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={share} disabled={busy} className={cn(pillClasses("outline-on-ink"), "flex-1 px-4")}>
      <Share size={18} aria-hidden />
      {busy ? "Making card…" : "Share card"}
    </button>
  );
}
