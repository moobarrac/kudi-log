"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { Loader2, Mic, Sparkles, Square } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/money";
import { hasNumberHint, ruleParse } from "@/lib/parser";
import { CategoryChip } from "./CategoryChip";
import { DayPicker } from "./DayPicker";
import { PillButton } from "./PillButton";
import { Sheet } from "./Sheet";
import { useVoice } from "./useVoice";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  text: string;
  onTextChange: (t: string) => void;
  day: string;
  today: string;
  onDayChange: (d: string) => void;
  chips: string[];
  /** Shown above the input, e.g. "How much was it?" after the AI couldn't read something. */
  notice: string | null;
  busy: boolean;
  onSubmit: () => void;
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function QuickLogSheet({ open, onOpenChange, text, onTextChange, day, today, onDayChange, chips, notice, busy, onSubmit }: Props) {
  const reduce = useReducedMotion();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Voice reads the latest text when it finishes, so anything typed meanwhile is kept.
  const textRef = useRef(text);
  textRef.current = text;
  const voice = useVoice({ getText: () => textRef.current, setText: onTextChange });
  const voiceBusy = voice.status !== "idle";
  const { cancel } = voice;
  useEffect(() => {
    if (!open) cancel();
  }, [open, cancel]);
  // Same parser as the server, so what you see is what gets saved.
  const parsed = useMemo(() => ruleParse(text), [text]);
  const count = parsed.items.length;
  const sum = parsed.items.reduce((s, i) => s + i.amount, 0);
  // Leftovers with a number can go to the AI; ones without need the user to add an amount.
  const pending = parsed.unparsed.filter(hasNumberHint).length;
  const needsAmount = parsed.unparsed.length - pending;

  const label =
    busy ? "Reading it…"
    : voiceBusy ? (voice.status === "transcribing" ? "Reading your voice note…" : voice.status === "recording" ? "Recording…" : "Listening…")
    : count === 0 && pending === 0 ? (needsAmount > 0 ? "Add how much it was" : "Type something to log")
    : count === 0 ? `Read ${pending === 1 ? "it" : `all ${pending}`} for me`
    : `Log ${count} ${count === 1 ? "item" : "items"}${pending ? ` + ${pending} to check` : ""}`;

  function addChip(chip: string) {
    const base = text.trim();
    onTextChange(base ? `${base}, ${chip.toLowerCase()} ` : `${chip.toLowerCase()} `);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Log spending"
      tall
      headerAction={<DayPicker day={day} today={today} onChange={onDayChange} />}
      footer={
        <PillButton block disabled={busy || voiceBusy || (count === 0 && pending === 0)} trailing={count > 0 ? naira(sum) : undefined} onClick={onSubmit}>
          {label}
        </PillButton>
      }
    >
      {notice && (
        <p role="status" className="mb-4 rounded-row border-[1.5px] border-dashed border-warn-line bg-warn-bg px-3.5 py-3 text-sm text-warn-ink">
          {notice}
        </p>
      )}

      <label htmlFor="quick-log" className="text-sm font-medium text-muted">
        Type it the way you'd say it
      </label>
      <div className="mt-2 flex items-start gap-2 rounded-card border-2 border-ink bg-surface p-3">
        <textarea
          id="quick-log"
          ref={inputRef}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              if (!busy && !voiceBusy && (count > 0 || pending > 0)) onSubmit();
            }
          }}
          rows={3}
          maxLength={500}
          autoFocus
          enterKeyHint="done"
          autoCapitalize="none"
          placeholder="suya 2k, transport 1,500, data 1k"
          className="min-h-[84px] flex-1 resize-none bg-transparent text-h3 text-ink outline-none placeholder:text-muted"
        />
        {voice.mode && (
          <button
            type="button"
            onClick={voice.toggle}
            disabled={voice.status === "transcribing"}
            aria-label={
              voice.status === "listening" || voice.status === "recording"
                ? "Stop and use what I said"
                : voice.status === "transcribing"
                  ? "Reading your voice note"
                  : "Say it instead"
            }
            aria-pressed={voice.status === "listening" || voice.status === "recording"}
            className={cn(
              "relative grid size-tap shrink-0 place-items-center rounded-full transition-colors duration-150",
              voice.status === "listening" || voice.status === "recording"
                ? "bg-lime text-on-lime"
                : "bg-surface-2 text-ink hover:bg-line-soft",
            )}
          >
            {(voice.status === "listening" || voice.status === "recording") && (
              <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-lime/50 motion-reduce:hidden" />
            )}
            {voice.status === "transcribing" ? (
              <Loader2 size={20} className="animate-spin" aria-hidden />
            ) : voice.status === "idle" ? (
              <Mic size={20} aria-hidden />
            ) : (
              <Square size={16} fill="currentColor" className="relative" aria-hidden />
            )}
          </button>
        )}
      </div>

      <p
        role="status"
        className={cn("mt-2 min-h-5 text-sm", voice.error ? "text-warn-ink" : "text-muted", !voice.error && voice.status === "idle" && "sr-only")}
      >
        {voice.error ??
          (voice.status === "listening"
            ? "Listening… say it like “suya 2k, transport 1,500”."
            : voice.status === "recording"
              ? `Recording 0:${String(voice.seconds).padStart(2, "0")} of 0:${voice.maxSeconds}. Tap the square when you're done.`
              : voice.status === "transcribing"
                ? "Reading your voice note…"
                : "")}
      </p>

      {chips.length > 0 && (
        <div className="-mx-gutter mt-3 flex gap-2 overflow-x-auto px-gutter pb-1 [scrollbar-width:none]">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => addChip(c)}
              className="h-9 shrink-0 rounded-pill border border-line bg-surface px-3.5 text-sm font-medium first-letter:uppercase transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {(count > 0 || parsed.unparsed.length > 0) && (
        <p className="mt-6 text-xs font-semibold tracking-[0.08em] text-muted uppercase">Reading it as you type</p>
      )}
      <ul className="mt-2 flex flex-col gap-2">
        <AnimatePresence initial={false} mode="popLayout">
          {parsed.items.map((p, i) => (
            <m.li
              key={`${p.item}-${i}`}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: EASE, delay: i * 0.03 }}
              className="flex items-center gap-3 rounded-row bg-surface px-3.5 py-3"
            >
              <span className="min-w-0 flex-1 truncate font-medium first-letter:uppercase">{p.item}</span>
              <CategoryChip category={p.category} />
              <span className="font-display text-body font-bold tabular-nums">{naira(p.amount)}</span>
            </m.li>
          ))}
          {parsed.unparsed.map((u, i) => (
            <m.li
              key={`u-${u}-${i}`}
              layout={!reduce}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 rounded-row border-[1.5px] border-dashed border-warn-line bg-warn-bg px-3.5 py-3 text-warn-ink"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{u}</span>
              {hasNumberHint(u) ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
                  <Sparkles size={13} aria-hidden /> AI will take a look
                </span>
              ) : (
                <span className="shrink-0 text-xs font-semibold">How much?</span>
              )}
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    </Sheet>
  );
}
