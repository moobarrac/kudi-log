// History filters: which days a period covers. Pure.

import { addDays, isDay, prettyDay } from "./dates";
import { addMonths, monthEnd, monthLabel, monthOf, monthStart } from "./months";

export const PERIODS = ["all", "month", "last-month", "3m"] as const;
export type Period = (typeof PERIODS)[number];

export function isPeriod(v: unknown): v is Period {
  return typeof v === "string" && (PERIODS as readonly string[]).includes(v);
}

export type Range = { from: string | null; to: string | null };

export function periodRange(period: Period, today: string): Range {
  const m = monthOf(today);
  if (period === "month") return { from: monthStart(m), to: today };
  if (period === "last-month") return { from: monthStart(addMonths(m, -1)), to: monthEnd(addMonths(m, -1)) };
  if (period === "3m") return { from: addDays(today, -89), to: today };
  return { from: null, to: null };
}

export function periodLabel(period: Period, today: string): string {
  if (period === "month") return "this month";
  if (period === "last-month") return `in ${monthLabel(addMonths(monthOf(today), -1), "name")}`;
  if (period === "3m") return "in the last 3 months";
  return "all time";
}

/** A single day (from Insights' "See entries"), else the period. */
export function filterRange(period: Period, day: string | null, today: string): Range {
  if (day && isDay(day) && day <= today) return { from: day, to: day };
  return periodRange(period, today);
}

export function dayFilterLabel(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  return prettyDay(day);
}

/** Search text: trimmed, single spaces, at most 40 characters. Empty means no search. */
export function cleanQuery(q: unknown): string | null {
  if (typeof q !== "string") return null;
  const t = q.trim().replace(/\s+/g, " ").slice(0, 40);
  return t || null;
}
