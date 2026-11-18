import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BottomDock } from "@/components/BottomNav";
import { lagosDay } from "@/lib/dates";
import { loadMoney } from "@/lib/money-data";
import { monthOf } from "@/lib/months";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { MoneyView } from "./MoneyView";

export const metadata: Metadata = { title: "Money · Kudi Log" };
export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  const today = lagosDay();
  const data = await loadMoney(await supabaseServer(), user.sub, today);
  return (
    <main className="mx-auto max-w-[480px] px-gutter pt-[max(24px,env(safe-area-inset-top))] pb-36">
      <MoneyView data={data} month={monthOf(today)} />
      <BottomDock />
    </main>
  );
}
