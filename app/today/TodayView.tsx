"use client";

import { ArrowDown, ArrowUp, ChevronRight, Equal, Sparkles, Wallet } from "lucide-react";
import { AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BottomDock } from "@/components/BottomNav";
import { CategoryBar } from "@/components/CategoryBar";
import { dayLabel } from "@/components/DayPicker";
import { EntryRow } from "@/components/EntryRow";
import { HeroTotal } from "@/components/HeroTotal";
import { LogBar } from "@/components/LogBar";
import { MotionProvider } from "@/components/MotionProvider";
import { InstallCard, recordLog } from "@/components/Pwa";
import { Toast, type ToastData } from "@/components/Toast";
import { deleteEntry, patchEntry, restoreEntry } from "@/lib/entry-api";
import type { EntryPatch } from "@/lib/entry-input";
import { ruleParse } from "@/lib/parser";
import { naira } from "@/lib/money";
import { budgetStatus, runway } from "@/lib/money-left";
import { compareToUsual, total, totalsByCategory, type Usual } from "@/lib/summary";
import type { Entry } from "@/lib/types";

// The sheets (and vaul) load right after hydration rather than with the first paint. They're ready long before a tap.
const QuickLogSheet = dynamic(() => import("@/components/QuickLogSheet").then((m) => m.QuickLogSheet), { ssr: false });
const EditEntrySheet = dynamic(() => import("@/components/EditEntrySheet").then((m) => m.EditEntrySheet), { ssr: false });

/** clientKey keeps a row's React key stable when its optimistic version is replaced by the saved one. */
type Row = Entry & { pending?: boolean; clientKey?: string };

type Props = {
  today: string;
  initialEntries: Entry[];
  chips: string[];
  /** This weekday's average over the last 4 weeks, for the live comparison line. */
  usual: Usual | null;
  /** After 6 PM: show the "Your day in kudi is ready" card. */
  summaryReady: boolean;
  /** Money left and budget as of page load; adjusted live below as today's entries change. */
  money: { balance: number | null; pace: number; budget: number | null; spentThisMonth: number | null };
};

let toastId = 0;

/** Put a row back where it was. Rows from one log share a created_at, so position beats sorting by time. */
function putBack(list: Row[], row: Row, index: number): Row[] {
  if (list.some((e) => e.id === row.id)) return list;
  const at = Math.min(Math.max(index, 0), list.length);
  return [...list.slice(0, at), row, ...list.slice(at)];
}


function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function TodayView({ today, initialEntries, chips, usual, summaryReady, money }: Props) {
  const [entries, setEntries] = useState<Row[]>(initialEntries);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [text, setText] = useState("");
  const [day, setDay] = useState(today);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);

  const showToast = useCallback((t: Omit<ToastData, "id">) => setToast({ ...t, id: ++toastId }), []);
  const clearToast = useCallback(() => setToast(null), []);

  // Home-screen shortcut "Log spending" opens /today?log=1: open the sheet, then tidy the URL.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("log") === "1") {
      setSheetOpen(true);
      url.searchParams.delete("log");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);

  const sum = total(entries);
  // Today's entries changed since load (logged, deleted, edited): the money left and budget move by the same amount.
  const [loadedSum] = useState(() => total(initialEntries));
  const byCategory = useMemo(() => totalsByCategory(entries), [entries]);
  // Computed in code from the live total, so it updates as you log.
  const comparison = compareToUsual(sum, usual, today);
  const CompareIcon = comparison?.direction === "under" ? ArrowDown : comparison?.direction === "over" ? ArrowUp : Equal;

  function openSheet() {
    setDay(today);
    setNotice(null);
    setSheetOpen(true);
  }

  const fail = useCallback(
    (err: unknown, fallback: string) =>
      showToast({ tone: "error", message: err instanceof Error ? err.message : fallback }),
    [showToast],
  );

  /** Swipe, Delete key or the edit sheet. Gone at once; Undo puts it back for 5 seconds. */
  function remove(entry: Entry) {
    setEditing(null);
    const index = entries.findIndex((e) => e.id === entry.id);
    setEntries((list) => list.filter((e) => e.id !== entry.id));
    navigator.vibrate?.(10);

    const deleted = deleteEntry(entry.id).then(
      () => true,
      (err) => {
        setEntries((list) => (entry.spent_on === today ? putBack(list, entry, index) : list));
        fail(err, "We couldn't delete that. Try again.");
        return false;
      },
    );

    showToast({
      message: `Deleted ${capitalise(entry.item)} · ${naira(entry.amount)}`,
      duration: 5000,
      action: {
        label: "Undo",
        onClick: async () => {
          navigator.vibrate?.(10);
          setEntries((list) => putBack(list, entry, index));
          // Wait for the delete to land, then bring the row back with the same id.
          if (!(await deleted)) return;
          try {
            await restoreEntry(entry);
          } catch (err) {
            setEntries((list) => list.filter((e) => e.id !== entry.id));
            fail(err, "We couldn't bring that back. Log it again.");
          }
        },
      },
    });
  }

  /** From the edit sheet. Shows the change at once, rolls back if the server says no. */
  async function save(before: Entry, patch: EntryPatch) {
    setEditing(null);
    const index = entries.findIndex((e) => e.id === before.id);
    const after: Entry = { ...before, ...patch };
    const leavesToday = after.spent_on !== today;
    setEntries((list) => (leavesToday ? list.filter((e) => e.id !== before.id) : list.map((e) => (e.id === before.id ? after : e))));
    if (leavesToday) showToast({ message: `Moved ${capitalise(after.item)} to ${dayLabel(after.spent_on, today)}.` });

    try {
      const { entry } = await patchEntry(before.id, patch);
      if (entry.spent_on === today) setEntries((list) => list.map((e) => (e.id === entry.id ? entry : e)));
    } catch (err) {
      setEntries((list) => putBack(list.filter((e) => e.id !== before.id), before, index));
      fail(err, "We couldn't save that change. Try again.");
    }
  }

  async function submit() {
    const message = text.trim();
    if (!message || busy) return;
    const logDay = day;
    const preview = ruleParse(message);

    // Rule-parsed items show up instantly; only AI pieces wait for the server.
    const optimistic: Row[] =
      logDay === today
        ? preview.items.map((p, i) => ({
            id: `tmp-${Date.now()}-${i}`,
            user_id: "",
            item: p.item,
            amount: p.amount,
            category: p.category,
            spent_on: logDay,
            source: "web",
            raw_text: message,
            created_at: new Date().toISOString(),
            pending: true,
          }))
        : [];
    const closeNow = preview.items.length > 0;
    const tmpIds = new Set(optimistic.map((o) => o.id));

    if (closeNow) {
      setEntries((list) => [...optimistic, ...list]);
      setSheetOpen(false);
      setText("");
      navigator.vibrate?.(10);
    } else {
      setBusy(true);
    }

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message, day: logDay }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "We couldn't save that just now. Try again.");

      const saved: Entry[] = data.entries ?? [];
      const unresolved: string[] = data.unresolved ?? [];
      if (saved.length > 0) recordLog(); // the install card appears from the third log

      setEntries((list) => {
        const rest = list.filter((e) => !tmpIds.has(e.id));
        // The server returns rule items first, in the order typed, so they line up with the optimistic rows.
        const mine: Row[] = saved
          .filter((e) => e.spent_on === today)
          .map((e, i) => (optimistic[i] ? { ...e, clientKey: optimistic[i].id } : e));
        const fresh = mine.filter((e) => !e.clientKey);
        const replaced = mine.filter((e) => e.clientKey);
        return [...fresh, ...replaced, ...rest];
      });

      if (unresolved.length > 0) {
        setText(unresolved.join(", ") + " ");
        setNotice(
          unresolved.length === 1
            ? `How much was “${unresolved[0]}”? Add the amount, like “${unresolved[0]} 2k”.`
            : "We couldn't find amounts for these. Add how much each one was.",
        );
        setDay(logDay);
        setSheetOpen(true);
        if (!closeNow) navigator.vibrate?.(10);
      } else {
        setSheetOpen(false);
        setText("");
        setNotice(null);
      }

      if (saved.length > 0 && (logDay !== today || !closeNow)) {
        showToast({
          message: `Logged ${saved.length} ${saved.length === 1 ? "item" : "items"}${logDay !== today ? ` to ${dayLabel(logDay, today)}` : ""}.`,
        });
      }
    } catch (err) {
      // Put everything back so nothing typed is lost.
      setEntries((list) => list.filter((e) => !tmpIds.has(e.id)));
      setText(message);
      setDay(logDay);
      setNotice(null);
      setSheetOpen(true);
      showToast({ tone: "error", message: err instanceof Error ? err.message : "We couldn't save that. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <MotionProvider>
      <section className="mt-6 rounded-card-lg bg-hero p-5 text-on-ink">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-on-ink-muted">Spent today</p>
          {entries.length > 0 && (
            <span className="rounded-pill bg-lime px-2.5 py-1 text-xs font-semibold text-on-lime tabular-nums">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </div>
        <HeroTotal amount={sum} className="mt-1" />
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-on-ink-soft">A clean slate. Log your first spend below.</p>
        ) : comparison ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-on-ink-soft">
            <CompareIcon
              aria-hidden
              size={16}
              strokeWidth={2.4}
              className={comparison.direction === "under" ? "text-good-on-ink" : "text-on-ink-muted"}
            />
            {comparison.headline}
          </p>
        ) : null}
        <div className="mt-5">
          <CategoryBar totals={byCategory} />
        </div>
      </section>

      <MoneyCard today={today} money={money} delta={sum - loadedSum} />

      {summaryReady && entries.length > 0 && (
        <Link
          href="/summary"
          className="mt-3 flex items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3 transition-transform duration-150 ease-out active:scale-[0.99]"
        >
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-tile bg-emerald-tint text-emerald">
            <Sparkles size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Your day in kudi is ready</span>
            <span className="block text-xs text-muted">Tap to see today's summary</span>
          </span>
          <ChevronRight aria-hidden size={18} className="text-muted" />
        </Link>
      )}

      <InstallCard />

      <div className="mt-8 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-h3 font-bold">Today's entries</h2>
        {entries.length > 0 && <p className="text-xs text-muted">Tap to edit · swipe left to delete</p>}
      </div>
      {entries.length === 0 ? (
        <p className="mt-3 rounded-row border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Nothing yet. Try “suya 2k, transport 1,500”.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {entries.map((e) => (
              <EntryRow
                key={e.clientKey ?? e.id}
                item={e.item}
                amount={e.amount}
                category={e.category}
                createdAt={e.created_at}
                source={e.source}
                pending={e.pending}
                onEdit={e.pending ? undefined : () => setEditing(e)}
                onDelete={e.pending ? undefined : () => remove(e)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <BottomDock>
        <LogBar onOpen={openSheet} />
      </BottomDock>

      <QuickLogSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setNotice(null);
        }}
        text={text}
        onTextChange={setText}
        day={day}
        today={today}
        onDayChange={setDay}
        chips={chips}
        notice={notice}
        busy={busy}
        onSubmit={submit}
      />

      <EditEntrySheet entry={editing} today={today} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />

      <Toast toast={toast} onDone={clearToast} offset={150} />
    </MotionProvider>
  );
}

/** Money left (with how long it lasts) and the month's budget, or one quiet link to set them up. */
function MoneyCard({ today, money, delta }: { today: string; money: Props["money"]; delta: number }) {
  const balance = money.balance === null ? null : money.balance - delta;
  const left = balance === null ? null : runway(balance, money.pace, today);
  const budget = money.budget && money.spentThisMonth !== null ? budgetStatus(money.budget, money.spentThisMonth + delta, today) : null;

  if (balance === null && !budget) {
    return (
      <Link
        href="/money"
        className="mt-3 flex items-center gap-3 rounded-card border border-dashed border-line px-3.5 py-3 text-sm transition-colors hover:border-muted"
      >
        <Wallet size={18} aria-hidden className="shrink-0 text-muted" />
        <span className="flex-1 text-muted">
          <span className="font-semibold text-ink">Track what's left.</span> Add how much you have.
        </span>
        <ChevronRight size={18} aria-hidden className="text-muted" />
      </Link>
    );
  }

  return (
    <Link href="/money" className="mt-3 block rounded-card border border-line bg-surface px-3.5 py-3 transition-transform duration-150 ease-out active:scale-[0.99]">
      {balance !== null && (
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-tile bg-emerald-tint text-emerald">
            <Wallet size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted">Money left</span>
            <span className="block font-display text-h3 font-bold tabular-nums">{naira(Math.max(0, balance))}</span>
          </span>
          <span className="text-right text-xs text-muted">
            {balance < 0 ? "Update your balance" : left ? (left.days > 365 ? "Lasts over a year" : `About ${left.days} ${left.days === 1 ? "day" : "days"}`) : ""}
            {left && left.days <= 365 && balance >= 0 && <span className="block">at your pace</span>}
          </span>
          <ChevronRight size={18} aria-hidden className="text-muted" />
        </div>
      )}
      {budget && (
        <div className={balance !== null ? "mt-3 border-t border-line-soft pt-3" : ""}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-semibold text-ink">{budget.headline}</span>
            <span className="text-muted">{Math.round(Math.min(budget.used, 9.99) * 100)}% used</span>
          </div>
          <div className="relative mt-2 h-1.5 rounded-pill bg-surface-2">
            <span
              className={`absolute inset-y-0 left-0 rounded-pill ${budget.left < 0 || !budget.onPace ? "bg-warn-line" : "bg-emerald"}`}
              style={{ width: `${Math.min(budget.used, 1) * 100}%` }}
            />
            <span aria-hidden className="absolute -top-0.5 h-2.5 w-0.5 rounded-pill bg-muted-strong" style={{ left: `${budget.expected * 100}%` }} />
          </div>
        </div>
      )}
    </Link>
  );
}
