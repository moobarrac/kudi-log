import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BottomDock } from "@/components/BottomNav";
import { addDays, lagosDay } from "@/lib/dates";
import { type InsightEntry, rangeInsights } from "@/lib/insights";
import { budgetStatus } from "@/lib/money-left";
import { addMonths, isMonth, monthEnd, monthInsights, monthOf, monthStart, yearInsights } from "@/lib/months";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { type InsightsProps, InsightsView } from "./InsightsView";

export const metadata: Metadata = { title: "Insights · Kudi Log" };
export const dynamic = "force-dynamic";

type Search = { view?: string; m?: string };

/** /insights (week), /insights?view=month&m=2026-10, /insights?view=year. RLS scopes every query to the user. */
export default async function InsightsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await currentUser();
  if (!user) redirect("/");
  const { view: rawView, m } = await searchParams;
  const view = rawView === "month" || rawView === "year" ? rawView : "week";
  const today = lagosDay();
  const thisMonth = monthOf(today);
  const db = await supabaseServer();

  // The first day ever logged: limits how far back the month arrows go, and decides the empty state.
  const { data: first } = await db.from("entries").select("spent_on").order("spent_on", { ascending: true }).limit(1).maybeSingle();
  const firstMonth = first ? monthOf(first.spent_on as string) : null;
  const base = { today, hasAny: !!first };

  let props: InsightsProps;
  if (view === "year") {
    const { data, error } = await db.rpc("monthly_totals", { since: monthStart(addMonths(thisMonth, -11)) });
    if (error) throw new Error(`year load failed: ${error.message}`);
    props = { ...base, view, year: yearInsights((data ?? []) as Array<{ month: string; total: number; entries: number }>, today) };
  } else if (view === "month") {
    const month = isMonth(m) && m <= thisMonth && (!firstMonth || m >= firstMonth) ? m : thisMonth;
    const [{ data, error }, { data: profile }] = await Promise.all([
      db
        .from("entries")
        .select("item, amount, category, spent_on")
        .gte("spent_on", monthStart(addMonths(month, -1)))
        .lte("spent_on", monthEnd(month) < today ? monthEnd(month) : today)
        .limit(5000),
      db.from("profiles").select("monthly_budget").eq("id", user.sub).maybeSingle(),
    ]);
    if (error) throw new Error(`month load failed: ${error.message}`);
    const mi = monthInsights((data ?? []) as InsightEntry[], month, today);
    const budget = mi.isCurrent && profile?.monthly_budget ? budgetStatus(profile.monthly_budget as number, mi.total, today) : null;
    props = {
      ...base,
      view,
      month: mi,
      prev: firstMonth && addMonths(month, -1) >= firstMonth ? addMonths(month, -1) : null,
      next: month < thisMonth ? addMonths(month, 1) : null,
      budget,
    };
  } else {
    const { data, error } = await db
      .from("entries")
      .select("item, amount, category, spent_on")
      .gte("spent_on", addDays(today, -13))
      .lte("spent_on", today);
    if (error) throw new Error(`week load failed: ${error.message}`);
    props = { ...base, view, week: rangeInsights((data ?? []) as InsightEntry[], today, 7) };
  }

  return (
    <main className="mx-auto max-w-[480px] px-gutter pt-[max(24px,env(safe-area-inset-top))] pb-36">
      <InsightsView {...props} />
      <BottomDock />
    </main>
  );
}
