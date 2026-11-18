// Money left, how long it lasts, and the monthly budget. Pure maths, computed in code (never the AI).

import { addDays } from "./dates";
import { daysInMonth, monthLabel, monthOf, type Month } from "./months";

const fmt = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export type MoneyEvent = { id?: string; kind: "set" | "add"; amount: number; note?: string | null; created_at: string };
export type Spend = { amount: number; created_at: string };

export type MoneyLeft = {
  balance: number;
  /** When the balance was last set, and to what. */
  setAt: string;
  setAmount: number;
  added: number;
  spent: number;
};

/**
 * Latest "set" + money added after it - spending logged after it.
 * "After" means logged after (created_at), so spending you'd already logged when you set the balance
 * isn't taken off twice. Null until a balance has been set.
 */
export function moneyLeft(events: MoneyEvent[], spends: Spend[]): MoneyLeft | null {
  const set = latestSet(events);
  if (!set) return null;
  return moneyLeftFrom(events, spends.filter((s) => s.created_at > set.created_at).reduce((s, e) => s + e.amount, 0));
}

/** The "set" that counts: the most recent one. */
export function latestSet(events: MoneyEvent[]): MoneyEvent | null {
  return events.filter((e) => e.kind === "set").sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

/** Same as moneyLeft, when the spending since the latest set was already summed (in Postgres). */
export function moneyLeftFrom(events: MoneyEvent[], spentSinceSet: number): MoneyLeft | null {
  const set = latestSet(events);
  if (!set) return null;
  const added = events.filter((e) => e.kind === "add" && e.created_at > set.created_at).reduce((s, e) => s + e.amount, 0);
  return { balance: set.amount + added - spentSinceSet, setAt: set.created_at, setAmount: set.amount, added, spent: spentSinceSet };
}

/** Average spend per day over the last `window` days, counting only from the first day you logged. */
export function dailyPace(history: Array<{ spent_on: string; amount: number }>, today: string, window = 30): number {
  const from = addDays(today, -(window - 1));
  const recent = history.filter((h) => h.spent_on >= from && h.spent_on <= today);
  if (recent.length === 0) return 0;
  const first = recent.reduce((m, h) => (h.spent_on < m ? h.spent_on : m), today);
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000) + 1;
  return Math.round(recent.reduce((s, h) => s + h.amount, 0) / Math.max(days, 1));
}

export type Runway = { days: number; until: string; headline: string };

/** "About 21 days at your usual ₦4,200 a day, to around 9 Dec." Null without a pace or money. */
export function runway(balance: number, pace: number, today: string): Runway | null {
  if (balance <= 0 || pace <= 0) return null;
  const days = Math.floor(balance / pace);
  const until = addDays(today, days);
  const when = new Date(`${until}T12:00:00Z`).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "UTC" });
  const headline =
    days < 1
      ? `At your usual ${fmt(pace)} a day, that's less than a day.`
      : days > 365
        ? `At your usual ${fmt(pace)} a day, that lasts over a year.`
        : `At your usual ${fmt(pace)} a day, that's about ${days} ${days === 1 ? "day" : "days"}, to around ${when}.`;
  return { days, until, headline };
}

export type BudgetStatus = {
  month: Month;
  budget: number;
  spent: number;
  left: number;
  /** 0..1+ of the budget used. */
  used: number;
  /** Where spending "should" be by today if spread evenly, 0..1. */
  expected: number;
  onPace: boolean;
  daysLeft: number;
  headline: string;
  detail: string;
};

/** Kind budget wording: what's left and a daily amount, or how soon a new month starts. Never scolds. */
export function budgetStatus(budget: number, spentThisMonth: number, today: string): BudgetStatus {
  const month = monthOf(today);
  const dim = daysInMonth(month);
  const dom = Number(today.slice(8, 10));
  const daysLeft = dim - dom + 1; // including today
  const left = budget - spentThisMonth;
  const used = spentThisMonth / budget;
  const expected = dom / dim;
  const onPace = used <= expected * 1.05;
  const name = monthLabel(month, "name");

  let headline: string;
  let detail: string;
  if (left >= 0) {
    headline = `${fmt(left)} left for ${name}`;
    const perDay = Math.floor(left / daysLeft);
    detail = daysLeft === 1 ? "That's for today, the last day of the month." : `About ${fmt(perDay)} a day for the ${daysLeft} days left.`;
  } else {
    headline = `${fmt(-left)} over ${name}'s budget`;
    // daysLeft counts today, so it's also the number of days until the 1st.
    detail = daysLeft === 1 ? "A new month starts tomorrow." : `A new month starts in ${daysLeft} days.`;
  }
  return { month, budget, spent: spentThisMonth, left, used, expected, onPace, daysLeft, headline, detail };
}
