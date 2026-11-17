import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "./dates";
import { type DaySummary, summarizeDay } from "./summary";
import type { Entry } from "./types";

/** How far back we look for the weekday average (needs 28) and the streak. */
export const HISTORY_DAYS = 120;

export type HistoryRow = { item: string; amount: number; spent_on: string };

export type DayData = {
  /** The day's entries, oldest first. */
  entries: Entry[];
  /** Earlier days, newest first. */
  history: HistoryRow[];
  summary: DaySummary;
};

/**
 * One day plus the history its summary needs.
 * Works with the user's client (RLS) and the admin client (bot, cron): user_id is always filtered.
 */
export async function loadDay(db: SupabaseClient, userId: string, day: string): Promise<DayData> {
  const [dayRes, histRes] = await Promise.all([
    db.from("entries").select("*").eq("user_id", userId).eq("spent_on", day).order("created_at", { ascending: true }),
    db
      .from("entries")
      .select("item, amount, spent_on")
      .eq("user_id", userId)
      .gte("spent_on", addDays(day, -HISTORY_DAYS))
      .lt("spent_on", day)
      .order("spent_on", { ascending: false }) // if the row cap bites, it drops the oldest days
      .limit(5000),
  ]);
  if (dayRes.error) throw new Error(`load day failed: ${dayRes.error.message}`);
  if (histRes.error) throw new Error(`load history failed: ${histRes.error.message}`);

  const entries = (dayRes.data ?? []) as Entry[];
  const history = (histRes.data ?? []) as HistoryRow[];
  return { entries, history, summary: summarizeDay(day, entries, history) };
}
