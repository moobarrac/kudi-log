// Checks what the browser sends when editing or restoring an entry. Pure, so the API and the tests share it.

import { type Category, isCategory } from "./categories";
import { addDays, isDay } from "./dates";
import type { Entry } from "./types";

export const MAX_AMOUNT = 100_000_000;
export const MAX_BACKDATE_DAYS = 90;
export const MAX_ITEM = 60;

export type EntryPatch = Partial<{ item: string; amount: number; category: Category; spent_on: string }>;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function cleanItem(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const item = value.trim().replace(/\s+/g, " ").toLowerCase();
  return item && item.length <= MAX_ITEM && /\p{L}/u.test(item) ? item : null;
}

export function cleanAmount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= MAX_AMOUNT ? value : null;
}

/** A day the user may log against: today or up to 90 days back (Lagos days). */
export function isLoggableDay(value: unknown, today: string): value is string {
  return isDay(value) && value <= today && value >= addDays(today, -MAX_BACKDATE_DAYS);
}

/** PATCH body: any of item, amount, category, spent_on. Unknown fields are ignored. */
export function cleanPatch(body: unknown, today: string): Result<EntryPatch> {
  if (!body || typeof body !== "object") return { ok: false, error: "That didn't come through. Try again." };
  const b = body as Record<string, unknown>;
  const patch: EntryPatch = {};

  if ("item" in b) {
    const item = cleanItem(b.item);
    if (!item) return { ok: false, error: "Give it a short name, like “suya”." };
    patch.item = item;
  }
  if ("amount" in b) {
    const amount = cleanAmount(b.amount);
    if (!amount) return { ok: false, error: "Amounts are whole naira, more than ₦0." };
    patch.amount = amount;
  }
  if ("category" in b) {
    if (!isCategory(b.category)) return { ok: false, error: "Pick one of the categories." };
    patch.category = b.category;
  }
  if ("spent_on" in b) {
    if (!isLoggableDay(b.spent_on, today)) return { ok: false, error: "Pick a day in the last 3 months." };
    patch.spent_on = b.spent_on;
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: "Nothing to change." };
  return { ok: true, value: patch };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RestoreRow = Omit<Entry, "user_id">;

/** Undo after delete: the browser sends back the row it deleted so it returns with the same id and time. */
export function cleanRestore(body: unknown, today: string): Result<RestoreRow> {
  if (!body || typeof body !== "object") return { ok: false, error: "That didn't come through. Try again." };
  const b = body as Record<string, unknown>;
  const item = cleanItem(b.item);
  const amount = cleanAmount(b.amount);
  const createdAt = typeof b.created_at === "string" && !Number.isNaN(Date.parse(b.created_at)) ? b.created_at : null;
  if (
    typeof b.id !== "string" || !UUID_RE.test(b.id) ||
    !item || !amount || !isCategory(b.category) ||
    // Restoring an old entry is fine; only the 90-day rule for new logs doesn't apply here.
    !isDay(b.spent_on) || b.spent_on > today ||
    (b.source !== "web" && b.source !== "telegram") || !createdAt
  ) {
    return { ok: false, error: "We couldn't bring that back. Log it again." };
  }
  return {
    ok: true,
    value: {
      id: b.id,
      item,
      amount,
      category: b.category,
      spent_on: b.spent_on,
      source: b.source,
      raw_text: typeof b.raw_text === "string" ? b.raw_text.slice(0, 500) : null,
      created_at: createdAt,
    },
  };
}
