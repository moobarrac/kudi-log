// Pure maths over entries. All totals, averages and comparisons live here, never in the AI.

import { addDays } from "./dates";

type Amounted = { amount: number; category: string };

export function total(entries: Array<{ amount: number }>): number {
  return entries.reduce((s, e) => s + e.amount, 0);
}

/** Category totals, biggest first. Ties keep a stable alphabetical order. */
export function totalsByCategory(entries: Amounted[]): Array<{ category: string; amount: number }> {
  const m = new Map<string, number>();
  for (const e of entries) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
  return [...m.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
}

const DEFAULT_CHIPS = ["suya", "transport", "data", "pure water", "keke", "lunch"];

/** Quick-log chips: the user's most frequent items, topped up with common Nigerian defaults. */
export function quickChips(recentItems: string[], n = 6): string[] {
  const freq = new Map<string, number>();
  for (const raw of recentItems) {
    const item = raw.trim().toLowerCase();
    if (item && item.length <= 24) freq.set(item, (freq.get(item) ?? 0) + 1);
  }
  const mine = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([i]) => i);
  const out = mine.slice(0, n);
  for (const d of DEFAULT_CHIPS) {
    if (out.length >= n) break;
    if (!out.includes(d)) out.push(d);
  }
  return out;
}

// ---------- end-of-day summary ----------

export type DayEntry = { item: string; amount: number; category: string };
export type HistoryEntry = { spent_on: string; amount: number };

/** The same weekday over the last 4 weeks. `basis` is how many of those days had any logs. */
export type Usual = { average: number; basis: number };

export type Comparison = {
  direction: "under" | "over" | "same";
  /** Always positive. */
  diff: number;
  headline: string;
  detail: string;
};

export type DaySummary = {
  day: string;
  total: number;
  count: number;
  /** Biggest first, with whole-number percentages of the day. */
  byCategory: Array<{ category: string; amount: number; share: number }>;
  biggest: DayEntry | null;
  usual: Usual | null;
  comparison: Comparison | null;
  /** Days in a row with at least one log, ending on `day` (or the day before, if `day` has none yet). */
  streak: number;
};

/** Sum per day. Days with no logs aren't in the map, which is different from a ₦0 day. */
export function dailyTotals(history: HistoryEntry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of history) m.set(e.spent_on, (m.get(e.spent_on) ?? 0) + e.amount);
  return m;
}

/**
 * Average for this weekday over the last 4 weeks, counting only days that were logged:
 * a day with no logs usually means "didn't track", not "spent nothing".
 */
export function usualFor(day: string, history: HistoryEntry[]): Usual | null {
  const totals = dailyTotals(history);
  const seen = [7, 14, 21, 28].map((n) => totals.get(addDays(day, -n))).filter((v): v is number => v !== undefined);
  if (seen.length === 0) return null;
  return { average: Math.round(seen.reduce((a, b) => a + b, 0) / seen.length), basis: seen.length };
}

export function weekdayName(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-NG", { weekday: "long", timeZone: "UTC" });
}

const fmt = (n: number) => `₦${n.toLocaleString("en-NG")}`;

/** Kind, plain-English comparison. Within 5% counts as "about the same". Never scolds. */
export function compareToUsual(total: number, usual: Usual | null, day: string): Comparison | null {
  if (!usual || usual.average <= 0 || total <= 0) return null;
  const wd = weekdayName(day);
  const raw = total - usual.average;
  const diff = Math.abs(raw);
  const direction = diff <= usual.average * 0.05 ? "same" : raw < 0 ? "under" : "over";
  const solid = usual.basis >= 2; // one past day isn't a "usual" yet

  const ref = solid ? `your usual ${wd}` : `the last ${wd} you logged`;
  const headline =
    direction === "same" ? `About the same as ${ref}`
    : direction === "under" ? `${fmt(diff)} under ${ref}`
    : `${fmt(diff)} more than ${ref}`;
  const detail = solid ? `Your ${wd} average is ${fmt(usual.average)}` : `That ${wd} was ${fmt(usual.average)}`;
  return { direction, diff, headline, detail };
}

export function streakEnding(day: string, loggedDays: Set<string>): number {
  let d = loggedDays.has(day) ? day : addDays(day, -1);
  let n = 0;
  while (loggedDays.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/**
 * Everything the summary screen, share card, Telegram /today and the 9 PM message show.
 * `entries` are the day's entries; `history` is earlier days (at least the last 28, more for long streaks).
 */
export function summarizeDay(day: string, entries: DayEntry[], history: HistoryEntry[]): DaySummary {
  const sum = total(entries);
  const byCategory = totalsByCategory(entries).map((c) => ({ ...c, share: sum > 0 ? Math.round((c.amount / sum) * 100) : 0 }));
  // Biggest single spend; on a tie, the one logged first.
  const biggest = entries.reduce<DayEntry | null>((best, e) => (!best || e.amount > best.amount ? e : best), null);
  const past = history.filter((h) => h.spent_on < day);
  const usual = usualFor(day, past);
  const logged = new Set(past.map((h) => h.spent_on));
  if (entries.length > 0) logged.add(day);

  return {
    day,
    total: sum,
    count: entries.length,
    byCategory,
    biggest: biggest ? { item: biggest.item, amount: biggest.amount, category: biggest.category } : null,
    usual,
    comparison: compareToUsual(sum, usual, day),
    streak: streakEnding(day, logged),
  };
}

/** "Food took 35% of today". `when` is "today" or e.g. "Monday". */
export function biggestBiteLine(byCategory: DaySummary["byCategory"], label: string, when: string): string | null {
  const top = byCategory[0];
  if (!top) return null;
  return top.share >= 100 ? `${label} took all of ${when}` : `${label} took ${top.share}% of ${when}`;
}
