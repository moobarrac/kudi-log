"use client";

import { ArrowDownLeft, ChevronLeft, Scale, Target, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HeroTotal } from "@/components/HeroTotal";
import { PillButton } from "@/components/PillButton";
import { callApi } from "@/lib/entry-api";
import { naira } from "@/lib/money";
import type { MoneyData } from "@/lib/money-data";
import { monthLabel } from "@/lib/months";
import { BudgetCard } from "@/components/BudgetCard";

const AmountSheet = dynamic(() => import("@/components/AmountSheet").then((m) => m.AmountSheet), { ssr: false });

type SheetKind = "set" | "add" | "budget" | null;

function when(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });
}

/** Money left (set it, add money in), how long it lasts, and the monthly budget. All maths in lib/money-left. */
export function MoneyView({ data, month }: { data: MoneyData; month: string }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { left, runway, budget, events } = data;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setSheet(null);
      navigator.vibrate?.(10);
      router.refresh(); // the server recomputes everything
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const post = (kind: "set" | "add", amount: number, note: string) =>
    run(() => callApi("/api/money", { method: "POST", body: JSON.stringify({ kind, amount, note }) }, "We couldn't save that."));
  const setBudget = (amount: number | null) =>
    run(() => callApi("/api/profile", { method: "PATCH", body: JSON.stringify({ monthly_budget: amount }) }, "We couldn't save that."));
  const removeEvent = (id: string) => run(() => callApi(`/api/money/${id}`, { method: "DELETE" }, "We couldn't remove that."));

  return (
    <>
      <header className="flex items-center gap-2">
        <Link href="/today" aria-label="Back to Today" className="-ml-2 grid size-tap place-items-center rounded-full hover:bg-surface-2">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="font-display text-h1 font-extrabold">Money</h1>
      </header>

      <section className="mt-5 rounded-card-lg bg-hero p-5 text-on-ink">
        {left ? (
          <>
            <p className="text-sm text-on-ink-muted">Money left</p>
            <HeroTotal amount={Math.max(0, left.balance)} className="mt-1" />
            <p className="mt-2 text-sm text-on-ink-soft">
              {left.balance < 0
                ? `You've logged ${naira(-left.balance)} more than you had. Update your balance when you can.`
                : (runway?.headline ?? "Log a few days and you'll see how long it lasts.")}
            </p>
            <p className="mt-3 text-xs text-on-ink-muted">
              Set to {naira(left.setAmount)} on {when(left.setAt)}
              {left.added > 0 && ` · ${naira(left.added)} in`}
              {` · ${naira(left.spent)} spent since`}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <PillButton variant="outline-on-ink" size="sm" onClick={() => setSheet("set")}>
                Update balance
              </PillButton>
              <PillButton size="sm" onClick={() => setSheet("add")}>
                Add money
              </PillButton>
            </div>
          </>
        ) : (
          <>
            <p className="font-display text-h2 font-bold">How much do you have?</p>
            <p className="mt-2 text-sm text-on-ink-soft">
              Add it up across your bank, OPay or Moniepoint, and cash. As you log, your spending comes off it, so you
              always know what's left and how long it lasts.
            </p>
            <PillButton block className="mt-5" onClick={() => setSheet("set")}>
              Set my balance
            </PillButton>
            <p className="mt-3 text-center text-xs text-on-ink-muted">Kudi Log never connects to your bank. You type it in.</p>
          </>
        )}
      </section>

      <h2 className="mt-8 text-xs font-semibold tracking-[0.08em] text-muted uppercase">Budget for {monthLabel(month, "name")}</h2>
      {budget ? (
        <>
          <BudgetCard b={budget} className="mt-2" />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setSheet("budget")} className="h-tap rounded-pill px-3 text-sm font-semibold text-emerald hover:bg-surface-2">
              Change budget
            </button>
            <button type="button" onClick={() => setBudget(null)} className="h-tap rounded-pill px-3 text-sm font-semibold text-muted hover:bg-surface-2">
              Remove
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setSheet("budget")}
          className="mt-2 flex w-full items-center gap-3 rounded-row bg-surface px-4 py-3.5 text-left hover:bg-surface-2"
        >
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-tile bg-surface-2 text-ink">
            <Target size={18} />
          </span>
          <span>
            <span className="block font-medium">Set a monthly budget</span>
            <span className="block text-sm text-muted">See what's left for the month and a daily amount to stay on track.</span>
          </span>
        </button>
      )}

      {events.length > 0 && (
        <>
          <h2 className="mt-8 text-xs font-semibold tracking-[0.08em] text-muted uppercase">Balance history</h2>
          <ul className="mt-2 overflow-hidden rounded-card bg-surface">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
                <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-tile ${e.kind === "add" ? "bg-emerald-tint text-emerald" : "bg-surface-2 text-muted-strong"}`}>
                  {e.kind === "add" ? <ArrowDownLeft size={18} /> : <Scale size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {e.kind === "add" ? `Added ${naira(e.amount)}` : `Balance set to ${naira(e.amount)}`}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {when(e.created_at)}
                    {e.note ? ` · ${e.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeEvent(e.id)}
                  disabled={busy}
                  aria-label={`Remove: ${e.kind === "add" ? `added ${naira(e.amount)}` : `balance set to ${naira(e.amount)}`}`}
                  className="grid size-tap shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-bad"
                >
                  <Trash2 size={17} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {error && !sheet && (
        <p role="alert" className="mt-4 rounded-row bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          {error}
        </p>
      )}

      <AmountSheet
        open={sheet === "set"}
        onOpenChange={(o) => !o && setSheet(null)}
        title={left ? "Update balance" : "Set my balance"}
        label="How much do you have right now?"
        hint="Bank, mobile money and cash together. Whole naira; “150k” works."
        submitLabel="Save balance"
        allowZero
        busy={busy}
        error={error}
        onSubmit={(amount) => post("set", amount, "")}
      />
      <AmountSheet
        open={sheet === "add"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Add money"
        label="How much came in?"
        hint="Salary, a transfer, money from a side hustle."
        submitLabel="Add it"
        withNote
        busy={busy}
        error={error}
        onSubmit={(amount, note) => post("add", amount, note)}
      />
      <AmountSheet
        open={sheet === "budget"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Monthly budget"
        label="How much do you want to spend in a month?"
        hint="It starts again on the 1st. Change it any time."
        submitLabel="Save budget"
        initial={budget?.budget ?? null}
        busy={busy}
        error={error}
        onSubmit={(amount) => setBudget(amount)}
      />
    </>
  );
}
