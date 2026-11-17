"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { MotionProvider } from "@/components/MotionProvider";
import { Mic, Monitor, Moon, RotateCcw, Send, Sun } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { CategoryBar } from "@/components/CategoryBar";
import { CategoryChip } from "@/components/CategoryChip";
import { EntryRow } from "@/components/EntryRow";
import { HeroTotal } from "@/components/HeroTotal";
import { LogBar } from "@/components/LogBar";
import { PillButton } from "@/components/PillButton";
import { Sheet } from "@/components/Sheet";
import { CATEGORY_KEYS, type Category } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/money";
import { ruleParse } from "@/lib/parser";

type DemoEntry = { id: string; item: string; amount: number; category: Category; created_at: string; source: "web" | "telegram" };

const SAMPLE: DemoEntry[] = [
  { id: "1", item: "suya", amount: 2000, category: "food", created_at: "2026-11-16T18:42:00Z", source: "web" },
  { id: "2", item: "danfo to yaba", amount: 800, category: "transport", created_at: "2026-11-16T16:05:00Z", source: "telegram" },
  { id: "3", item: "mtn data", amount: 1000, category: "airtime_data", created_at: "2026-11-16T12:30:00Z", source: "web" },
  { id: "4", item: "nepa token", amount: 5000, category: "bills", created_at: "2026-11-16T09:10:00Z", source: "web" },
  { id: "5", item: "offering", amount: 1500, category: "gifts", created_at: "2026-11-16T08:00:00Z", source: "telegram" },
  { id: "6", item: "jollof and chicken", amount: 2400, category: "food", created_at: "2026-11-16T07:20:00Z", source: "web" },
];

const QUICK_CHIPS = ["Suya", "Transport", "Data", "Pure water", "Keke"];

type Theme = "system" | "light" | "dark";

export function Gallery() {
  const [entries, setEntries] = useState(SAMPLE);
  const [theme, setTheme] = useState<Theme>("system");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [text, setText] = useState("suya 2k, transport 1,500 and data 1k");
  const [selected, setSelected] = useState<Category>("food");

  // All maths happens here in code, never in the AI.
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return [...m.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  }, [entries]);

  function applyTheme(t: Theme) {
    setTheme(t);
    if (t === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  }

  function addSpend() {
    const id = String(Date.now());
    setEntries((list) => [
      { id, item: "keke", amount: 1500, category: "transport", created_at: new Date().toISOString(), source: "web" },
      ...list,
    ]);
    navigator.vibrate?.(10);
  }

  return (
    <MotionProvider>
      <main className="mx-auto max-w-[480px] px-gutter pt-[max(24px,env(safe-area-inset-top))] pb-40">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-emerald uppercase">Kudi Log · dev</p>
            <h1 className="mt-1 font-display text-h1 font-extrabold">Components</h1>
          </div>
          <div role="radiogroup" aria-label="Theme" className="flex rounded-pill border border-line bg-surface p-1">
            {(
              [
                ["system", Monitor],
                ["light", Sun],
                ["dark", Moon],
              ] as const
            ).map(([t, Icon]) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                aria-label={`${t} theme`}
                onClick={() => applyTheme(t)}
                className={cn(
                  "grid size-9 place-items-center rounded-full transition-colors duration-150",
                  theme === t ? "bg-ink text-paper" : "text-muted hover:text-ink",
                )}
              >
                <Icon size={16} strokeWidth={2} />
              </button>
            ))}
          </div>
        </header>

        <Section title="HeroTotal + CategoryBar" note="Tap “Add ₦1,500” to see the 400ms count-up.">
          <div className="rounded-card-lg bg-hero p-5 text-on-ink">
            <p className="text-sm text-on-ink-muted">Spent today</p>
            <HeroTotal amount={total} className="mt-1" />
            <p className="mt-2 text-sm text-on-ink-soft">
              <span className="font-semibold text-good-on-ink">{naira(2100)} under</span> your usual Monday
            </p>
            <div className="mt-5">
              <CategoryBar totals={byCategory} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <PillButton size="sm" variant="ink" onClick={addSpend}>
              Add {naira(1500)}
            </PillButton>
            <PillButton size="sm" variant="outline" icon={<RotateCcw size={16} />} onClick={() => setEntries(SAMPLE)}>
              Reset
            </PillButton>
          </div>
        </Section>

        <Section title="PillButton">
          <div className="flex flex-col gap-3">
            <PillButton block>Continue with Google</PillButton>
            <PillButton block variant="ink">
              Save changes
            </PillButton>
            <PillButton block variant="outline">
              Use my email instead
            </PillButton>
            <PillButton block trailing={naira(4500)}>
              Log 3 items
            </PillButton>
            <div className="rounded-card bg-hero p-4">
              <PillButton block variant="outline-on-ink" icon={<Send size={18} />}>
                Start on Telegram
              </PillButton>
            </div>
            <div className="flex flex-wrap gap-2">
              <PillButton size="sm" variant="quiet">
                Quiet
              </PillButton>
              <PillButton size="sm" disabled>
                Disabled
              </PillButton>
            </div>
          </div>
        </Section>

        <Section title="CategoryChip" note="All 11 categories. The second row is a picker.">
          <div className="flex flex-wrap gap-2">
            {CATEGORY_KEYS.map((c) => (
              <CategoryChip key={c} category={c} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORY_KEYS.slice(0, 5).map((c) => (
              <CategoryChip key={c} size="md" category={c} selected={selected === c} onClick={() => setSelected(c)} />
            ))}
          </div>
        </Section>

        <Section title="EntryRow" note="Swipe left to delete, or focus a row and press Delete.">
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {entries.map((e) => (
                <EntryRow
                  key={e.id}
                  item={e.item}
                  amount={e.amount}
                  category={e.category}
                  createdAt={e.created_at}
                  source={e.source}
                  onEdit={() => setSheetOpen(true)}
                  onDelete={() => {
                    setEntries((list) => list.filter((x) => x.id !== e.id));
                    navigator.vibrate?.(10);
                  }}
                />
              ))}
            </AnimatePresence>
          </ul>
          {entries.length === 0 && (
            <p className="rounded-row border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
              Nothing logged yet. Your first spend shows up here.
            </p>
          )}
        </Section>

        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] bg-linear-to-t from-paper from-60% to-transparent px-gutter pt-6 pb-[max(16px,env(safe-area-inset-bottom))]">
          <LogBar onOpen={() => setSheetOpen(true)} />
        </div>

        <QuickLogDemo open={sheetOpen} onOpenChange={setSheetOpen} text={text} setText={setText} />
      </main>
    </MotionProvider>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-h2 font-bold">{title}</h2>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** A preview of the step 3 quick log sheet, wired to the real rule parser. */
function QuickLogDemo({
  open,
  onOpenChange,
  text,
  setText,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  text: string;
  setText: (t: string) => void;
}) {
  const reduce = useReducedMotion();
  const parsed = useMemo(() => ruleParse(text), [text]);
  const sum = parsed.items.reduce((s, i) => s + i.amount, 0);
  const count = parsed.items.length;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Log spending"
      tall
      headerAction={
        <span className="rounded-pill border border-line bg-surface px-3 py-1.5 text-sm font-medium">Today</span>
      }
      footer={
        <PillButton block disabled={count === 0} trailing={count > 0 ? naira(sum) : undefined} onClick={() => onOpenChange(false)}>
          {count === 0 ? "Type something to log" : `Log ${count} ${count === 1 ? "item" : "items"}`}
        </PillButton>
      }
    >
      <label htmlFor="quick-log" className="text-sm font-medium text-muted">
        Type it the way you'd say it
      </label>
      <div className="mt-2 flex items-start gap-2 rounded-card border-2 border-ink bg-surface p-3">
        <textarea
          id="quick-log"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="suya 2k, transport 1,500, data 1k"
          className="min-h-[84px] flex-1 resize-none bg-transparent text-h3 text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          disabled
          aria-label="Voice notes (coming soon)"
          className="grid size-tap place-items-center rounded-full bg-surface-2 text-muted opacity-60"
        >
          <Mic size={20} />
        </button>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {QUICK_CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setText(text.trim() ? `${text.trim()}, ${c.toLowerCase()} ` : `${c.toLowerCase()} `)}
            className="h-9 shrink-0 rounded-pill border border-line bg-surface px-3.5 text-sm font-medium transition-transform active:scale-[0.97]"
          >
            {c}
          </button>
        ))}
      </div>

      <p className="mt-6 text-xs font-semibold tracking-[0.08em] text-muted uppercase">Reading it as you type</p>
      <ul className="mt-2 flex flex-col gap-2">
        <AnimatePresence initial={false} mode="popLayout">
          {parsed.items.map((p, i) => (
            <m.li
              key={`${p.item}-${i}`}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1], delay: i * 0.03 }}
              className="flex items-center gap-3 rounded-row bg-surface px-3.5 py-3"
            >
              <span className="min-w-0 flex-1 truncate font-medium capitalize">{p.item}</span>
              <CategoryChip category={p.category} />
              <span className="font-display text-body font-bold tabular-nums">{naira(p.amount)}</span>
            </m.li>
          ))}
          {parsed.unparsed.map((u, i) => (
            <m.li
              key={`u-${u}-${i}`}
              layout={!reduce}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 rounded-row border-[1.5px] border-dashed border-warn-line bg-warn-bg px-3.5 py-3 text-warn-ink"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{u}</span>
              <span className="text-xs font-semibold">AI will take a look</span>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    </Sheet>
  );
}
