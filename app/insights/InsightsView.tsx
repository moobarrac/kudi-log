"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Equal, Lightbulb } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useState } from "react";
import { categoryStyle } from "@/components/category-style";
import { pillClasses } from "@/components/PillButton";
import { categoryLabel } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { prettyDay } from "@/lib/dates";
import { type Change, changeBetween, dayName, type RangeInsights, rangeLabel } from "@/lib/insights";
import { naira } from "@/lib/money";
import type { BudgetStatus } from "@/lib/money-left";
import { BudgetCard } from "@/components/BudgetCard";
import { addMonths, type Month, type MonthInsights, monthLabel, type YearInsights } from "@/lib/months";

export type InsightsProps = { today: string; hasAny: boolean } & (
  | { view: "week"; week: RangeInsights }
  | { view: "month"; month: MonthInsights; prev: Month | null; next: Month | null; budget: BudgetStatus | null }
  | { view: "year"; year: YearInsights }
);

const VIEWS = ["week", "month", "year"] as const;

export function InsightsView(props: InsightsProps) {
  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-h1 font-extrabold">Insights</h1>
        {props.hasAny && <ViewTabs view={props.view} />}
      </header>

      {!props.hasAny ? (
        <Empty />
      ) : (
        // key: switching views replays the CSS rise.
        <div key={props.view + (props.view === "month" ? props.month.month : "")} className="animate-rise" style={rise}>
          {props.view === "week" && <WeekView r={props.week} today={props.today} />}
          {props.view === "month" && <MonthView {...props} />}
          {props.view === "year" && <YearView y={props.year} />}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Soon title="Who owes me" />
        <Soon title="Rent Ready" />
      </div>
    </>
  );
}

const rise = { "--rise": "8px", "--rise-duration": "200ms" } as CSSProperties;

/** Week / Month / Year as links, so the back button and shared links work. The ink pill slides under the active one. */
function ViewTabs({ view }: { view: (typeof VIEWS)[number] }) {
  const i = VIEWS.indexOf(view);
  return (
    <nav aria-label="Range" className="relative grid grid-cols-3 rounded-pill bg-surface-2 p-1 ring-1 ring-line">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-pill bg-ink transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${i * 100}%)` }}
      />
      {VIEWS.map((v) => (
        <Link
          key={v}
          href={v === "week" ? "/insights" : `/insights?view=${v}`}
          aria-current={view === v ? "page" : undefined}
          scroll={false}
          className={cn(
            "relative grid h-9 min-w-[64px] place-items-center rounded-pill px-3 text-sm font-semibold capitalize transition-colors duration-200",
            view === v ? "text-paper" : "text-muted-strong hover:text-ink",
          )}
        >
          {v}
        </Link>
      ))}
    </nav>
  );
}

// ---------- week ----------

function WeekView({ r, today }: { r: RangeInsights; today: string }) {
  return (
    <>
      <Headline label={rangeLabel(r.start, r.end)} total={r.total} sub={`About ${naira(r.dailyAverage)} a day · ${entries(r.count)}`} />
      <DayBars days={r.days} today={today} labels="weekday" />
      <InsightCard text={r.insight} />
      <WhereItWent rows={r.byCategory} vs="last week" />
    </>
  );
}

// ---------- month ----------

function MonthView({ month: m, prev, next, budget, today }: Extract<InsightsProps, { view: "month" }>) {
  const vs = m.isCurrent ? `this point in ${monthLabel(addMonths(m.month, -1), "name")}` : monthLabel(addMonths(m.month, -1), "name");
  return (
    <>
      <div className="mt-5 flex items-center justify-between gap-2">
        <MonthArrow to={prev} dir="prev" />
        <p className="font-display text-h3 font-bold">{monthLabel(m.month)}</p>
        <MonthArrow to={next} dir="next" />
      </div>

      <Headline
        label={m.isCurrent ? "So far this month" : "Spent in the month"}
        total={m.total}
        sub={`About ${naira(m.dailyAverage)} a day · ${entries(m.count)}`}
      />

      {m.comparison && <ComparisonRow c={m.comparison} />}
      {budget && <BudgetCard b={budget} />}

      <DayBars days={m.days} today={today} labels="date" />
      <InsightCard text={m.insight} />

      {(m.biggest || m.heaviestDay) && (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {m.biggest && (
            <Tile label="Biggest single spend">
              <p className="truncate text-sm font-semibold first-letter:uppercase">{m.biggest.item}</p>
              <p className="font-display text-h3 font-bold tabular-nums">{naira(m.biggest.amount)}</p>
            </Tile>
          )}
          {m.heaviestDay && (
            <Link href={`/history?day=${m.heaviestDay.day}`} className="rounded-row transition-transform duration-150 active:scale-[0.98]">
              <Tile label="Heaviest day">
                <p className="truncate text-sm font-semibold">{prettyDay(m.heaviestDay.day)}</p>
                <p className="font-display text-h3 font-bold tabular-nums">{naira(m.heaviestDay.total)}</p>
              </Tile>
            </Link>
          )}
        </div>
      )}

      <WhereItWent rows={m.byCategory} vs={vs} />
    </>
  );
}

function MonthArrow({ to, dir }: { to: Month | null; dir: "prev" | "next" }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const label = to ? `${dir === "prev" ? "Previous" : "Next"} month, ${monthLabel(to)}` : undefined;
  const cls = "grid size-tap place-items-center rounded-full border border-line bg-surface";
  if (!to) return <span aria-hidden className={cn(cls, "opacity-35")}><Icon size={18} /></span>;
  return (
    <Link href={`/insights?view=month&m=${to}`} scroll={false} aria-label={label} className={cn(cls, "hover:border-muted")}>
      <Icon size={18} aria-hidden />
    </Link>
  );
}

function ComparisonRow({ c }: { c: NonNullable<MonthInsights["comparison"]> }) {
  const Icon = c.direction === "under" ? ArrowDown : c.direction === "over" ? ArrowUp : Equal;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-row bg-surface px-3.5 py-3">
      <span
        aria-hidden
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-tile",
          c.direction === "under" ? "bg-emerald-tint text-emerald" : "bg-surface-2 text-muted-strong",
        )}
      >
        <Icon size={18} strokeWidth={2.4} />
      </span>
      <div>
        <p className="text-sm font-semibold">{c.headline}</p>
        <p className="text-xs text-muted">{c.detail}</p>
      </div>
    </div>
  );
}

// ---------- year ----------

function YearView({ y }: { y: YearInsights }) {
  const max = Math.max(...y.months.map((m) => m.total), 1);
  const current = y.months[y.months.length - 1].month;
  const rows = [...y.months].reverse().filter((m) => m.entries > 0);
  return (
    <>
      <Headline
        label="Last 12 months"
        total={y.total}
        sub={y.monthlyAverage ? `About ${naira(y.monthlyAverage)} a month` : "Your months fill in as you log"}
      />

      <section className="mt-4 rounded-card border border-line bg-surface px-3.5 pt-4 pb-3">
        <div className="grid h-[150px] grid-cols-12 items-end gap-1.5">
          {y.months.map((m, i) => (
            <Link
              key={m.month}
              href={`/insights?view=month&m=${m.month}`}
              scroll={false}
              aria-label={`${monthLabel(m.month)}, ${naira(m.total)}`}
              className="group flex h-full items-end"
            >
              <span
                className={cn(
                  "animate-grow-y block w-full rounded-[6px] transition-colors",
                  m.total === 0 ? "bg-line-soft" : m.month === current ? "bg-emerald" : "bg-muted/30 group-hover:bg-muted/50",
                )}
                style={{ height: m.total > 0 ? Math.max(6, Math.round((m.total / max) * 150)) : 4, "--delay": `${i * 25}ms` } as CSSProperties}
              />
            </Link>
          ))}
        </div>
        <div aria-hidden className="mt-2 grid grid-cols-12 gap-1.5">
          {y.months.map((m) => (
            <span key={m.month} className={cn("text-center text-[10px] font-medium", m.month === current ? "font-bold text-emerald" : "text-muted")}>
              {monthLabel(m.month, "short").charAt(0)}
            </span>
          ))}
        </div>
      </section>

      <InsightCard text={y.insight} />

      {rows.length > 0 && (
        <>
          <div className="mt-7 flex items-baseline justify-between px-1">
            <h2 className="font-display text-h3 font-bold">Month by month</h2>
            <p className="text-xs text-muted">vs the month before</p>
          </div>
          <ul className="mt-2 overflow-hidden rounded-card border border-line bg-surface">
            {rows.map((m) => {
              const before = y.months.find((x) => x.month === addMonths(m.month, -1));
              const change = changeBetween(m.total, before?.total ?? 0);
              return (
                <li key={m.month} className="border-b border-line-soft last:border-b-0">
                  <Link href={`/insights?view=month&m=${m.month}`} scroll={false} className="flex items-center gap-3 px-3.5 py-3 hover:bg-surface-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {monthLabel(m.month)}
                      {m.month === current && <span className="ml-1.5 text-xs font-medium text-muted">so far</span>}
                    </span>
                    {m.month !== current && <Delta change={change} />}
                    <span className="w-[92px] text-right text-sm font-semibold tabular-nums">{naira(m.total)}</span>
                    <ChevronRight size={16} aria-hidden className="text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

// ---------- shared pieces ----------

function Headline({ label, total, sub }: { label: string; total: number; sub: string }) {
  return (
    <section className="mt-5 px-1">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-[44px] leading-none font-extrabold tracking-[-0.04em] tabular-nums">{naira(total)}</p>
      <p className="mt-1.5 text-sm text-muted">{sub}</p>
    </section>
  );
}

function entries(n: number) {
  return `${n} ${n === 1 ? "entry" : "entries"}`;
}

const CHART_H = 150;

/**
 * Plain divs, no chart library. Tap a bar to see that day and jump to its entries. Today is emerald;
 * days that haven't happened yet (rest of the month) are empty slots.
 */
function DayBars({ days, today, labels }: { days: Array<{ day: string; total: number | null }>; today: string; labels: "weekday" | "date" }) {
  const todayIndex = days.findIndex((d) => d.day === today);
  const lastPast = days.reduce((last, d, i) => (d.total !== null ? i : last), 0);
  const [selected, setSelected] = useState(todayIndex >= 0 ? todayIndex : lastPast);
  const max = Math.max(...days.map((d) => d.total ?? 0), 1);
  const compact = days.length > 10;
  const sel = days[selected];

  return (
    <section className="mt-4 rounded-card border border-line bg-surface px-3.5 pt-4 pb-3">
      <div aria-live="polite" className="flex items-baseline justify-between gap-2 px-0.5 text-sm">
        <span className="text-muted">{dayName(sel.day, today)}</span>
        <span className="flex items-baseline gap-3">
          {!!sel.total && (
            <Link href={`/history?day=${sel.day}`} className="text-xs font-semibold text-emerald hover:underline">
              See entries
            </Link>
          )}
          <span className="font-display text-body font-bold tabular-nums">{sel.total === null ? "–" : naira(sel.total)}</span>
        </span>
      </div>

      <div className="relative mt-3 rounded-[6px] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-4 has-[input:focus-visible]:outline-emerald">
        <div
          className={cn("grid items-end", compact ? "gap-[3px]" : "gap-2")}
          style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, height: CHART_H }}
        >
          {days.map((d, i) => {
            const isToday = d.day === today;
            const future = d.total === null;
            const h = d.total ? Math.max(6, Math.round((d.total / max) * CHART_H)) : 4;
            const bar = (
              <span
                className={cn(
                  "animate-grow-y block w-full transition-colors",
                  compact ? "rounded-[4px]" : "rounded-[10px]",
                  future
                    ? "border border-dashed border-line bg-transparent"
                    : !d.total
                      ? "bg-line-soft"
                      : isToday
                        ? "bg-emerald"
                        : selected === i
                          ? "bg-muted-strong"
                          : "bg-muted/30 group-hover:bg-muted/45",
                )}
                style={{ height: h, "--delay": `${i * (compact ? 8 : 30)}ms` } as CSSProperties}
              />
            );
            // A week has 7 roomy bars: each is a button. A month's 30 bars are too thin to tap, so the slider below picks the day.
            return compact ? (
              <span key={d.day} className="flex h-full items-end">
                {bar}
              </span>
            ) : (
              <button
                key={d.day}
                type="button"
                disabled={future}
                onClick={() => setSelected(i)}
                aria-pressed={selected === i}
                aria-label={`${dayName(d.day, today)}, ${future ? "not yet" : naira(d.total ?? 0)}`}
                className="group flex h-full items-end focus-visible:outline-offset-2 disabled:cursor-default"
              >
                {bar}
              </button>
            );
          })}
        </div>
        {compact && (
          <input
            type="range"
            min={0}
            max={days.length - 1}
            value={selected}
            onChange={(e) => setSelected(Math.min(Number(e.target.value), lastPast))}
            aria-label="Pick a day"
            aria-valuetext={`${dayName(sel.day, today)}, ${sel.total === null ? "not yet" : naira(sel.total)}`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        )}
      </div>

      <div
        aria-hidden
        className={cn("mt-2 grid", compact ? "gap-[3px]" : "gap-2")}
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((d, i) => {
          const isToday = d.day === today;
          const date = Number(d.day.slice(8));
          const show = labels === "weekday" || isToday || (date - 1) % 7 === 0;
          // A "Today" label near another label would collide in the month view; drop the neighbour.
          const crowded = labels === "date" && !isToday && todayIndex >= 0 && Math.abs(i - todayIndex) < 3;
          return (
            <span
              key={d.day}
              className={cn(
                "flex text-[11px] whitespace-nowrap",
                compact && isToday && i > days.length - 4 ? "justify-end" : "justify-center",
                isToday ? "font-bold text-emerald" : selected === i ? "font-semibold text-ink" : "font-medium text-muted",
              )}
            >
              {show && !crowded ? (isToday ? "Today" : labels === "weekday" ? shortDay(d.day) : String(date)) : ""}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function InsightCard({ text }: { text: string }) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-card bg-hero px-4 py-3.5 text-on-ink">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-tile bg-lime text-on-lime">
        <Lightbulb size={18} />
      </span>
      <p className="text-sm leading-[1.45]">{text}</p>
    </div>
  );
}

function WhereItWent({ rows, vs }: { rows: Array<{ category: string; amount: number; change: Change }>; vs: string }) {
  if (rows.length === 0) return null;
  return (
    <>
      <div className="mt-7 flex items-baseline justify-between gap-3 px-1">
        <h2 className="font-display text-h3 font-bold">Where it went</h2>
        <p className="truncate text-xs text-muted">vs {vs}</p>
      </div>
      <ul className="mt-2 overflow-hidden rounded-card border border-line bg-surface">
        {rows.map((c) => (
          <li key={c.category} className="flex items-center gap-3 border-b border-line-soft px-3.5 py-3 last:border-b-0">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: categoryStyle(c.category).dot }} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{categoryLabel(c.category)}</span>
            <Delta change={c.change} />
            <span className="w-[92px] text-right text-sm font-semibold tabular-nums">{naira(c.amount)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-row bg-surface p-3.5">
      <p className="text-xs text-muted">{label}</p>
      {children}
    </div>
  );
}

function Delta({ change }: { change: Change }) {
  const text = change.kind === "up" ? `+${change.pct}%` : change.kind === "down" ? `−${change.pct}%` : change.kind;
  const tone = change.kind === "up" ? "text-bad" : change.kind === "down" ? "text-emerald" : "text-muted";
  const sr = change.kind === "up" ? `up ${change.pct}%` : change.kind === "down" ? `down ${change.pct}%` : change.kind === "new" ? "new this time" : "about the same";
  return (
    <span className={cn("shrink-0 text-xs font-semibold tabular-nums", tone)}>
      <span aria-hidden>{text}</span>
      <span className="sr-only">{sr}</span>
    </span>
  );
}

function Soon({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-row border border-dashed border-muted/50 px-3.5 py-3">
      <span className="text-[11px] font-bold tracking-[0.04em] text-emerald uppercase">Coming soon</span>
      <span className="text-sm font-semibold">{title}</span>
    </div>
  );
}

function Empty() {
  const bars = [38, 62, 30, 80, 46, 70, 54];
  return (
    <section className="mt-6 rounded-card-lg bg-hero p-5 text-on-ink">
      <div aria-hidden className="flex h-28 items-end gap-2">
        {bars.map((h, i) => (
          <span
            key={i}
            className={cn("flex-1 rounded-t-[8px]", i === bars.length - 1 ? "bg-good-on-ink" : "bg-ink-line")}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-5 font-display text-h3 font-bold">Your week shows up here</p>
      <p className="mt-1 text-sm text-on-ink-muted">
        Log for a few days and you'll see where the money went, day by day and month by month.
      </p>
      <Link href="/today" className={cn(pillClasses("lime", { block: true }), "mt-5")}>
        Log something
      </Link>
    </section>
  );
}

function shortDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-NG", { weekday: "short", timeZone: "UTC" });
}
