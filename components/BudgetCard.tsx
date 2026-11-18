import Link from "next/link";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/money";
import type { BudgetStatus } from "@/lib/money-left";

/** Budget progress. The tick shows where an even spread would be today. Amber when ahead of pace, never red. */
export function BudgetCard({ b, className }: { b: BudgetStatus; className?: string }) {
  const used = Math.min(b.used, 1);
  const tone = b.left < 0 ? "bg-warn-line" : b.onPace ? "bg-emerald" : "bg-warn-line";
  return (
    <section className={cn("mt-3 rounded-row bg-surface px-3.5 py-3", className)} aria-label="Monthly budget">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">{b.headline}</p>
        <Link href="/money" className="shrink-0 text-xs font-semibold text-emerald hover:underline">
          Budget {naira(b.budget)}
        </Link>
      </div>
      <div className="relative mt-2.5 h-2 rounded-pill bg-surface-2">
        <span className={cn("animate-grow-x absolute inset-y-0 left-0 rounded-pill", tone)} style={{ width: `${used * 100}%` }} />
        <span aria-hidden className="absolute -top-1 h-4 w-0.5 rounded-pill bg-muted-strong" style={{ left: `${Math.min(b.expected, 1) * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">{b.detail}</p>
    </section>
  );
}
