import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { firstName } from "@/lib/auth";
import { loadDay } from "@/lib/day-summary";
import { loadMoney } from "@/lib/money-data";
import { addDays, greeting, lagosDay, lagosHour, prettyDay } from "@/lib/dates";
import { quickChips } from "@/lib/summary";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { TodayView } from "./TodayView";

export const metadata: Metadata = { title: "Today · Kudi Log" };
export const dynamic = "force-dynamic"; // always per-user, never prerendered

/** From 6 PM Lagos, Today offers the end-of-day summary. */
const SUMMARY_HOUR = 18;

export default async function TodayPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  const name = firstName(user);
  const today = lagosDay();
  const db = await supabaseServer();

  const [{ entries, history, summary }, money] = await Promise.all([loadDay(db, user.sub, today), loadMoney(db, user.sub, today)]);
  const monthAgo = addDays(today, -30);
  const chips = quickChips([
    ...entries.map((e) => e.item),
    ...history.filter((h) => h.spent_on >= monthAgo).map((h) => h.item),
  ]);

  return (
    <main className="mx-auto max-w-[480px] px-gutter pt-[max(24px,env(safe-area-inset-top))] pb-52">
      <header>
        <p className="text-sm text-muted">{prettyDay(today)}</p>
        <h1 className="mt-0.5 font-display text-h1 font-extrabold">
          {greeting()}
          {name ? `, ${name}` : ""}
        </h1>
      </header>

      <TodayView
        today={today}
        initialEntries={[...entries].reverse()}
        chips={chips}
        usual={summary.usual}
        summaryReady={lagosHour() >= SUMMARY_HOUR}
        money={{ balance: money.left?.balance ?? null, pace: money.pace, budget: money.budget?.budget ?? null, spentThisMonth: money.budget?.spent ?? null }}
      />
    </main>
  );
}
