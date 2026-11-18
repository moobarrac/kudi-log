// Calendar months and the year: pure maths over entries. Lagos days in, plain English out. Never the AI.

import { categoryLabel } from "./categories";
import { changeBetween, type Change, type InsightEntry } from "./insights";
import { totalsByCategory } from "./summary";

/** "2026-11" */
export type Month = string;

const fmt = (n: number) => `₦${n.toLocaleString("en-NG")}`;
const pad = (n: number) => String(n).padStart(2, "0");

export function isMonth(v: unknown): v is Month {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function monthOf(day: string): Month {
  return day.slice(0, 7);
}

export function daysInMonth(m: Month): number {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

export function monthStart(m: Month): string {
  return `${m}-01`;
}

export function monthEnd(m: Month): string {
  return `${m}-${pad(daysInMonth(m))}`;
}

export function addMonths(m: Month, n: number): Month {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** "November 2026", or "November" / "Nov" */
export function monthLabel(m: Month, style: "long" | "name" | "short" = "long"): string {
  const d = new Date(`${m}-15T12:00:00Z`);
  const opts: Intl.DateTimeFormatOptions =
    style === "long" ? { month: "long", year: "numeric" } : { month: style === "name" ? "long" : "short" };
  return d.toLocaleDateString("en-NG", { ...opts, timeZone: "UTC" });
}

// ---------- one month ----------

export type MonthComparison = {
  direction: "under" | "over" | "same";
  diff: number;
  /** "₦12,000 less than this point in October" */
  headline: string;
  /** "1–18 Oct: ₦96,000" */
  detail: string;
};

export type MonthInsights = {
  month: Month;
  isCurrent: boolean;
  total: number;
  count: number;
  /** Days of the month counted so far (today for the current month). */
  elapsed: number;
  dailyAverage: number;
  /** Every day of the month; null for days that haven't happened yet. */
  days: Array<{ day: string; total: number | null }>;
  byCategory: Array<{ category: string; amount: number; prev: number; change: Change }>;
  /** Previous month over the same days (current month) or in full (past months). */
  prevTotal: number;
  comparison: MonthComparison | null;
  biggest: { item: string; amount: number; day: string } | null;
  heaviestDay: { day: string; total: number } | null;
  insight: string;
};

/**
 * A calendar month, compared with the month before. For the month in progress the comparison is fair:
 * 1–18 November against 1–18 October, not against all of October.
 * `entries` should cover this month and the one before; anything else is ignored.
 */
export function monthInsights(entries: InsightEntry[], month: Month, today: string): MonthInsights {
  const isCurrent = monthOf(today) === month;
  const dim = daysInMonth(month);
  const elapsedDay = isCurrent ? Number(today.slice(8, 10)) : dim;
  const prevMonth = addMonths(month, -1);
  const prevDim = daysInMonth(prevMonth);
  // Fair comparison window in the previous month: the same days of the month, capped at its length.
  const prevUpTo = isCurrent ? `${prevMonth}-${pad(Math.min(elapsedDay, prevDim))}` : monthEnd(prevMonth);

  const cur = entries.filter((e) => monthOf(e.spent_on) === month && e.spent_on <= today);
  const prev = entries.filter((e) => monthOf(e.spent_on) === prevMonth && e.spent_on <= prevUpTo);

  const perDay = new Map<string, number>();
  for (const e of cur) perDay.set(e.spent_on, (perDay.get(e.spent_on) ?? 0) + e.amount);
  const days = Array.from({ length: dim }, (_, i) => {
    const day = `${month}-${pad(i + 1)}`;
    return { day, total: i + 1 > elapsedDay ? null : (perDay.get(day) ?? 0) };
  });

  const total = cur.reduce((s, e) => s + e.amount, 0);
  const prevTotal = prev.reduce((s, e) => s + e.amount, 0);

  // Someone who started logging on the 10th shouldn't have their average spread over the 9 days before.
  const firstLog = entries.reduce<string | null>((min, e) => (!min || e.spent_on < min ? e.spent_on : min), null);
  const fromDay = firstLog && monthOf(firstLog) === month ? Number(firstLog.slice(8, 10)) : 1;
  const elapsed = Math.max(1, elapsedDay - fromDay + 1);
  const dailyAverage = Math.round(total / elapsed);

  const prevByCat = new Map(totalsByCategory(prev).map((c) => [c.category, c.amount]));
  const byCategory = totalsByCategory(cur).map((c) => {
    const p = prevByCat.get(c.category) ?? 0;
    return { ...c, prev: p, change: changeBetween(c.amount, p) };
  });

  const biggestEntry = cur.reduce<InsightEntry | null>((b, e) => (!b || e.amount > b.amount ? e : b), null);
  const heaviest = days.reduce<{ day: string; total: number } | null>(
    (h, d) => (d.total && (!h || d.total > h.total) ? { day: d.day, total: d.total } : h),
    null,
  );

  const comparison = compareMonths(total, prevTotal, prevMonth, isCurrent, elapsedDay, prevDim);
  const base = {
    month,
    isCurrent,
    total,
    count: cur.length,
    elapsed,
    dailyAverage,
    days,
    byCategory,
    prevTotal,
    comparison,
    biggest: biggestEntry ? { item: biggestEntry.item, amount: biggestEntry.amount, day: biggestEntry.spent_on } : null,
    heaviestDay: heaviest,
  };
  return { ...base, insight: monthInsight(base, perDay.size, prevMonth) };
}

function compareMonths(
  total: number,
  prevTotal: number,
  prevMonth: Month,
  isCurrent: boolean,
  elapsedDay: number,
  prevDim: number,
): MonthComparison | null {
  if (prevTotal <= 0 || total <= 0) return null;
  const raw = total - prevTotal;
  const diff = Math.abs(raw);
  const direction = diff <= prevTotal * 0.05 ? "same" : raw < 0 ? "under" : "over";
  const prevName = monthLabel(prevMonth, "name");
  const ref = isCurrent ? `this point in ${prevName}` : prevName;
  const headline =
    direction === "same" ? `About the same as ${ref}` : direction === "under" ? `${fmt(diff)} less than ${ref}` : `${fmt(diff)} more than ${ref}`;
  const short = monthLabel(prevMonth, "short");
  const detail = isCurrent
    ? `1–${Math.min(elapsedDay, prevDim)} ${short}: ${fmt(prevTotal)}`
    : `${prevName}: ${fmt(prevTotal)}`;
  return { direction, diff, headline, detail };
}

/** One kind line. Good news first; a rise is never the headline. */
function monthInsight(r: Omit<MonthInsights, "insight">, loggedDays: number, prevMonth: Month): string {
  const name = r.isCurrent ? "this month" : monthLabel(r.month, "name");
  if (r.count === 0) return r.isCurrent ? "Nothing logged this month yet. Log a spend and this fills up." : `Nothing was logged in ${name}.`;
  if (loggedDays < 3) return "Log a few more days and patterns will start to show here.";

  if (r.comparison?.direction === "under" && r.comparison.diff >= r.prevTotal * 0.1) {
    return r.isCurrent
      ? `So far you've spent ${fmt(r.comparison.diff)} less than at this point in ${monthLabel(prevMonth, "name")}. Nice one.`
      : `You spent ${fmt(r.comparison.diff)} less than in ${monthLabel(prevMonth, "name")}. Nice one.`;
  }
  const drop = r.byCategory
    .filter((c) => c.change.kind === "down" && c.change.pct >= 15 && c.prev - c.amount >= 2000)
    .sort((a, b) => b.prev - b.amount - (a.prev - a.amount))[0];
  if (drop) {
    return `${categoryLabel(drop.category)} is down ${fmt(drop.prev - drop.amount)} on ${monthLabel(prevMonth, "name")}. Nice one.`;
  }
  const top = r.byCategory[0];
  const share = Math.round((top.amount / r.total) * 100);
  return `${categoryLabel(top.category)} is your biggest spend ${r.isCurrent ? "this month" : `in ${name}`}: ${fmt(top.amount)}, ${share}% of it.`;
}


// ---------- the year ----------

export type YearInsights = {
  /** The last 12 calendar months, oldest first, ending with the current one. */
  months: Array<{ month: Month; total: number; entries: number }>;
  total: number;
  /** Average of the finished months that had any logs. */
  monthlyAverage: number;
  highest: { month: Month; total: number } | null;
  insight: string;
};

export function yearInsights(rows: Array<{ month: string; total: number; entries: number }>, today: string): YearInsights {
  const current = monthOf(today);
  const byMonth = new Map(rows.map((r) => [monthOf(r.month), r]));
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = addMonths(current, i - 11);
    const r = byMonth.get(m);
    return { month: m, total: r ? Number(r.total) : 0, entries: r ? Number(r.entries) : 0 };
  });
  const total = months.reduce((s, m) => s + m.total, 0);
  const finished = months.filter((m) => m.month !== current && m.entries > 0);
  const monthlyAverage = finished.length ? Math.round(finished.reduce((s, m) => s + m.total, 0) / finished.length) : 0;
  const highest = months.reduce<{ month: Month; total: number } | null>(
    (h, m) => (m.total > 0 && (!h || m.total > h.total) ? { month: m.month, total: m.total } : h),
    null,
  );

  let insight: string;
  const logged = months.filter((m) => m.entries > 0).length;
  if (logged === 0) insight = "Nothing logged yet. Your months show up here as you log.";
  else if (logged < 2) insight = "Your first month is in. Next month you'll see how they compare.";
  else {
    const now = months[11];
    const nowLine =
      monthlyAverage > 0 && now.total > 0
        ? ` ${monthLabel(current, "name")} so far: ${fmt(now.total)}.`
        : "";
    insight = `Your average month is ${fmt(monthlyAverage)}.${nowLine}`;
    if (highest && highest.month !== current) insight += ` ${monthLabel(highest.month, "name")} was the biggest, at ${fmt(highest.total)}.`;
  }
  return { months, total, monthlyAverage, highest, insight };
}
