import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "./dates";
import { type BudgetStatus, budgetStatus, dailyPace, type MoneyEvent, type MoneyLeft, moneyLeftFrom, latestSet, type Runway, runway } from "./money-left";
import { monthOf, monthStart } from "./months";

export type MoneyData = {
  left: MoneyLeft | null;
  runway: Runway | null;
  pace: number;
  budget: BudgetStatus | null;
  /** Newest first. */
  events: Array<MoneyEvent & { id: string }>;
};

/**
 * Money left, how long it lasts, and the budget, for one user. Works with the user's client (RLS) and the
 * admin client (bot), so user_id is always filtered.
 */
export async function loadMoney(db: SupabaseClient, userId: string, today: string): Promise<MoneyData> {
  const [eventsRes, profileRes, paceRes, monthRes] = await Promise.all([
    db.from("money_events").select("id, kind, amount, note, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    db.from("profiles").select("monthly_budget").eq("id", userId).maybeSingle(),
    db.from("entries").select("spent_on, amount").eq("user_id", userId).gte("spent_on", addDays(today, -29)).lte("spent_on", today).limit(5000),
    db.from("entries").select("amount").eq("user_id", userId).gte("spent_on", monthStart(monthOf(today))).lte("spent_on", today).limit(5000),
  ]);
  if (eventsRes.error) throw new Error(`money load failed: ${eventsRes.error.message}`);
  const events = (eventsRes.data ?? []) as Array<MoneyEvent & { id: string }>;

  const set = latestSet(events);
  let left: MoneyLeft | null = null;
  if (set) {
    const { data, error } = await db.rpc("spent_since", { uid: userId, since: set.created_at });
    if (error) throw new Error(`money load failed: ${error.message}`);
    left = moneyLeftFrom(events, Number(data ?? 0));
  }
  const pace = dailyPace((paceRes.data ?? []) as Array<{ spent_on: string; amount: number }>, today);
  const spentThisMonth = (monthRes.data ?? []).reduce((s, r) => s + (r.amount as number), 0);
  const budgetAmount = profileRes.data?.monthly_budget as number | null | undefined;

  return {
    left,
    runway: left ? runway(left.balance, pace, today) : null,
    pace,
    budget: budgetAmount ? budgetStatus(budgetAmount, spentThisMonth, today) : null,
    events,
  };
}
