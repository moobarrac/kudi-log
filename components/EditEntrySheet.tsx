"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { CATEGORY_KEYS, type Category, guessCategory } from "@/lib/categories";
import { cleanItem, type EntryPatch } from "@/lib/entry-input";
import { nairaDigits } from "@/lib/money";
import { parseAmount } from "@/lib/parser";
import type { Entry } from "@/lib/types";
import { CategoryChip } from "./CategoryChip";
import { DayPicker } from "./DayPicker";
import { PillButton } from "./PillButton";
import { Sheet } from "./Sheet";

type Props = {
  /** The entry being edited; null closes the sheet. */
  entry: Entry | null;
  today: string;
  onClose: () => void;
  /** Only the fields that changed. */
  onSave: (entry: Entry, patch: EntryPatch) => void;
  onDelete: (entry: Entry) => void;
};

/** Tap an entry to fix its name, amount, category or day. */
export function EditEntrySheet({ entry, today, onClose, onSave, onDelete }: Props) {
  // Keep the last entry around while the sheet animates closed.
  const [shown, setShown] = useState<Entry | null>(entry);
  useEffect(() => {
    if (entry) setShown(entry);
  }, [entry]);

  return (
    <Sheet open={entry !== null} onOpenChange={(o) => !o && onClose()} title="Edit entry">
      {shown && <EditForm key={shown.id} entry={shown} today={today} onSave={onSave} onDelete={onDelete} />}
    </Sheet>
  );
}

function EditForm({ entry, today, onSave, onDelete }: { entry: Entry; today: string } & Pick<Props, "onSave" | "onDelete">) {
  const ids = useId();
  const [item, setItem] = useState(capitalise(entry.item));
  const [amountText, setAmountText] = useState(nairaDigits(entry.amount));
  const [category, setCategory] = useState<Category>(entry.category);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [day, setDay] = useState(entry.spent_on);
  const [showErrors, setShowErrors] = useState(false);

  const cleanName = cleanItem(item);
  const amount = parseAmount(amountText);

  const patch: EntryPatch = {};
  if (cleanName && cleanName !== entry.item) patch.item = cleanName;
  if (amount && amount !== entry.amount) patch.amount = amount;
  if (category !== entry.category) patch.category = category;
  if (day !== entry.spent_on) patch.spent_on = day;
  const changed = Object.keys(patch).length > 0;
  const valid = cleanName !== null && amount !== null;

  function changeItem(value: string) {
    setItem(value);
    // Renaming "bread" to "bolt" should move it to Transport, unless they picked a category themselves.
    if (!categoryTouched) {
      const guess = guessCategory(value.toLowerCase());
      if (guess) setCategory(guess);
    }
  }

  function save() {
    if (!valid) return setShowErrors(true);
    if (changed) onSave(entry, patch);
  }

  const inputBox = "mt-2 flex items-center gap-2 rounded-row border-[1.5px] bg-surface px-4 focus-within:border-ink";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-col gap-6 pb-2"
    >
      <div>
        <label htmlFor={`${ids}-item`} className="text-sm font-medium text-muted">
          What it was
        </label>
        <div className={`${inputBox} ${showErrors && !cleanName ? "border-bad" : "border-line"}`}>
          <input
            id={`${ids}-item`}
            value={item}
            onChange={(e) => changeItem(e.target.value)}
            maxLength={60}
            autoComplete="off"
            enterKeyHint="next"
            className="h-btn min-w-0 flex-1 bg-transparent text-body font-medium text-ink outline-none"
          />
        </div>
        {showErrors && !cleanName && <p className="mt-1.5 text-sm text-bad">Give it a short name, like “suya”.</p>}
      </div>

      <div>
        <label htmlFor={`${ids}-amount`} className="text-sm font-medium text-muted">
          How much
        </label>
        <div className={`${inputBox} ${showErrors && !amount ? "border-bad" : "border-line"}`}>
          <span aria-hidden className="font-display text-h2 font-extrabold text-muted">
            ₦
          </span>
          <input
            id={`${ids}-amount`}
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            onBlur={() => amount && setAmountText(nairaDigits(amount))}
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            className="h-16 min-w-0 flex-1 bg-transparent font-display text-h2 font-extrabold tracking-tight text-ink tabular-nums outline-none"
          />
        </div>
        {showErrors && !amount ? (
          <p className="mt-1.5 text-sm text-bad">Type an amount like 2,500 or 2.5k.</p>
        ) : (
          <p className="mt-1.5 text-xs text-muted">
            {amount && amountText.replace(/[₦,\s]/g, "") !== String(amount)
              ? `That's ₦${nairaDigits(amount)}.`
              : "Whole naira. “2.5k” works too."}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-muted">Category</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORY_KEYS.map((c) => (
            <CategoryChip
              key={c}
              category={c}
              size="md"
              selected={c === category}
              onClick={() => {
                setCategory(c);
                setCategoryTouched(true);
              }}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted">Day</span>
        <DayPicker day={day} today={today} onChange={setDay} />
      </div>

      {entry.raw_text && entry.raw_text.toLowerCase() !== entry.item && (
        <p className="rounded-row bg-surface-2 px-4 py-3 text-sm text-muted">
          You typed <span className="text-ink">“{entry.raw_text}”</span>
        </p>
      )}

      <div className="flex flex-col gap-2">
        {/* Quiet until there's something to save; a dimmed lime looks muddy in dark mode. */}
        <PillButton type="submit" block variant={changed || !valid ? "lime" : "quiet"} disabled={!changed && valid}>
          {changed || !valid ? "Save changes" : "No changes yet"}
        </PillButton>
        <button
          type="button"
          onClick={() => onDelete(entry)}
          className="inline-flex h-btn items-center justify-center gap-2 rounded-pill text-body font-semibold text-bad transition-colors hover:bg-surface-2"
        >
          <Trash2 size={18} aria-hidden />
          Delete entry
        </button>
      </div>
    </form>
  );
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
