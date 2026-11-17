// Week and month insights. Pure maths over entries: the chart, the changes and the one-line insight
// are all computed here, never by the AI.

import { categoryLabel } from "./categories";
import { addDays, prettyDay } from "./dates";
import { totalsByCategory } from "./summary";

export type InsightEntry = { item: string; amount: number; category: string; spent_on: string };

/** Change against the previous period. `pct` is whole percent, always positive. */
export type Change = { kind: "up" | "down" | "same" | "new"; pct: number };

export type RangeInsights = {
  /** First and last day of the range (inclusive). `end` is today. */
  start: string;
  end: string;
  length: number;
  total: number;
  count: number;
  prevTotal: number;
  /** Total divided by the days in the range you could have logged (not counting days before your first log). */
  dailyAverage: number;
  /** One per day, oldest first, ₦0 days included. */
  days: Array<{ day: string; total: number }>;
  /** Biggest first. */
  byCategory: Array<{ category: string; amount: number; prev: number; change: Change }>;
  heaviest: { day: string; total: number; category: string; categoryAmount: number } | null;
  insight: string;
};

/** Within ±3% reads as "same", so tiny wobbles don't show as red or green. */
export function changeBetween(current: number, previous: number): Change {
  if (previous <= 0) return { kind: current > 0 ? "new" : "same", pct: 0 };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (Math.abs(pct) <= 3) return { kind: "same", pct: 0 };
  return { kind: pct > 0 ? "up" : "down", pct: Math.abs(pct) };
}

/** "Today", "Yesterday", "Friday" within the week, else "Tue, 4 Nov". */
export function dayName(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  if (day >= addDays(today, -6)) {
    return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-NG", { weekday: "long", timeZone: "UTC" });
  }
  return prettyDay(day);
}

/** "11 – 17 Nov", or "28 Oct – 3 Nov" across months. */
export function rangeLabel(start: string, end: string): string {
  const d = (day: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${day}T12:00:00Z`).toLocaleDateString("en-NG", { ...opts, timeZone: "UTC" });
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return sameMonth
    ? `${d(start, { day: "numeric" })} – ${d(end, { day: "numeric", month: "short" })}`
    : `${d(start, { day: "numeric", month: "short" })} – ${d(end, { day: "numeric", month: "short" })}`;
}

const fmt = (n: number) => `₦${n.toLocaleString("en-NG")}`;

/**
 * Insights for the `length` days ending on `end`, compared with the `length` days before.
 * `entries` should cover both periods; anything outside them is ignored.
 */
export function rangeInsights(entries: InsightEntry[], end: string, length: number): RangeInsights {
  const start = addDays(end, -(length - 1));
  const prevStart = addDays(start, -length);
  const cur = entries.filter((e) => e.spent_on >= start && e.spent_on <= end);
  const prev = entries.filter((e) => e.spent_on >= prevStart && e.spent_on < start);

  const perDay = new Map<string, number>();
  for (const e of cur) perDay.set(e.spent_on, (perDay.get(e.spent_on) ?? 0) + e.amount);
  const days = Array.from({ length }, (_, i) => {
    const day = addDays(start, i);
    return { day, total: perDay.get(day) ?? 0 };
  });

  const total = cur.reduce((s, e) => s + e.amount, 0);
  const prevTotal = prev.reduce((s, e) => s + e.amount, 0);

  // A new user who started on Thursday shouldn't have their average split over 7 days.
  const firstLog = entries.reduce<string | null>((min, e) => (e.spent_on <= end && (!min || e.spent_on < min) ? e.spent_on : min), null);
  const from = firstLog && firstLog > start ? firstLog : start;
  const countedDays = firstLog ? daysBetween(from, end) + 1 : length;
  const dailyAverage = Math.round(total / Math.max(1, countedDays));

  const prevByCat = new Map(totalsByCategory(prev).map((c) => [c.category, c.amount]));
  const byCategory = totalsByCategory(cur).map((c) => {
    const p = prevByCat.get(c.category) ?? 0;
    return { ...c, prev: p, change: changeBetween(c.amount, p) };
  });

  // Heaviest day; on a tie, the most recent.
  let heaviest: RangeInsights["heaviest"] = null;
  for (const d of days) {
    if (d.total > 0 && (!heaviest || d.total >= heaviest.total)) {
      const top = totalsByCategory(cur.filter((e) => e.spent_on === d.day))[0];
      heaviest = { day: d.day, total: d.total, category: top.category, categoryAmount: top.amount };
    }
  }

  const base = { start, end, length, total, count: cur.length, prevTotal, dailyAverage, days, byCategory, heaviest };
  return { ...base, insight: pickInsight(base, perDay.size) };
}

/**
 * One plain-English line. Good news first (kind, never preachy); otherwise the heaviest day.
 * Spending going up is shown in the list, never made into the headline.
 */
function pickInsight(r: Omit<RangeInsights, "insight">, loggedDays: number): string {
  const period = r.length === 7 ? "week" : "month";
  const before = r.length === 7 ? "last week" : "the month before";

  if (r.count === 0) return `Nothing logged this ${period} yet. Log a spend and this fills up.`;
  if (loggedDays < 3) return "Log a few more days and patterns will start to show here.";

  if (r.prevTotal > 0 && r.total <= r.prevTotal * 0.9) {
    return `You spent ${fmt(r.prevTotal - r.total)} less than ${before}. Nice one.`;
  }

  const drop = r.byCategory
    .filter((c) => c.change.kind === "down" && c.change.pct >= 15 && c.prev - c.amount >= 1000)
    .sort((a, b) => b.prev - b.amount - (a.prev - a.amount))[0];
  if (drop) {
    return `${categoryLabel(drop.category)} is down ${fmt(drop.prev - drop.amount)} on ${before}. Nice one.`;
  }

  const h = r.heaviest;
  if (!h) return "Log a few more days and patterns will start to show here.";
  const name = dayName(h.day, r.end);
  const label = categoryLabel(h.category).toLowerCase();
  const lead = name === "Today" ? "Today is" : `${name} was`;
  return h.categoryAmount === h.total
    ? `${lead} your heaviest day. All ${fmt(h.total)} went on ${label}.`
    : `${lead} your heaviest day. ${fmt(h.categoryAmount)} of the ${fmt(h.total)} went on ${label}.`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}
