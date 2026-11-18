"use client";

import { Search, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EntryRow } from "@/components/EntryRow";
import { MotionProvider } from "@/components/MotionProvider";
import { Toast, type ToastData } from "@/components/Toast";
import { cn } from "@/lib/cn";
import { addDays, prettyDay } from "@/lib/dates";
import { callApi, deleteEntry, patchEntry, restoreEntry } from "@/lib/entry-api";
import type { EntryPatch } from "@/lib/entry-input";
import { naira } from "@/lib/money";
import { dayFilterLabel, type Period, periodLabel } from "@/lib/periods";
import type { Entry } from "@/lib/types";

const EditEntrySheet = dynamic(() => import("@/components/EditEntrySheet").then((m) => m.EditEntrySheet), { ssr: false });

type Cursor = { day: string; at: string };
type Page = { entries: Entry[]; next: Cursor | null; total?: { total: number; count: number } };

type Props = {
  today: string;
  initial: { q: string; period: Period; day: string | null };
  first: Page & { total: { total: number; count: number } };
};

const PERIOD_CHIPS: Array<{ value: Period; label: string }> = [
  { value: "all", label: "All time" },
  { value: "month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "3m", label: "3 months" },
];

let toastId = 0;

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Every entry, newest first, grouped by day. Search by item, filter by period, edit or delete with Undo. */
export function HistoryView({ today, initial, first }: Props) {
  const [q, setQ] = useState(initial.q);
  const [period, setPeriod] = useState<Period>(initial.period);
  const [day, setDay] = useState<string | null>(initial.day);
  const [rows, setRows] = useState<Entry[]>(first.entries);
  const [next, setNext] = useState<Cursor | null>(first.next);
  const [total, setTotal] = useState(first.total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const request = useRef(0);
  const firstRender = useRef(true);
  const sentinel = useRef<HTMLDivElement>(null);

  const showToast = useCallback((t: Omit<ToastData, "id">) => setToast({ ...t, id: ++toastId }), []);
  const clearToast = useCallback(() => setToast(null), []);

  const params = useCallback(
    (cursor: Cursor | null) => {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      if (day) p.set("day", day);
      else if (period !== "all") p.set("period", period);
      if (cursor) {
        p.set("cursor_day", cursor.day);
        p.set("cursor_at", cursor.at);
      }
      return p;
    },
    [q, period, day],
  );

  // New search or filter: reload from the top (debounced while typing) and keep the URL shareable.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = ++request.current;
    const t = setTimeout(async () => {
      const p = params(null);
      window.history.replaceState(null, "", `/history${p.size ? `?${p}` : ""}`);
      setLoading(true);
      setError(null);
      try {
        const data = await callApi<Page>(`/api/entries?${p}`, { method: "GET" }, "We couldn't load your entries. Try again.");
        if (id !== request.current) return; // a newer search started meanwhile
        setRows(data.entries);
        setNext(data.next);
        if (data.total) setTotal(data.total);
      } catch (err) {
        if (id === request.current) setError(err instanceof Error ? err.message : "We couldn't load your entries.");
      } finally {
        if (id === request.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [params]);

  const loadMore = useCallback(async () => {
    if (!next || loading) return;
    const id = request.current;
    setLoading(true);
    try {
      const data = await callApi<Page>(`/api/entries?${params(next)}`, { method: "GET" }, "We couldn't load more. Try again.");
      if (id !== request.current) return;
      setRows((r) => [...r, ...data.entries.filter((e) => !r.some((x) => x.id === e.id))]);
      setNext(data.next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't load more.");
    } finally {
      setLoading(false);
    }
  }, [next, loading, params]);

  // Load the next page as the end of the list comes into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !next) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && loadMore(), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [next, loadMore]);

  const groups = useMemo(() => {
    const out: Array<{ day: string; items: Entry[]; sum: number }> = [];
    for (const e of rows) {
      const g = out[out.length - 1];
      if (g && g.day === e.spent_on) {
        g.items.push(e);
        g.sum += e.amount;
      } else out.push({ day: e.spent_on, items: [e], sum: e.amount });
    }
    return out;
  }, [rows]);

  function remove(entry: Entry) {
    setEditing(null);
    const index = rows.findIndex((e) => e.id === entry.id);
    setRows((r) => r.filter((e) => e.id !== entry.id));
    setTotal((t) => ({ total: t.total - entry.amount, count: t.count - 1 }));
    navigator.vibrate?.(10);
    const putBack = () => {
      setRows((r) => (r.some((e) => e.id === entry.id) ? r : [...r.slice(0, index), entry, ...r.slice(index)]));
      setTotal((t) => ({ total: t.total + entry.amount, count: t.count + 1 }));
    };
    const deleted = deleteEntry(entry.id).then(
      () => true,
      (err) => {
        putBack();
        showToast({ tone: "error", message: err instanceof Error ? err.message : "We couldn't delete that." });
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
          putBack();
          if (!(await deleted)) return;
          try {
            await restoreEntry(entry);
          } catch (err) {
            setRows((r) => r.filter((e) => e.id !== entry.id));
            showToast({ tone: "error", message: err instanceof Error ? err.message : "We couldn't bring that back." });
          }
        },
      },
    });
  }

  async function save(before: Entry, patch: EntryPatch) {
    setEditing(null);
    const after = { ...before, ...patch };
    setRows((r) => r.map((e) => (e.id === before.id ? after : e)));
    if (patch.amount !== undefined) setTotal((t) => ({ ...t, total: t.total - before.amount + after.amount }));
    try {
      const { entry } = await patchEntry(before.id, patch);
      setRows((r) =>
        // A new day moves it in the list.
        r
          .map((e) => (e.id === entry.id ? entry : e))
          .sort((a, b) => b.spent_on.localeCompare(a.spent_on) || b.created_at.localeCompare(a.created_at)),
      );
    } catch (err) {
      setRows((r) => r.map((e) => (e.id === before.id ? before : e)));
      if (patch.amount !== undefined) setTotal((t) => ({ ...t, total: t.total - after.amount + before.amount }));
      showToast({ tone: "error", message: err instanceof Error ? err.message : "We couldn't save that change." });
    }
  }

  const filtered = !!q.trim() || !!day || period !== "all";
  const scope = day ? `on ${dayFilterLabel(day, today)}` : periodLabel(period, today);

  return (
    <MotionProvider>
      <header>
        <h1 className="font-display text-h1 font-extrabold">History</h1>
      </header>

      <div className="mt-5 flex items-center gap-2 rounded-card border-[1.5px] border-line bg-surface px-3.5 focus-within:border-ink">
        <Search size={18} aria-hidden className="shrink-0 text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search, like “suya” or “bolt”"
          aria-label="Search your entries"
          enterKeyHint="search"
          autoCapitalize="none"
          maxLength={40}
          className="h-12 min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="-mr-1.5 grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="-mx-gutter mt-3 flex gap-2 overflow-x-auto px-gutter pb-1 [scrollbar-width:none]" role="group" aria-label="Period">
        {day && (
          <button
            type="button"
            onClick={() => setDay(null)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill bg-ink px-3.5 text-sm font-semibold text-paper"
          >
            {dayFilterLabel(day, today)}
            <X size={14} aria-label="Show all days" />
          </button>
        )}
        {PERIOD_CHIPS.map((c) => {
          const on = !day && period === c.value;
          return (
            <button
              key={c.value}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setDay(null);
                setPeriod(c.value);
              }}
              className={cn(
                "h-9 shrink-0 rounded-pill px-3.5 text-sm font-medium transition-colors",
                on ? "bg-ink font-semibold text-paper" : "border border-line bg-surface text-ink hover:border-muted",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <section aria-live="polite" className="mt-4 rounded-card bg-hero px-4 py-3.5 text-on-ink">
        <p className="text-sm text-on-ink-muted">
          {q.trim() ? <>“{q.trim()}” {scope}</> : filtered ? capitalise(scope) : "Everything you've logged"}
        </p>
        <p className="mt-0.5 font-display text-h1 font-extrabold tracking-tight text-lime tabular-nums">{naira(total.total)}</p>
        <p className="text-sm text-on-ink-soft">
          across {total.count} {total.count === 1 ? "entry" : "entries"}
        </p>
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-row bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          {error}
        </p>
      )}

      {rows.length === 0 && !loading ? (
        <p className="mt-6 rounded-row border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          {q.trim() ? `Nothing matches “${q.trim()}” ${scope}.` : filtered ? `Nothing logged ${scope}.` : "Nothing logged yet. Your entries will show up here."}
        </p>
      ) : (
        <div className={cn("mt-6 flex flex-col gap-6 transition-opacity", loading && rows.length > 0 && !next && "opacity-60")}>
          {groups.map((g) => (
            <section key={g.day} aria-label={dayHeading(g.day, today)}>
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold">{dayHeading(g.day, today)}</h2>
                <p className="text-sm font-semibold text-muted tabular-nums">{naira(g.sum)}</p>
              </div>
              <ul className="mt-2 flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {g.items.map((e) => (
                    <EntryRow
                      key={e.id}
                      item={e.item}
                      amount={e.amount}
                      category={e.category}
                      createdAt={e.created_at}
                      source={e.source}
                      onEdit={() => setEditing(e)}
                      onDelete={() => remove(e)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}

      <div ref={sentinel} className="mt-4 flex justify-center">
        {next && (
          <button type="button" onClick={loadMore} disabled={loading} className="h-tap rounded-pill px-4 text-sm font-semibold text-emerald hover:bg-surface-2">
            {loading ? "Loading…" : "Show older entries"}
          </button>
        )}
        {!next && rows.length > 0 && <p className="py-2 text-xs text-muted">That's everything{filtered ? " for this search" : ""}.</p>}
      </div>

      <EditEntrySheet entry={editing} today={today} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />
      <Toast toast={toast} onDone={clearToast} offset={88} />
    </MotionProvider>
  );
}

function dayHeading(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  return sameYear
    ? prettyDay(day)
    : new Date(`${day}T12:00:00Z`).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
