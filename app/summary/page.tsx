import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadDay } from "@/lib/day-summary";
import { lagosDay, longDay } from "@/lib/dates";
import { isLoggableDay } from "@/lib/entry-input";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { SummaryView } from "./SummaryView";

export const metadata: Metadata = { title: "Your day in kudi · Kudi Log" };
export const dynamic = "force-dynamic";

/** End-of-day summary. `?day=YYYY-MM-DD` shows an earlier day (the 9 PM Telegram message can link here). */
export default async function SummaryPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/");
  const today = lagosDay();
  const { day: asked } = await searchParams;
  const day = isLoggableDay(asked, today) ? asked : today;

  const db = await supabaseServer();
  const { summary } = await loadDay(db, user.sub, day);

  return <SummaryView summary={summary} dateLabel={longDay(day)} isToday={day === today} />;
}
