"use client";

import { useEffect, useId, useState } from "react";
import { nairaDigits } from "@/lib/money";
import { parseAmount } from "@/lib/parser";
import { PillButton } from "./PillButton";
import { Sheet } from "./Sheet";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  label: string;
  hint: string;
  submitLabel: string;
  /** Prefill (e.g. the current budget). */
  initial?: number | null;
  /** Show a short note field ("salary"). */
  withNote?: boolean;
  /** ₦0 is a valid answer ("I have nothing right now"). */
  allowZero?: boolean;
  busy?: boolean;
  error?: string | null;
  onSubmit: (amount: number, note: string) => void;
};

/** One big naira field ("150k" works) plus an optional note. Used for balance, money in and budget. */
export function AmountSheet({ open, onOpenChange, title, label, hint, submitLabel, initial, withNote, allowZero, busy, error, onSubmit }: Props) {
  const ids = useId();
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (open) {
      setText(initial ? nairaDigits(initial) : "");
      setNote("");
      setTried(false);
    }
  }, [open, initial]);

  const trimmed = text.trim();
  const amount = trimmed === "0" || trimmed === "₦0" ? 0 : parseAmount(text);
  const valid = amount !== null && (allowZero || amount > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (valid && amount !== null && !busy) onSubmit(amount, note.trim());
        }}
        className="flex flex-col gap-5 pb-2"
      >
        <div>
          <label htmlFor={`${ids}-amount`} className="text-sm font-medium text-muted">
            {label}
          </label>
          <div className={`mt-2 flex items-center gap-2 rounded-row border-[1.5px] bg-surface px-4 focus-within:border-ink ${tried && !valid ? "border-bad" : "border-line"}`}>
            <span aria-hidden className="font-display text-h2 font-extrabold text-muted">
              ₦
            </span>
            <input
              id={`${ids}-amount`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => amount && setText(nairaDigits(amount))}
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              placeholder="150,000"
              className="h-16 min-w-0 flex-1 bg-transparent font-display text-h2 font-extrabold tracking-tight text-ink tabular-nums outline-none placeholder:text-muted/50"
            />
          </div>
          <p className={`mt-1.5 text-xs ${tried && !valid ? "text-bad" : "text-muted"}`}>
            {tried && !valid
              ? "Type an amount like 150,000 or 150k."
              : amount && trimmed.replace(/[₦,\s]/g, "") !== String(amount)
                ? `That's ₦${nairaDigits(amount)}.`
                : hint}
          </p>
        </div>

        {withNote && (
          <div>
            <label htmlFor={`${ids}-note`} className="text-sm font-medium text-muted">
              What was it? <span className="font-normal">(optional)</span>
            </label>
            <input
              id={`${ids}-note`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={60}
              placeholder="Salary, transfer from Tunde…"
              className="mt-2 h-btn w-full rounded-row border-[1.5px] border-line bg-surface px-4 text-body outline-none focus:border-ink"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-row bg-warn-bg px-4 py-3 text-sm text-warn-ink">
            {error}
          </p>
        )}

        <PillButton type="submit" block disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </PillButton>
      </form>
    </Sheet>
  );
}
