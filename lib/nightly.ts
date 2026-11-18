// Who gets what at 9 PM. Pure, so it's tested without Telegram or a database.

import { addDays } from "./dates";
import type { DaySummary } from "./summary";

export type NightlyAction = "summary" | "nudge" | "skip";

/** Days without a log before we stop nudging: quiet users don't get a message every night. */
export const NUDGE_WINDOW_DAYS = 7;

/**
 * - Logged today: the full summary.
 * - Nothing today but logged in the last week: a gentle nudge (it mentions the streak if there is one).
 * - Quiet for longer: nothing. They can still ask with /today.
 */
export function nightlyAction(summary: DaySummary, history: Array<{ spent_on: string }>, today: string): NightlyAction {
  if (summary.count > 0) return "summary";
  const since = addDays(today, -NUDGE_WINDOW_DAYS);
  return history.some((h) => h.spent_on >= since && h.spent_on < today) ? "nudge" : "skip";
}
