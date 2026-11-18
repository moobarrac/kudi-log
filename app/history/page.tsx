import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BottomDock } from "@/components/BottomNav";
import { isDay, lagosDay } from "@/lib/dates";
import { listEntries, totalFor } from "@/lib/history";
import { cleanQuery, filterRange, isPeriod } from "@/lib/periods";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { HistoryView } from "./HistoryView";

export const metadata: Metadata = { title: "History · Kudi Log" };
export const dynamic = "force-dynamic";

/** /history?q=suya&period=month or /history?day=2026-11-12 (from Insights). */
export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ q?: string; period?: string; day?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/");
  const sp = await searchParams;
  const today = lagosDay();
  const q = cleanQuery(sp.q);
  const period = isPeriod(sp.period) ? sp.period : "all";
  const day = sp.day && isDay(sp.day) && sp.day <= today ? sp.day : null;
  const range = filterRange(period, day, today);

  const db = await supabaseServer();
  // A short first page keeps the first paint light; scrolling loads the rest in bigger pages.
  const [page, total] = await Promise.all([listEntries(db, { q, range, cursor: null, limit: 25 }), totalFor(db, q, range)]);

  return (
    <main className="mx-auto max-w-[480px] px-gutter pt-[max(24px,env(safe-area-inset-top))] pb-36">
      <HistoryView today={today} initial={{ q: q ?? "", period, day }} first={{ ...page, total }} />
      <BottomDock />
    </main>
  );
}
